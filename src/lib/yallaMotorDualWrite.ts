import {
  missingVehicleScrapeStatusValue,
  VEHICLE_SCRAPE_PRICE_TYPE,
  VEHICLE_SCRAPE_PROCESSING_STATUS,
  VEHICLE_SCRAPE_RUN_STATUS,
  VEHICLE_SCRAPE_SOURCE,
  VEHICLE_SCRAPE_TRANSPORT,
  VEHICLE_SCRAPE_TRIGGER_TYPE,
} from '@data/dataverseOptionSets';
import { mapCategory, normalizeToDataverse } from '@parsers';
import { missingVehicleRepository, vehicleScrapeRepository } from '@repositories';
import type {
  CreateVehicleScrapeRunInput,
  CreateVehicleScrapeSourceResultInput,
  UpdateVehicleScrapeRunInput,
} from '@types';
import { scrapeWithFallback } from './azureYallaMotorScraper';
import type { TransportedResponse } from './azureYallaMotorScraper';

export interface YallaMotorScrapeParams {
  id: string;
  make: string;
  model: string;
  trim: string;
  year: number;
}

interface LegacyScrapeUpdate {
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
  doorsValue?: number;
  seatsValue?: number;
  categoryValue?: number;
  mileageValue?: number;
}

interface YallaMotorDualWriteDependencies {
  scrape: (params: Omit<YallaMotorScrapeParams, 'id'>) => Promise<TransportedResponse>;
  updateLegacy: (id: string, fields: LegacyScrapeUpdate) => Promise<void>;
  createRun: (input: CreateVehicleScrapeRunInput) => Promise<string>;
  createSourceResult: (input: CreateVehicleScrapeSourceResultInput) => Promise<string>;
  updateRun: (id: string, input: UpdateVehicleScrapeRunInput) => Promise<void>;
  now: () => Date;
  correlationId: () => string;
}

export type YallaMotorDualWriteResult = Extract<TransportedResponse, { success: true }> & {
  evidenceWarning?: string;
};

const RUN_ERROR_SUMMARY_MAX_LENGTH = 2000;

const defaultDependencies: YallaMotorDualWriteDependencies = {
  scrape: scrapeWithFallback,
  updateLegacy: (id, fields) => missingVehicleRepository.updateScrapeResult(id, fields),
  createRun: (input) => vehicleScrapeRepository.createRun(input),
  createSourceResult: (input) => vehicleScrapeRepository.createSourceResult(input),
  updateRun: (id, input) => vehicleScrapeRepository.updateRun(id, input),
  now: () => new Date(),
  correlationId: () => globalThis.crypto.randomUUID(),
};

function asNumber(value: string | undefined): number | undefined {
  if (!value) {
    return undefined;
  }
  const parsed = Number(value.replace(/[^0-9.-]/g, ''));
  return Number.isFinite(parsed) ? parsed : undefined;
}

function vehicleLabel(params: YallaMotorScrapeParams): string {
  return [params.make, params.model, params.trim, params.year].filter(Boolean).join(' ');
}

function transportValue(transport: TransportedResponse['transport']): number {
  return transport === 'azure'
    ? (VEHICLE_SCRAPE_TRANSPORT['Azure Function'] ?? 1)
    : (VEHICLE_SCRAPE_TRANSPORT['Power Automate Cloud'] ?? 2);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function runErrorSummary(value: string): string {
  return value.slice(0, RUN_ERROR_SUMMARY_MAX_LENGTH);
}

function buildLegacySuccessUpdate(
  result: Extract<TransportedResponse, { success: true }>,
): LegacyScrapeUpdate {
  const mapped = normalizeToDataverse(result);
  return {
    scrapedMinPrice: result.minPrice,
    scrapedMaxPrice: result.maxPrice,
    scrapedListings: JSON.stringify({
      count: result.count,
      minPrice: result.minPrice,
      maxPrice: result.maxPrice,
      source: 'YallaMotor',
      url: result.sourceUrl,
      heading: result.heading,
      transport: result.transport,
      bodyType: result.bodyType,
      fuelType: result.fuelType,
      transmission: result.transmission,
      driveType: result.driveType,
      cylinders: result.cylinders,
      engineSize: result.engineSize,
      doors: result.doors,
      seats: result.seats,
      mileage: result.mileage,
      regionalSpecs: result.regionalSpecs,
    }),
    scrapedSources: result.sourceUrl,
    scrapeStatusValue: missingVehicleScrapeStatusValue('Scraped') ?? 4,
    ...(mapped.bodyTypeValue !== undefined && { bodyTypeValue: mapped.bodyTypeValue }),
    ...(mapped.fuelTypeValue !== undefined && { fuelTypeValue: mapped.fuelTypeValue }),
    ...(mapped.transmissionValue !== undefined && {
      transmissionValue: mapped.transmissionValue,
    }),
    ...(mapped.driveTypeValue !== undefined && { driveTypeValue: mapped.driveTypeValue }),
    ...(mapped.cylindersValue !== undefined && { cylindersValue: mapped.cylindersValue }),
    ...(mapped.engineSizeValue !== undefined && { engineSizeValue: mapped.engineSizeValue }),
    ...(mapped.doorsValue !== undefined && { doorsValue: mapped.doorsValue }),
    ...(mapped.seatsValue !== undefined && { seatsValue: mapped.seatsValue }),
    ...(mapped.categoryValue !== undefined && { categoryValue: mapped.categoryValue }),
    ...(mapped.mileageValue !== undefined && { mileageValue: mapped.mileageValue }),
  };
}

function buildSourceResult(
  params: YallaMotorScrapeParams,
  runId: string,
  runCorrelationId: string,
  result: TransportedResponse,
  startedOn: Date,
  completedOn: Date,
): CreateVehicleScrapeSourceResultInput {
  const base: CreateVehicleScrapeSourceResultInput = {
    name: `YallaMotor - ${vehicleLabel(params)}`,
    resultCorrelationId: `${runCorrelationId}:yallamotor:1`,
    scrapeRunId: runId,
    attemptNumber: 1,
    sourceValue: VEHICLE_SCRAPE_SOURCE.YallaMotor ?? 1,
    transportValue: transportValue(result.transport),
    startedOn,
    completedOn,
    processedOn: completedOn,
    rawResultJson: JSON.stringify(result),
  };

  if (!result.success) {
    return {
      ...base,
      processingStatusValue: VEHICLE_SCRAPE_PROCESSING_STATUS.Failed,
      sourceUrl: result.url,
      httpStatusCode: asNumber(result.statusCode),
      errorCode: result.statusCode,
      errorMessage: result.error,
    };
  }

  if (result._unavailable) {
    return {
      ...base,
      processingStatusValue: VEHICLE_SCRAPE_PROCESSING_STATUS.Blocked,
      sourceUrl: result.sourceUrl || undefined,
      errorCode: 'YALLAMOTOR_UNAVAILABLE',
      errorMessage: 'YallaMotor is currently unreachable (Cloudflare / network issue)',
    };
  }

  const normalizedDetails = {
    trim: result.trim,
    modelYear: result.year,
    bodyType: result.bodyType,
    engineSize: asNumber(result.engineSize),
    cylinders: asNumber(result.cylinders),
    fuelType: result.fuelType,
    transmissionType: result.transmission,
    driveType: result.driveType,
    doors: asNumber(result.doors),
    seats: asNumber(result.seats),
    mileage: asNumber(result.mileage),
    category: result.regionalSpecs ? mapCategory(result.regionalSpecs) : undefined,
  };

  return {
    ...base,
    processingStatusValue: VEHICLE_SCRAPE_PROCESSING_STATUS.Succeeded,
    priceTypeValue: VEHICLE_SCRAPE_PRICE_TYPE['Used Market Asking'],
    listingCount: result.count,
    minimumPrice: result.minPrice,
    maximumPrice: result.maxPrice,
    trim: result.trim,
    modelYear: result.year,
    bodyType: result.bodyType,
    engineSize: asNumber(result.engineSize),
    cylinders: asNumber(result.cylinders),
    fuelType: result.fuelType,
    transmissionType: result.transmission,
    driveType: result.driveType,
    doors: asNumber(result.doors),
    seats: asNumber(result.seats),
    mileage: asNumber(result.mileage),
    category: result.regionalSpecs ? mapCategory(result.regionalSpecs) : undefined,
    sourceUrl: result.sourceUrl,
    normalizedDetailsJson: JSON.stringify(normalizedDetails),
  };
}

async function persistEvidence(
  params: YallaMotorScrapeParams,
  result: TransportedResponse,
  runId: string | undefined,
  runCorrelationId: string,
  startedOn: Date,
  deps: YallaMotorDualWriteDependencies,
): Promise<string | undefined> {
  if (!runId) {
    return 'The legacy scrape was saved, but no Vehicle Scrape Run was created.';
  }

  const completedOn = deps.now();
  const succeeded = result.success && !result._unavailable;
  const scrapeError = result.success
    ? 'YallaMotor is currently unreachable (Cloudflare / network issue)'
    : result.error;

  try {
    await deps.createSourceResult(
      buildSourceResult(params, runId, runCorrelationId, result, startedOn, completedOn),
    );
  } catch (error) {
    const message = runErrorSummary(`Source Result write failed: ${errorMessage(error)}`);
    try {
      await deps.updateRun(runId, {
        overallStatusValue: VEHICLE_SCRAPE_RUN_STATUS.Failed,
        completedOn,
        successfulSourceCount: 0,
        failedSourceCount: 1,
        errorSummary: message,
      });
    } catch (runError) {
      return `${message}; Run finalization also failed: ${errorMessage(runError)}`;
    }
    return message;
  }

  try {
    await deps.updateRun(runId, {
      overallStatusValue: succeeded
        ? VEHICLE_SCRAPE_RUN_STATUS.Completed
        : VEHICLE_SCRAPE_RUN_STATUS.Failed,
      completedOn,
      successfulSourceCount: succeeded ? 1 : 0,
      failedSourceCount: succeeded ? 0 : 1,
      errorSummary: succeeded ? null : runErrorSummary(scrapeError),
    });
  } catch (error) {
    return `Source Result was saved, but Run finalization failed: ${errorMessage(error)}`;
  }

  return undefined;
}

export async function scrapeYallaMotorWithDualWrite(
  params: YallaMotorScrapeParams,
  overrides: Partial<YallaMotorDualWriteDependencies> = {},
): Promise<YallaMotorDualWriteResult> {
  const deps = { ...defaultDependencies, ...overrides };
  const startedOn = deps.now();
  const runCorrelationId = deps.correlationId();
  let runId: string | undefined;
  let evidenceWarning: string | undefined;

  try {
    runId = await deps.createRun({
      name: `Scrape - ${vehicleLabel(params)}`,
      correlationId: runCorrelationId,
      missingVehicleRequestId: params.id,
      overallStatusValue: VEHICLE_SCRAPE_RUN_STATUS.Running,
      triggerTypeValue: VEHICLE_SCRAPE_TRIGGER_TYPE['Single Request'],
      startedOn,
      requestedSourceCount: 1,
    });
  } catch (error) {
    evidenceWarning = `Vehicle Scrape Run creation failed: ${errorMessage(error)}`;
  }

  const result = await deps.scrape({
    make: params.make,
    model: params.model,
    trim: params.trim,
    year: params.year,
  });

  if (!result.success) {
    await deps.updateLegacy(params.id, {
      scrapedMinPrice: 0,
      scrapedMaxPrice: 0,
      scrapedListings: JSON.stringify({ error: result.error }),
      scrapedSources: '',
      scrapeStatusValue: missingVehicleScrapeStatusValue('Failed') ?? 5,
    });
    await persistEvidence(params, result, runId, runCorrelationId, startedOn, deps);
    throw new Error(result.error || 'Scrape failed');
  }

  if (result._unavailable) {
    await deps.updateLegacy(params.id, {
      scrapedMinPrice: 0,
      scrapedMaxPrice: 0,
      scrapedListings: JSON.stringify({
        count: 0,
        _unavailable: true,
        source: 'YallaMotor',
      }),
      scrapedSources: '',
      scrapeStatusValue: missingVehicleScrapeStatusValue('Unreachable') ?? 6,
    });
    await persistEvidence(params, result, runId, runCorrelationId, startedOn, deps);
    throw new Error('YallaMotor is currently unreachable (Cloudflare / network issue)');
  }

  await deps.updateLegacy(params.id, buildLegacySuccessUpdate(result));
  const persistenceWarning = await persistEvidence(
    params,
    result,
    runId,
    runCorrelationId,
    startedOn,
    deps,
  );
  evidenceWarning = evidenceWarning ?? persistenceWarning;

  return { ...result, ...(evidenceWarning && { evidenceWarning }) };
}
