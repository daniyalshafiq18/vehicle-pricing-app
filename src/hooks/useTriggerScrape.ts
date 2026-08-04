import { useMutation, useQueryClient } from '@tanstack/react-query';
import { missingVehicleRepository } from '@repositories';
import { scrapeViaFlow3 } from '@lib/yallaMotorHttpScraper';
import {
  missingVehicleScrapeStatusValue,
  missingVehicleBodyTypeValue,
  missingVehicleFuelTypeValue,
  missingVehicleTransmissionTypeValue,
  missingVehicleDriveTypeValue,
  missingVehicleCylindersValue,
  DOORS,
  SEATS,
  CATEGORY,
} from '@data/dataverseOptionSets';
import toast from 'react-hot-toast';

// ─── Mappers from YallaMotor JSON-LD values to Dataverse option sets ───

/** Normalise drive-type schema URL to a short label Dataverse understands. */
function mapDriveType(driveType: string): string | undefined {
  const url = driveType.toLowerCase();
  if (url.includes('rearwheel')) return 'RWD';
  if (url.includes('frontwheel')) return 'FWD';
  if (url.includes('allwheel')) return 'AWD';
  if (url.includes('4wd') || url.includes('fourwheel')) return '4X4';
  return undefined;
}

/** Parse the listing description for regional-spec keywords → Dataverse category label. */
function mapCategory(description: string): string | undefined {
  if (description.includes('GCC Specs')) return 'GCC';
  if (description.includes('Not Sure') || description.includes('Other Specs')) return 'OTHER/STANDARD';
  // Any other explicit spec mention → Non-GCC
  if (description.includes('Specs')) return 'NON-GCC';
  return undefined;
}

/** Normalise raw fuel type to a MISSING_VEHICLE_FUEL_TYPE label. */
function mapFuelType(fuelType: string): string | undefined {
  const f = fuelType.toLowerCase();
  if (f === 'petrol') return 'Petrol';
  if (f === 'diesel') return 'Diesel';
  if (f === 'hybrid') return 'Hybrid';
  if (f === 'electric' || f === 'electrical') return 'Electric';
  return undefined;
}

/** Get the Dataverse integer value for a doors label string. */
function lookupDoorsValue(label: string): number | undefined {
  return DOORS[label];
}

/** Get the Dataverse integer value for a seats label string. */
function lookupSeatsValue(label: string): number | undefined {
  return SEATS[label];
}

const MISSING_VEHICLE_REQUESTS_KEY = 'missing-vehicle-requests';

interface ScrapeMissingVehicleParams {
  id: string;
  make: string;
  model: string;
  trim: string;
  year: number;
}

/**
 * Trigger a Power Automate Flow 3 scrape for a missing vehicle request.
 *
 * 1. Calls Flow 3 via HTTP with the vehicle make/model/trim/year
 * 2. On success, PATCHes the MVR record with scraped prices + status
 * 3. On failure/blocked, updates the MVR with the appropriate status
 * 4. Invalidates the MVR query cache so the admin list refreshes
 */
export function useTriggerScrape() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: ScrapeMissingVehicleParams) => {
      const result = await scrapeViaFlow3({
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

      // Map deep-scrape spec values to Dataverse option-set integers
      const bodyTypeValue = result.bodyType ? missingVehicleBodyTypeValue(result.bodyType) ?? undefined : undefined;
      const fuelTypeValue = result.fuelType ? missingVehicleFuelTypeValue(mapFuelType(result.fuelType) ?? result.fuelType) ?? undefined : undefined;
      const transmissionValue = result.transmission ? missingVehicleTransmissionTypeValue(result.transmission) ?? undefined : undefined;
      const driveTypeLabel = result.driveType ? mapDriveType(result.driveType) : undefined;
      const driveTypeValue = driveTypeLabel ? missingVehicleDriveTypeValue(driveTypeLabel) ?? undefined : undefined;
      const cylindersValue = result.cylinders ? missingVehicleCylindersValue(result.cylinders) ?? undefined : undefined;
      const engineSizeValue = result.engineSize ? Number(result.engineSize) || undefined : undefined;
      const doorsValue = result.doors ? lookupDoorsValue(result.doors) : undefined;
      const seatsValue = result.seats ? lookupSeatsValue(result.seats) : undefined;
      const categoryLabel = result.regionalSpecs ? mapCategory(result.regionalSpecs) : undefined;
      const categoryValue = categoryLabel ? (CATEGORY[categoryLabel] ?? undefined) : undefined;
      const mileageValue =
        result.mileage != null && result.mileage !== '' ? Number(result.mileage) || undefined : undefined;

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
        ...(bodyTypeValue !== undefined && { bodyTypeValue }),
        ...(fuelTypeValue !== undefined && { fuelTypeValue }),
        ...(transmissionValue !== undefined && { transmissionValue }),
        ...(driveTypeValue !== undefined && { driveTypeValue }),
        ...(cylindersValue !== undefined && { cylindersValue }),
        ...(engineSizeValue !== undefined && { engineSizeValue }),
        ...(doorsValue !== undefined && { doorsValue }),
        ...(seatsValue !== undefined && { seatsValue }),
        ...(categoryValue !== undefined && { categoryValue }),
        ...(mileageValue !== undefined && { mileageValue }),
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