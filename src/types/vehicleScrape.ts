export type VehicleScrapeRunStatus =
  | 'Queued'
  | 'Running'
  | 'Partial Success'
  | 'Completed'
  | 'Failed'
  | 'Cancelled';

export type VehicleScrapeTriggerType =
  | 'Single Request'
  | 'Bulk'
  | 'Retry'
  | 'Automatic';

export type VehicleScrapeSource = 'YallaMotor' | 'DriveArabia' | 'Dubizzle' | 'Other';

export type VehicleScrapeTransport =
  | 'Azure Function'
  | 'Power Automate Cloud'
  | 'Power Automate Desktop'
  | 'Manual'
  | 'Other';

export type VehicleScrapeProcessingStatus =
  | 'Queued'
  | 'Running'
  | 'Succeeded'
  | 'No Data'
  | 'Blocked'
  | 'Failed'
  | 'Skipped';

export type VehicleScrapePriceType =
  | 'Used Market Asking'
  | 'Original Reference'
  | 'Dealer MSRP'
  | 'Other or Unknown';

export interface VehicleScrapeRun {
  id: string;
  name: string;
  correlationId: string;
  overallStatus: VehicleScrapeRunStatus;
  overallStatusValue: number;
  missingVehicleRequestId: string;
  triggerType: VehicleScrapeTriggerType;
  triggerTypeValue: number;
  startedOn?: Date;
  completedOn?: Date;
  requestedSourceCount?: number;
  successfulSourceCount?: number;
  failedSourceCount?: number;
  batchCorrelationKey?: string;
  errorSummary?: string;
  requestedByContactId?: string;
}

export interface CreateVehicleScrapeRunInput {
  name: string;
  correlationId: string;
  missingVehicleRequestId: string;
  overallStatusValue?: number;
  triggerTypeValue?: number;
  startedOn?: Date;
  requestedSourceCount?: number;
  batchCorrelationKey?: string;
  requestedByContactId?: string;
}

export interface UpdateVehicleScrapeRunInput {
  overallStatusValue?: number;
  startedOn?: Date;
  completedOn?: Date;
  requestedSourceCount?: number;
  successfulSourceCount?: number;
  failedSourceCount?: number;
  errorSummary?: string | null;
}

export interface VehicleScrapeSourceResult {
  id: string;
  name: string;
  resultCorrelationId: string;
  scrapeRunId: string;
  attemptNumber: number;
  source: VehicleScrapeSource;
  sourceValue: number;
  transport: VehicleScrapeTransport;
  transportValue: number;
  processingStatus: VehicleScrapeProcessingStatus;
  processingStatusValue: number;
  priceType?: VehicleScrapePriceType;
  priceTypeValue?: number;
  listingCount?: number;
  minimumPrice?: number;
  averagePrice?: number;
  maximumPrice?: number;
  trim?: string;
  modelYear?: number;
  bodyType?: string;
  engineSize?: number;
  cylinders?: number;
  fuelType?: string;
  transmissionType?: string;
  driveType?: string;
  horsepower?: number;
  doors?: number;
  seats?: number;
  mileage?: number;
  category?: string;
  countryOfOrigin?: string;
  torqueNm?: number;
  sourceUrl?: string;
  inboxId?: string;
  externalJobId?: string;
  httpStatusCode?: number;
  startedOn?: Date;
  completedOn?: Date;
  capturedOn?: Date;
  processedOn?: Date;
  normalizedDetailsJson?: string;
  rawResultJson?: string;
  evidenceStorageReference?: string;
  contentHash?: string;
  errorCode?: string;
  errorMessage?: string;
}

export interface CreateVehicleScrapeSourceResultInput {
  name: string;
  resultCorrelationId: string;
  scrapeRunId: string;
  sourceValue: number;
  transportValue: number;
  processingStatusValue?: number;
  attemptNumber?: number;
  priceTypeValue?: number;
  listingCount?: number;
  minimumPrice?: number;
  averagePrice?: number;
  maximumPrice?: number;
  trim?: string;
  modelYear?: number;
  bodyType?: string;
  engineSize?: number;
  cylinders?: number;
  fuelType?: string;
  transmissionType?: string;
  driveType?: string;
  horsepower?: number;
  doors?: number;
  seats?: number;
  mileage?: number;
  category?: string;
  countryOfOrigin?: string;
  torqueNm?: number;
  sourceUrl?: string;
  inboxId?: string;
  externalJobId?: string;
  httpStatusCode?: number;
  startedOn?: Date;
  completedOn?: Date;
  capturedOn?: Date;
  processedOn?: Date;
  normalizedDetailsJson?: string;
  rawResultJson?: string;
  evidenceStorageReference?: string;
  contentHash?: string;
  errorCode?: string;
  errorMessage?: string;
}

export type UpdateVehicleScrapeSourceResultInput = Partial<
  Omit<CreateVehicleScrapeSourceResultInput, 'name' | 'resultCorrelationId' | 'scrapeRunId'>
> & {
  name?: string;
  errorMessage?: string | null;
  errorCode?: string | null;
};
