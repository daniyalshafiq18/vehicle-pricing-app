import { getDataSource } from '@data';
import type {
  CreateVehicleScrapeRunInput,
  CreateVehicleScrapeSourceResultInput,
  UpdateVehicleScrapeRunInput,
  UpdateVehicleScrapeSourceResultInput,
  VehicleScrapeRun,
  VehicleScrapeSourceResult,
} from '@types';

export class VehicleScrapeRepository {
  createRun(payload: CreateVehicleScrapeRunInput): Promise<string> {
    return getDataSource().createVehicleScrapeRun(payload);
  }

  getRuns(missingVehicleRequestId: string): Promise<VehicleScrapeRun[]> {
    return getDataSource().getVehicleScrapeRuns(missingVehicleRequestId);
  }

  getRunByCorrelationId(correlationId: string): Promise<VehicleScrapeRun | null> {
    return getDataSource().getVehicleScrapeRunByCorrelationId(correlationId);
  }

  updateRun(id: string, fields: UpdateVehicleScrapeRunInput): Promise<void> {
    return getDataSource().updateVehicleScrapeRun(id, fields);
  }

  createSourceResult(payload: CreateVehicleScrapeSourceResultInput): Promise<string> {
    return getDataSource().createVehicleScrapeSourceResult(payload);
  }

  getSourceResults(scrapeRunId: string): Promise<VehicleScrapeSourceResult[]> {
    return getDataSource().getVehicleScrapeSourceResults(scrapeRunId);
  }

  updateSourceResult(
    id: string,
    fields: UpdateVehicleScrapeSourceResultInput,
  ): Promise<void> {
    return getDataSource().updateVehicleScrapeSourceResult(id, fields);
  }
}

export const vehicleScrapeRepository = new VehicleScrapeRepository();
