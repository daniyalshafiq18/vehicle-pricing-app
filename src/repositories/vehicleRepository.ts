import type { Vehicle, VehicleFilters, VehicleSortOption, VehicleHierarchy } from '@types';
import { getDataSource } from '@data';

export class VehicleRepository {
  async getAll(filters?: VehicleFilters, sort?: VehicleSortOption, page = 1, pageSize = 20) {
    const ds = getDataSource();
    return ds.getVehicles(filters, sort, page, pageSize);
  }

  async getById(id: string): Promise<Vehicle | null> {
    const ds = getDataSource();
    return ds.getVehicleById(id);
  }

  async getHierarchy(): Promise<VehicleHierarchy> {
    const ds = getDataSource();
    return ds.getVehicleHierarchy();
  }

  async getSpecs(year: number, make: string, model: string): Promise<Vehicle[]> {
    const ds = getDataSource();
    return ds.getVehicleSpecs(year, make, model);
  }

  async search(query: string, limit = 20): Promise<Vehicle[]> {
    const ds = getDataSource();
    return ds.searchVehicles(query, limit);
  }

  async getYears(): Promise<number[]> {
    const ds = getDataSource();
    return ds.getYears();
  }

  async getMakes(year: number): Promise<string[]> {
    const ds = getDataSource();
    return ds.getMakes(year);
  }

  async getModels(year: number, make: string): Promise<string[]> {
    const ds = getDataSource();
    return ds.getModels(year, make);
  }

  async getSpecsList(year: number, make: string, model: string): Promise<string[]> {
    const ds = getDataSource();
    return ds.getSpecs(year, make, model);
  }
}

export const vehicleRepository = new VehicleRepository();
