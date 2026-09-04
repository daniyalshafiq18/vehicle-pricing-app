import {
  VEHICLE_SCRAPE_PRICE_TYPE,
  VEHICLE_SCRAPE_PROCESSING_STATUS,
  VEHICLE_SCRAPE_RUN_STATUS,
  VEHICLE_SCRAPE_SOURCE,
  VEHICLE_SCRAPE_TRANSPORT,
  VEHICLE_SCRAPE_TRIGGER_TYPE,
} from '@data/dataverseOptionSets';
import { vehicleScrapeRepository } from '@repositories';
import type {
  CreateVehicleScrapeRunInput,
  CreateVehicleScrapeSourceResultInput,
  MissingVehicleRequest,
  UpdateVehicleScrapeRunInput,
  UpdateVehicleScrapeSourceResultInput,
  VehicleScrapeRun,
  VehicleScrapeSourceResult,
} from '@types';
import {
  aggregateVehicleScrapeRun,
  buildSourceResultCorrelationId,
  type VehicleScrapeRunAggregate,
} from './vehicleScrapeRunState';
import { buildCorrelatedDriveArabiaPadUrl } from './driveArabiaUrl';

const DATAVERSE_NAME_MAX_LENGTH = 100;
const RUN_ERROR_SUMMARY_MAX_LENGTH = 2000;

export const ORCHESTRATED_SCRAPE_SOURCES = ['YallaMotor', 'DriveArabia'] as const;
export type OrchestratedScrapeSource = (typeof ORCHESTRATED_SCRAPE_SOURCES)[number];
export type OrchestratedScrapeTrigger = 'Single Request' | 'Retry';

export interface PrepareMultiSourceScrapeInput {
  request: MissingVehicleRequest;
  sources: readonly OrchestratedScrapeSource[];
  trigger?: OrchestratedScrapeTrigger;
  attemptNumber?: number;
}

export interface PreparedScrapeSourceTarget {
  id: string;
  source: OrchestratedScrapeSource;
  attemptNumber: number;
  resultCorrelationId: string;
}

export interface PreparedMultiSourceScrape {
  runId: string;
  runCorrelationId: string;
  startedOn: Date;
  request: MissingVehicleRequest;
  sources: PreparedScrapeSourceTarget[];
}

interface MultiSourceOrchestratorDependencies {
  createRun: (input: CreateVehicleScrapeRunInput) => Promise<string>;
  updateRun: (id: string, input: UpdateVehicleScrapeRunInput) => Promise<void>;
  createSourceResult: (input: CreateVehicleScrapeSourceResultInput) => Promise<string>;
  updateSourceResult: (
    id: string,
    input: UpdateVehicleScrapeSourceResultInput,
  ) => Promise<void>;
  now: () => Date;
  correlationId: () => string;
}

interface RunAggregationDependencies {
  getSourceResults: (runId: string) => Promise<VehicleScrapeSourceResult[]>;
  updateRun: (id: string, input: UpdateVehicleScrapeRunInput) => Promise<void>;
  now: () => Date;
}

interface PreparedTargetResolutionDependencies {
  getRunByCorrelationId: (correlationId: string) => Promise<VehicleScrapeRun | null>;
  getSourceResults: (runId: string) => Promise<VehicleScrapeSourceResult[]>;
}

export interface ResolvedPreparedSourceTarget {
  runId: string;
  runCorrelationId: string;
  sourceResultId: string;
  requestedSourceCount: number;
  attemptNumber: number;
}

const defaultDependencies: MultiSourceOrchestratorDependencies = {
  createRun: (input) => vehicleScrapeRepository.createRun(input),
  updateRun: (id, input) => vehicleScrapeRepository.updateRun(id, input),
  createSourceResult: (input) => vehicleScrapeRepository.createSourceResult(input),
  updateSourceResult: (id, input) => vehicleScrapeRepository.updateSourceResult(id, input),
  now: () => new Date(),
  correlationId: () => globalThis.crypto.randomUUID(),
};

const defaultAggregationDependencies: RunAggregationDependencies = {
  getSourceResults: (runId) => vehicleScrapeRepository.getSourceResults(runId),
  updateRun: (id, input) => vehicleScrapeRepository.updateRun(id, input),
  now: () => new Date(),
};

const defaultResolutionDependencies: PreparedTargetResolutionDependencies = {
  getRunByCorrelationId: (correlationId) =>
    vehicleScrapeRepository.getRunByCorrelationId(correlationId),
  getSourceResults: (runId) => vehicleScrapeRepository.getSourceResults(runId),
};

function vehicleLabel(request: MissingVehicleRequest): string {
  return [request.make, request.model, request.trim, request.modelYear]
    .filter(Boolean)
    .join(' ');
}

function sourceContract(source: OrchestratedScrapeSource): {
  sourceValue: number;
  transportValue: number;
  priceTypeValue: number;
} {
  return source === 'YallaMotor'
    ? {
        sourceValue: VEHICLE_SCRAPE_SOURCE.YallaMotor!,
        transportValue: VEHICLE_SCRAPE_TRANSPORT['Azure Function']!,
        priceTypeValue: VEHICLE_SCRAPE_PRICE_TYPE['Used Market Asking']!,
      }
    : {
        sourceValue: VEHICLE_SCRAPE_SOURCE.DriveArabia!,
        transportValue: VEHICLE_SCRAPE_TRANSPORT['Power Automate Desktop']!,
        priceTypeValue: VEHICLE_SCRAPE_PRICE_TYPE['Original Reference']!,
      };
}

function uniqueSources(
  sources: readonly OrchestratedScrapeSource[],
): OrchestratedScrapeSource[] {
  const unique = [...new Set(sources)];
  if (unique.length === 0) {
    throw new Error('Select at least one scrape source');
  }
  return unique;
}

function queuedSourceResult(
  request: MissingVehicleRequest,
  runId: string,
  runCorrelationId: string,
  source: OrchestratedScrapeSource,
  attemptNumber: number,
): CreateVehicleScrapeSourceResultInput {
  const contract = sourceContract(source);
  const sourceUrl =
    source === 'DriveArabia'
      ? buildCorrelatedDriveArabiaPadUrl(
          {
            make: request.make,
            model: request.model,
            year: request.modelYear,
          },
          { runCorrelationId, attemptNumber },
        )
      : undefined;
  return {
    name: `${source} - ${vehicleLabel(request)}`.slice(0, DATAVERSE_NAME_MAX_LENGTH),
    resultCorrelationId: buildSourceResultCorrelationId(
      runCorrelationId,
      source,
      attemptNumber,
    ),
    scrapeRunId: runId,
    attemptNumber,
    sourceValue: contract.sourceValue,
    transportValue: contract.transportValue,
    processingStatusValue: VEHICLE_SCRAPE_PROCESSING_STATUS.Queued!,
    priceTypeValue: contract.priceTypeValue,
    trim: request.trim,
    modelYear: request.modelYear,
    ...(sourceUrl && { sourceUrl }),
  };
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function failPreparation(
  runId: string,
  requestedSourceCount: number,
  preparedTargets: readonly PreparedScrapeSourceTarget[],
  message: string,
  deps: MultiSourceOrchestratorDependencies,
): Promise<string> {
  const completedOn = deps.now();
  const summary = message.slice(0, RUN_ERROR_SUMMARY_MAX_LENGTH);
  const cleanupWarnings: string[] = [];

  for (const target of preparedTargets) {
    try {
      await deps.updateSourceResult(target.id, {
        processingStatusValue: VEHICLE_SCRAPE_PROCESSING_STATUS.Skipped!,
        completedOn,
        processedOn: completedOn,
        errorCode: 'ORCHESTRATION_SETUP_FAILED',
        errorMessage: summary,
      });
    } catch (error) {
      cleanupWarnings.push(`${target.source} cleanup failed: ${errorText(error)}`);
    }
  }

  try {
    await deps.updateRun(runId, {
      overallStatusValue: VEHICLE_SCRAPE_RUN_STATUS.Failed!,
      completedOn,
      successfulSourceCount: 0,
      failedSourceCount: requestedSourceCount,
      errorSummary: summary,
    });
  } catch (error) {
    cleanupWarnings.push(`Run finalization failed: ${errorText(error)}`);
  }

  return [summary, ...cleanupWarnings].join('; ').slice(0, RUN_ERROR_SUMMARY_MAX_LENGTH);
}

/**
 * Create one shared Run and every queued source target before transport work.
 * A partially prepared evidence set is terminally failed and never dispatched.
 */
export async function prepareMultiSourceScrape(
  input: PrepareMultiSourceScrapeInput,
  overrides: Partial<MultiSourceOrchestratorDependencies> = {},
): Promise<PreparedMultiSourceScrape> {
  const deps = { ...defaultDependencies, ...overrides };
  const sources = uniqueSources(input.sources);
  const attemptNumber = input.attemptNumber ?? 1;
  if (!Number.isInteger(attemptNumber) || attemptNumber < 1) {
    throw new Error('Attempt number must be a positive integer');
  }

  const startedOn = deps.now();
  const runCorrelationId = deps.correlationId();
  const trigger = input.trigger ?? 'Single Request';
  const runId = await deps.createRun({
    name: `Scrape - Multi-source - ${vehicleLabel(input.request)}`.slice(
      0,
      DATAVERSE_NAME_MAX_LENGTH,
    ),
    correlationId: runCorrelationId,
    missingVehicleRequestId: input.request.id,
    overallStatusValue: VEHICLE_SCRAPE_RUN_STATUS.Running!,
    triggerTypeValue: VEHICLE_SCRAPE_TRIGGER_TYPE[trigger]!,
    startedOn,
    requestedSourceCount: sources.length,
  });

  const preparedTargets: PreparedScrapeSourceTarget[] = [];
  for (const source of sources) {
    const resultCorrelationId = buildSourceResultCorrelationId(
      runCorrelationId,
      source,
      attemptNumber,
    );
    try {
      const id = await deps.createSourceResult(
        queuedSourceResult(
          input.request,
          runId,
          runCorrelationId,
          source,
          attemptNumber,
        ),
      );
      preparedTargets.push({ id, source, attemptNumber, resultCorrelationId });
    } catch (error) {
      const message = await failPreparation(
        runId,
        sources.length,
        preparedTargets,
        `Unable to prepare ${source} evidence: ${errorText(error)}`,
        deps,
      );
      throw new Error(message);
    }
  }

  return {
    runId,
    runCorrelationId,
    startedOn,
    request: input.request,
    sources: preparedTargets,
  };
}

/** Recalculate and persist one shared Run from its current Source Results. */
export async function refreshMultiSourceRun(
  runId: string,
  requestedSourceCount: number,
  overrides: Partial<RunAggregationDependencies> = {},
): Promise<VehicleScrapeRunAggregate> {
  const deps = { ...defaultAggregationDependencies, ...overrides };
  const results = await deps.getSourceResults(runId);
  const aggregate = aggregateVehicleScrapeRun(requestedSourceCount, results);
  await deps.updateRun(runId, {
    overallStatusValue: aggregate.overallStatusValue,
    successfulSourceCount: aggregate.successfulSourceCount,
    failedSourceCount: aggregate.failedSourceCount,
    errorSummary: aggregate.errorSummary,
    ...(aggregate.isTerminal && { completedOn: deps.now() }),
  });
  return aggregate;
}

/**
 * Resolve the exact prepared DriveArabia target carried by an attended PAD URL.
 * Correlated captures never guess a Run or fall back to standalone evidence.
 */
export async function resolvePreparedDriveArabiaTarget(
  requestId: string,
  correlation: { runCorrelationId: string; attemptNumber: number },
  overrides: Partial<PreparedTargetResolutionDependencies> = {},
): Promise<ResolvedPreparedSourceTarget | null> {
  const deps = { ...defaultResolutionDependencies, ...overrides };
  const run = await deps.getRunByCorrelationId(correlation.runCorrelationId);
  const requestedSourceCount = run?.requestedSourceCount;
  if (
    !run ||
    run.missingVehicleRequestId.toLowerCase() !== requestId.toLowerCase() ||
    (run.overallStatusValue !== VEHICLE_SCRAPE_RUN_STATUS.Queued &&
      run.overallStatusValue !== VEHICLE_SCRAPE_RUN_STATUS.Running) ||
    !requestedSourceCount ||
    requestedSourceCount < 1
  ) {
    return null;
  }

  const expectedCorrelationId = buildSourceResultCorrelationId(
    run.correlationId,
    'DriveArabia',
    correlation.attemptNumber,
  );
  const results = await deps.getSourceResults(run.id);
  const target = results.find(
    (candidate) =>
      candidate.sourceValue === VEHICLE_SCRAPE_SOURCE.DriveArabia &&
      candidate.attemptNumber === correlation.attemptNumber &&
      candidate.resultCorrelationId === expectedCorrelationId &&
      (candidate.processingStatusValue === VEHICLE_SCRAPE_PROCESSING_STATUS.Queued ||
        candidate.processingStatusValue === VEHICLE_SCRAPE_PROCESSING_STATUS.Running),
  );
  if (!target) {
    return null;
  }

  return {
    runId: run.id,
    runCorrelationId: run.correlationId,
    sourceResultId: target.id,
    requestedSourceCount,
    attemptNumber: correlation.attemptNumber,
  };
}
