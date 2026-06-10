import type { VehiclePricing, ValuationResult, ComparableVehicle, VehicleFilters } from '@types';
import { getDataSource } from '@data';

export class PricingRepository {
  async getByVehicleId(vehicleId: string): Promise<VehiclePricing | null> {
    const ds = getDataSource();
    return ds.getPricing(vehicleId);
  }

  async getByCriteria(year: number, make: string, model: string, spec: string): Promise<VehiclePricing | null> {
    const ds = getDataSource();
    return ds.getPricingByCriteria(year, make, model, spec);
  }

  async getComparables(vehicleId: string, limit = 5): Promise<ComparableVehicle[]> {
    const ds = getDataSource();
    return ds.getComparableVehicles(vehicleId, limit);
  }

  async getValuation(year: number, make: string, model: string, spec: string, bodyType?: string): Promise<ValuationResult | null> {
    const ds = getDataSource();
    return ds.getValuation(year, make, model, spec, bodyType);
  }

  async getPriceRange(filters?: VehicleFilters) {
    const ds = getDataSource();
    return ds.getPriceRange(filters);
  }

  /** Batch fetch pricing for multiple vehicle IDs — eliminates N+1 queries */
  async batchGetPricing(vehicleIds: string[]): Promise<Map<string, VehiclePricing>> {
    if (vehicleIds.length === 0) return new Map();
    const ds = getDataSource();
    const results = await Promise.all(vehicleIds.map((id) => ds.getPricing(id)));
    const map = new Map<string, VehiclePricing>();
    for (let i = 0; i < vehicleIds.length; i++) {
      const pricing = results[i];
      if (pricing) map.set(vehicleIds[i]!, pricing);
    }
    return map;
  }
}

export const pricingRepository = new PricingRepository();
