import {
  VEHICLE_SCRAPE_PRICE_TYPE,
  VEHICLE_SCRAPE_PROCESSING_STATUS,
  VEHICLE_SCRAPE_RUN_STATUS,
  VEHICLE_SCRAPE_SOURCE,
  VEHICLE_SCRAPE_TRANSPORT,
  VEHICLE_SCRAPE_TRIGGER_TYPE,
} from '@data/dataverseOptionSets';
import type { DriveArabiaSpecs } from '@parsers';
import { vehicleScrapeRepository } from '@repositories';
import type {
  CreateVehicleScrapeRunInput,
  CreateVehicleScrapeSourceResultInput,
  MissingVehicleRequest,
  UpdateVehicleScrapeRunInput,
} from '@types';

const RUN_ERROR_SUMMARY_MAX_LENGTH = 2000;
const DATAVERSE_NAME_MAX_LENGTH = 100;

export interface DriveArabiaEvidenceInput {
  request: MissingVehicleRequest;
  inboxId: string;
  sourceUrl: string;
  minimumPrice: number;
  maximumPrice: number;
  specs?: DriveArabiaSpecs;
}

interface DriveArabiaEvidenceDependencies {
  createRun: (input: CreateVehicleScrapeRunInput) => Promise<string>;
  createSourceResult: (input: CreateVehicleScrapeSourceResultInput) => Promise<string>;
  updateRun: (id: string, input: UpdateVehicleScrapeRunInput) => Promise<void>;
  now: () => Date;
  correlationId: () => string;
}

const defaultDependencies: DriveArabiaEvidenceDependencies = {
  createRun: (input) => vehicleScrapeRepository.createRun(input),
  createSourceResult: (input) => vehicleScrapeRepository.createSourceResult(input),
  updateRun: (id, input) => vehicleScrapeRepository.updateRun(id, input),
  now: () => new Date(),
  correlationId: () => globalThis.crypto.randomUUID(),
};

function text(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function summary(value: string): string {
  return value.slice(0, RUN_ERROR_SUMMARY_MAX_LENGTH);
}

function numeric(value: unknown): number | undefined {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : undefined;
  }
  if (typeof value !== 'string' || !value.trim()) {
    return undefined;
  }
  const parsed = Number(value.replace(/[^0-9.-]/g, ''));
  return Number.isFinite(parsed) ? parsed : undefined;
}

function vehicleLabel(request: MissingVehicleRequest): string {
  return [request.make, request.model, request.trim, request.modelYear]
    .filter(Boolean)
    .join(' ');
}

function sourceResultInput(
  input: DriveArabiaEvidenceInput,
  runId: string,
  runCorrelationId: string,
  startedOn: Date,
  completedOn: Date,
): CreateVehicleScrapeSourceResultInput {
  const specs = input.specs;
  const normalizedDetails = {
    trim: input.request.trim,
    modelYear: input.request.modelYear,
    bodyType: specs?.bodyType,
    engineSize: numeric(specs?.engineSize),
    cylinders: numeric(specs?.cylinders),
    fuelType: specs?.fuelType,
    transmissionType: specs?.transmission,
    driveType: specs?.driveType,
    horsepower: specs?.horsepower,
    doors: numeric(specs?.doors),
    countryOfOrigin: specs?.countryOfOrigin,
    torqueNm: specs?.torqueNm,
  };
  const rawResult = {
    source: 'DriveArabia',
    transport: 'pad',
    inboxId: input.inboxId,
    url: input.sourceUrl,
    count: 1,
    minPrice: input.minimumPrice,
    maxPrice: input.maximumPrice,
    trim: input.request.trim,
    year: input.request.modelYear,
    ...(specs && { specs }),
  };

  return {
    name: `DriveArabia - ${vehicleLabel(input.request)}`.slice(
      0,
      DATAVERSE_NAME_MAX_LENGTH,
    ),
    resultCorrelationId: `${runCorrelationId}:drivearabia:1`,
    scrapeRunId: runId,
    attemptNumber: 1,
    sourceValue: VEHICLE_SCRAPE_SOURCE.DriveArabia ?? 2,
    transportValue: VEHICLE_SCRAPE_TRANSPORT['Power Automate Desktop'] ?? 3,
    processingStatusValue: VEHICLE_SCRAPE_PROCESSING_STATUS.Succeeded,
    priceTypeValue: VEHICLE_SCRAPE_PRICE_TYPE['Original Reference'],
    listingCount: 1,
    minimumPrice: input.minimumPrice,
    maximumPrice: input.maximumPrice,
    trim: input.request.trim,
    modelYear: input.request.modelYear,
    bodyType: specs?.bodyType,
    engineSize: numeric(specs?.engineSize),
    cylinders: numeric(specs?.cylinders),
    fuelType: specs?.fuelType,
    transmissionType: specs?.transmission,
    driveType: specs?.driveType,
    horsepower: specs?.horsepower,
    doors: numeric(specs?.doors),
    countryOfOrigin: specs?.countryOfOrigin,
    torqueNm: specs?.torqueNm,
    sourceUrl: input.sourceUrl,
    inboxId: input.inboxId,
    startedOn,
    completedOn,
    processedOn: completedOn,
    normalizedDetailsJson: JSON.stringify(normalizedDetails),
    rawResultJson: JSON.stringify(rawResult),
  };
}

/** Persist normalized DriveArabia evidence after the proven legacy MVR write. */
export async function persistDriveArabiaEvidence(
  input: DriveArabiaEvidenceInput,
  overrides: Partial<DriveArabiaEvidenceDependencies> = {},
): Promise<string | undefined> {
  const deps = { ...defaultDependencies, ...overrides };
  const startedOn = deps.now();
  const runCorrelationId = deps.correlationId();
  let runId: string;

  try {
    runId = await deps.createRun({
      name: `Scrape - DriveArabia - ${vehicleLabel(input.request)}`.slice(
        0,
        DATAVERSE_NAME_MAX_LENGTH,
      ),
      correlationId: runCorrelationId,
      missingVehicleRequestId: input.request.id,
      overallStatusValue: VEHICLE_SCRAPE_RUN_STATUS.Running,
      triggerTypeValue: VEHICLE_SCRAPE_TRIGGER_TYPE.Bulk,
      startedOn,
      requestedSourceCount: 1,
      batchCorrelationKey: input.inboxId,
    });
  } catch (error) {
    return summary(`Vehicle Scrape Run creation failed: ${text(error)}`);
  }

  const completedOn = deps.now();
  try {
    await deps.createSourceResult(
      sourceResultInput(input, runId, runCorrelationId, startedOn, completedOn),
    );
  } catch (error) {
    const message = summary(`Source Result write failed: ${text(error)}`);
    try {
      await deps.updateRun(runId, {
        overallStatusValue: VEHICLE_SCRAPE_RUN_STATUS.Failed,
        completedOn,
        successfulSourceCount: 0,
        failedSourceCount: 1,
        errorSummary: message,
      });
    } catch (runError) {
      return summary(`${message}; Run finalization also failed: ${text(runError)}`);
    }
    return message;
  }

  try {
    await deps.updateRun(runId, {
      overallStatusValue: VEHICLE_SCRAPE_RUN_STATUS.Completed,
      completedOn,
      successfulSourceCount: 1,
      failedSourceCount: 0,
      errorSummary: null,
    });
  } catch (error) {
    return summary(`Source Result was saved, but Run finalization failed: ${text(error)}`);
  }

  return undefined;
}
