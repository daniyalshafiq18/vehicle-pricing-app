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
  UpdateVehicleScrapeSourceResultInput,
  VehicleScrapeSourceResult,
} from '@types';
import {
  refreshMultiSourceRun,
  type ResolvedPreparedSourceTarget,
} from './multiSourceOrchestrator';

const RUN_ERROR_SUMMARY_MAX_LENGTH = 2000;
const DATAVERSE_NAME_MAX_LENGTH = 100;

export interface DriveArabiaEvidenceInput {
  request: MissingVehicleRequest;
  sourceTrim?: string;
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
  updateSourceResult: (
    id: string,
    input: UpdateVehicleScrapeSourceResultInput,
  ) => Promise<void>;
  getSourceResults: (runId: string) => Promise<VehicleScrapeSourceResult[]>;
  now: () => Date;
  correlationId: () => string;
}

const defaultDependencies: DriveArabiaEvidenceDependencies = {
  createRun: (input) => vehicleScrapeRepository.createRun(input),
  createSourceResult: (input) => vehicleScrapeRepository.createSourceResult(input),
  updateRun: (id, input) => vehicleScrapeRepository.updateRun(id, input),
  updateSourceResult: (id, input) =>
    vehicleScrapeRepository.updateSourceResult(id, input),
  getSourceResults: (runId) => vehicleScrapeRepository.getSourceResults(runId),
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
  attemptNumber = 1,
): CreateVehicleScrapeSourceResultInput {
  const specs = input.specs;
  const sourceTrim = input.sourceTrim ?? input.request.trim;
  const normalizedDetails = {
    trim: sourceTrim,
    ...(sourceTrim !== input.request.trim && { requestedTrim: input.request.trim }),
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
    trim: sourceTrim,
    ...(sourceTrim !== input.request.trim && { requestedTrim: input.request.trim }),
    year: input.request.modelYear,
    ...(specs && { specs }),
  };

  return {
    name: `DriveArabia - ${vehicleLabel(input.request)}`.slice(
      0,
      DATAVERSE_NAME_MAX_LENGTH,
    ),
    resultCorrelationId: `${runCorrelationId}:drivearabia:${attemptNumber}`,
    scrapeRunId: runId,
    attemptNumber,
    sourceValue: VEHICLE_SCRAPE_SOURCE.DriveArabia ?? 2,
    transportValue: VEHICLE_SCRAPE_TRANSPORT['Power Automate Desktop'] ?? 3,
    processingStatusValue: VEHICLE_SCRAPE_PROCESSING_STATUS.Succeeded,
    priceTypeValue: VEHICLE_SCRAPE_PRICE_TYPE['Original Reference'],
    listingCount: 1,
    minimumPrice: input.minimumPrice,
    maximumPrice: input.maximumPrice,
    trim: sourceTrim,
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

function sourceResultUpdate(
  input: CreateVehicleScrapeSourceResultInput,
): UpdateVehicleScrapeSourceResultInput {
  const { resultCorrelationId, scrapeRunId, ...update } = input;
  void resultCorrelationId;
  void scrapeRunId;
  return update;
}

export type DriveArabiaPreparedTargetContext = ResolvedPreparedSourceTarget;

/** Persist one PAD capture into its pre-created shared-Run evidence target. */
export async function persistDriveArabiaEvidenceIntoPreparedTarget(
  input: DriveArabiaEvidenceInput,
  target: DriveArabiaPreparedTargetContext,
  overrides: Partial<DriveArabiaEvidenceDependencies> = {},
): Promise<string | undefined> {
  const deps = { ...defaultDependencies, ...overrides };
  const startedOn = deps.now();

  try {
    await deps.updateSourceResult(target.sourceResultId, {
      processingStatusValue: VEHICLE_SCRAPE_PROCESSING_STATUS.Running,
      startedOn,
      sourceUrl: input.sourceUrl,
      inboxId: input.inboxId,
      errorCode: null,
      errorMessage: null,
    });
  } catch (error) {
    return summary(`Prepared DriveArabia target could not start: ${text(error)}`);
  }

  const completedOn = deps.now();
  try {
    const completedResult = sourceResultInput(
      input,
      target.runId,
      target.runCorrelationId,
      startedOn,
      completedOn,
      target.attemptNumber,
    );
    await deps.updateSourceResult(
      target.sourceResultId,
      sourceResultUpdate(completedResult),
    );
  } catch (error) {
    const message = summary(`Prepared DriveArabia evidence write failed: ${text(error)}`);
    try {
      await deps.updateSourceResult(target.sourceResultId, {
        processingStatusValue: VEHICLE_SCRAPE_PROCESSING_STATUS.Failed,
        completedOn,
        processedOn: completedOn,
        errorCode: 'DRIVEARABIA_EVIDENCE_WRITE_FAILED',
        errorMessage: message,
      });
      await refreshMultiSourceRun(target.runId, target.requestedSourceCount, {
        getSourceResults: deps.getSourceResults,
        updateRun: deps.updateRun,
        now: deps.now,
      });
    } catch (finalizationError) {
      return summary(`${message}; target finalization failed: ${text(finalizationError)}`);
    }
    return message;
  }

  try {
    await refreshMultiSourceRun(target.runId, target.requestedSourceCount, {
      getSourceResults: deps.getSourceResults,
      updateRun: deps.updateRun,
      now: deps.now,
    });
  } catch (error) {
    return summary(`DriveArabia evidence was saved, but Run refresh failed: ${text(error)}`);
  }
  return undefined;
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
