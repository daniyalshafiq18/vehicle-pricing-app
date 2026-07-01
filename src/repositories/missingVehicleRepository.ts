import { getDataSource } from '@data';
import type { MissingVehicleRequest } from '@types';

export class MissingVehicleRepository {
  async upsert(payload: {
    make: string;
    model: string;
    bodyType: string;
    trim: string;
    modelYear: number;
  }): Promise<string> {
    const ds = getDataSource();
    return ds.upsertMissingVehicleRequest(payload);
  }

  async getAll(): Promise<MissingVehicleRequest[]> {
    const ds = getDataSource();
    return ds.getMissingVehicleRequests();
  }
}

export const missingVehicleRepository = new MissingVehicleRepository();
