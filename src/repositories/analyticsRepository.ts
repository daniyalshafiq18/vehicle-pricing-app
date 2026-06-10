import type { AnalyticsData, VehicleFilters, Vehicle, VehiclePricing, DashboardAnalytics, DashboardFilters } from '@types';
import { getDataSource } from '@data';

export class AnalyticsRepository {
  async getAnalytics(): Promise<AnalyticsData> {
    const ds = getDataSource();
    return ds.getAnalytics();
  }

  async getAllVehiclesWithPricing(filters?: VehicleFilters): Promise<{ vehicle: Vehicle; pricing: VehiclePricing }[]> {
    const ds = getDataSource();
    return ds.getAllVehiclesWithPricing(filters);
  }

  async getDashboardAnalytics(filters?: DashboardFilters): Promise<DashboardAnalytics> {
    const ds = getDataSource();
    return ds.getDashboardAnalytics(filters);
  }
}

export const analyticsRepository = new AnalyticsRepository();
