import { getDataSource } from '@data';
import type {
  MissingVehiclePromotionResult,
  MissingVehicleRequest,
  SaveMissingVehiclePricingDecisionInput,
} from '@types';

export class MissingVehicleRepository {
  async upsert(payload: {
    make: string;
    model: string;
    bodyType?: string;
    trim: string;
    modelYear: number;
    cylinders?: string;
    fuelType?: string;
    transmissionType?: string;
    driveType?: string;
    contactEmail?: string;
    contactName?: string;
    minPrice?: number;
    maxPrice?: number;
    scrapedMinPrice?: number;
    scrapedMaxPrice?: number;
    scrapedListings?: string;
    scrapedSources?: string;
    scrapeStatusValue?: number;
  }): Promise<string> {
    const ds = getDataSource();
    return ds.upsertMissingVehicleRequest(payload);
  }

  async getAll(): Promise<MissingVehicleRequest[]> {
    const ds = getDataSource();
    return ds.getMissingVehicleRequests();
  }

  async getById(id: string): Promise<MissingVehicleRequest | null> {
    const ds = getDataSource();
    return ds.getMissingVehicleRequestById(id);
  }

  async updateStatus(id: string, status: string): Promise<void> {
    const ds = getDataSource();
    return ds.updateMissingVehicleRequestStatus(id, status);
  }

  async update(id: string, fields: { minPrice?: number; maxPrice?: number }): Promise<void> {
    const ds = getDataSource();
    return ds.updateMissingVehicleRequest(id, fields);
  }

  async savePricingDecision(
    id: string,
    input: SaveMissingVehiclePricingDecisionInput,
  ): Promise<void> {
    return getDataSource().saveMissingVehiclePricingDecision(id, input);
  }

  async updateScrapeResult(
    id: string,
    fields: {
      scrapedMinPrice: number;
      scrapedMaxPrice: number;
      scrapedListings: string;
      scrapedSources: string;
      scrapeStatusValue: number;
      bodyTypeValue?: number;
      fuelTypeValue?: number;
      transmissionValue?: number;
      driveTypeValue?: number;
      cylindersValue?: number;
      engineSizeValue?: number;
      horsepowerValue?: number;
      doorsValue?: number;
      seatsValue?: number;
      categoryValue?: number;
      mileageValue?: number;
    },
  ): Promise<void> {
    const ds = getDataSource();
    return ds.updateMissingVehicleScrapeResult(id, fields);
  }

  async promote(id: string): Promise<MissingVehiclePromotionResult> {
    return getDataSource().promoteApprovedMissingVehicle(id);
  }
}

export const missingVehicleRepository = new MissingVehicleRepository();
