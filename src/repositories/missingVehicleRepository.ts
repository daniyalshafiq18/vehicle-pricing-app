import { getDataSource } from '@data';
import type { MissingVehicleRequest } from '@types';

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
    minMileage?: number;
    maxMileage?: number;
  }): Promise<string> {
    const ds = getDataSource();
    return ds.upsertMissingVehicleRequest(payload);
  }

  async getAll(): Promise<MissingVehicleRequest[]> {
    const ds = getDataSource();
    return ds.getMissingVehicleRequests();
  }

  async updateStatus(id: string, status: string): Promise<void> {
    const ds = getDataSource();
    return ds.updateMissingVehicleRequestStatus(id, status);
  }

  async approve(mvr: MissingVehicleRequest): Promise<void> {
    const ds = getDataSource();
    return ds.approveAndCreateVehicle(mvr);
  }
}

export const missingVehicleRepository = new MissingVehicleRepository();
