import { useMutation, useQueryClient } from '@tanstack/react-query';
import { missingVehicleRepository } from '@repositories';
import { scrapeWithFallback } from '@lib/azureYallaMotorScraper';
import { missingVehicleScrapeStatusValue } from '@data/dataverseOptionSets';
import { normalizeToDataverse } from '@parsers';
import toast from 'react-hot-toast';

const MISSING_VEHICLE_REQUESTS_KEY = 'missing-vehicle-requests';

interface ScrapeMissingVehicleParams {
  id: string;
  make: string;
  model: string;
  trim: string;
  year: number;
}

/**
 * Trigger a YallaMotor scrape for a missing vehicle request.
 *
 * Azure is the primary transport; Power Automate Flow 3 is the automatic
 * fallback (see `scrapeWithFallback`), so no live scrape is ever lost.
 *
 * 1. Calls `scrapeWithFallback` with the vehicle make/model/trim/year
 * 2. On success, PATCHes the MVR record with scraped prices + status
 * 3. On failure/blocked, updates the MVR with the appropriate status
 * 4. Invalidates the MVR query cache so the admin list refreshes
 */
export function useTriggerScrape() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: ScrapeMissingVehicleParams) => {
      const result = await scrapeWithFallback({
        make: params.make,
        model: params.model,
        trim: params.trim,
        year: params.year,
      });

      if (!result.success) {
        // Mark as Failed in Dataverse
        const failedValue = missingVehicleScrapeStatusValue('Failed') ?? 5;
        await missingVehicleRepository.updateScrapeResult(params.id, {
          scrapedMinPrice: 0,
          scrapedMaxPrice: 0,
          scrapedListings: JSON.stringify({ error: result.error }),
          scrapedSources: '',
          scrapeStatusValue: failedValue,
        });
        throw new Error(result.error || 'Scrape failed');
      }

      if (result._unavailable) {
        // YallaMotor was unreachable — mark as Unreachable
        const unreachableValue = missingVehicleScrapeStatusValue('Unreachable') ?? 6;
        await missingVehicleRepository.updateScrapeResult(params.id, {
          scrapedMinPrice: 0,
          scrapedMaxPrice: 0,
          scrapedListings: JSON.stringify({
            count: 0,
            _unavailable: true,
            source: 'YallaMotor',
          }),
          scrapedSources: '',
          scrapeStatusValue: unreachableValue,
        });
        throw new Error('YallaMotor is currently unreachable (Cloudflare / network issue)');
      }

      // Success — save scraped results
      const scrapedValue = missingVehicleScrapeStatusValue('Scraped') ?? 4;

      // Map deep-scrape spec values to Dataverse option-set integers (tested core)
      const mapped = normalizeToDataverse(result);

      await missingVehicleRepository.updateScrapeResult(params.id, {
        scrapedMinPrice: result.minPrice,
        scrapedMaxPrice: result.maxPrice,
        scrapedListings: JSON.stringify({
          count: result.count,
          minPrice: result.minPrice,
          maxPrice: result.maxPrice,
          source: 'YallaMotor',
          url: result.sourceUrl,
          heading: result.heading,
          transport: result.transport, // 'azure' | 'flow3' — which path produced this row
          // Also embed the raw spec values for traceability
          bodyType: result.bodyType,
          fuelType: result.fuelType,
          transmission: result.transmission,
          driveType: result.driveType,
          cylinders: result.cylinders,
          engineSize: result.engineSize,
          doors: result.doors,
          seats: result.seats,
          mileage: result.mileage,
          regionalSpecs: result.regionalSpecs,
        }),
        scrapedSources: result.sourceUrl,
        scrapeStatusValue: scrapedValue,
        // Persist mapped spec values to Dataverse
        ...(mapped.bodyTypeValue !== undefined && { bodyTypeValue: mapped.bodyTypeValue }),
        ...(mapped.fuelTypeValue !== undefined && { fuelTypeValue: mapped.fuelTypeValue }),
        ...(mapped.transmissionValue !== undefined && { transmissionValue: mapped.transmissionValue }),
        ...(mapped.driveTypeValue !== undefined && { driveTypeValue: mapped.driveTypeValue }),
        ...(mapped.cylindersValue !== undefined && { cylindersValue: mapped.cylindersValue }),
        ...(mapped.engineSizeValue !== undefined && { engineSizeValue: mapped.engineSizeValue }),
        ...(mapped.doorsValue !== undefined && { doorsValue: mapped.doorsValue }),
        ...(mapped.seatsValue !== undefined && { seatsValue: mapped.seatsValue }),
        ...(mapped.categoryValue !== undefined && { categoryValue: mapped.categoryValue }),
        ...(mapped.mileageValue !== undefined && { mileageValue: mapped.mileageValue }),
      });

      return result;
    },
    onSuccess: (result) => {
      toast.success(
        `Scraped ${result.count} listings · AED ${result.minPrice.toLocaleString()} – ${result.maxPrice.toLocaleString()}`,
      );
      queryClient.invalidateQueries({ queryKey: [MISSING_VEHICLE_REQUESTS_KEY] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Scrape failed');
      queryClient.invalidateQueries({ queryKey: [MISSING_VEHICLE_REQUESTS_KEY] });
    },
  });
}