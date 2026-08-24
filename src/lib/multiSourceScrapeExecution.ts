import type { MissingVehicleRequest } from '@types';
import {
  prepareMultiSourceScrape,
  type OrchestratedScrapeSource,
  type PreparedMultiSourceScrape,
} from './multiSourceOrchestrator';
import { buildCorrelatedDriveArabiaPadUrl } from './driveArabiaUrl';
import {
  scrapeYallaMotorIntoPreparedTarget,
  type YallaMotorDualWriteResult,
} from './yallaMotorDualWrite';

export interface ExecuteMultiSourceScrapeInput {
  request: MissingVehicleRequest;
  sources: readonly OrchestratedScrapeSource[];
}

export interface MultiSourceScrapeExecutionResult {
  prepared: PreparedMultiSourceScrape;
  driveArabiaPadUrl?: string;
  yallaMotorResult?: YallaMotorDualWriteResult;
  sourceErrors: Array<{ source: OrchestratedScrapeSource; error: string }>;
}

interface MultiSourceScrapeExecutionDependencies {
  prepare: typeof prepareMultiSourceScrape;
  scrapeYallaMotor: typeof scrapeYallaMotorIntoPreparedTarget;
}

const defaultDependencies: MultiSourceScrapeExecutionDependencies = {
  prepare: prepareMultiSourceScrape,
  scrapeYallaMotor: scrapeYallaMotorIntoPreparedTarget,
};

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** Prepare one shared Run, start immediate sources, and return attended work. */
export async function executeMultiSourceScrape(
  input: ExecuteMultiSourceScrapeInput,
  overrides: Partial<MultiSourceScrapeExecutionDependencies> = {},
): Promise<MultiSourceScrapeExecutionResult> {
  const deps = { ...defaultDependencies, ...overrides };
  const prepared = await deps.prepare({
    request: input.request,
    sources: input.sources,
  });
  const sourceErrors: MultiSourceScrapeExecutionResult['sourceErrors'] = [];

  const driveArabiaTarget = prepared.sources.find(
    (target) => target.source === 'DriveArabia',
  );
  const driveArabiaPadUrl = driveArabiaTarget
    ? buildCorrelatedDriveArabiaPadUrl(
        {
          make: input.request.make,
          model: input.request.model,
          year: input.request.modelYear,
        },
        {
          runCorrelationId: prepared.runCorrelationId,
          attemptNumber: driveArabiaTarget.attemptNumber,
        },
      )
    : undefined;

  const yallaMotorTarget = prepared.sources.find(
    (target) => target.source === 'YallaMotor',
  );
  let yallaMotorResult: YallaMotorDualWriteResult | undefined;
  if (yallaMotorTarget) {
    try {
      yallaMotorResult = await deps.scrapeYallaMotor(
        {
          id: input.request.id,
          make: input.request.make,
          model: input.request.model,
          trim: input.request.trim,
          year: input.request.modelYear,
        },
        {
          runId: prepared.runId,
          runCorrelationId: prepared.runCorrelationId,
          sourceResultId: yallaMotorTarget.id,
          requestedSourceCount: prepared.sources.length,
          attemptNumber: yallaMotorTarget.attemptNumber,
        },
      );
    } catch (error) {
      sourceErrors.push({ source: 'YallaMotor', error: errorMessage(error) });
    }
  }

  return {
    prepared,
    sourceErrors,
    ...(driveArabiaPadUrl && { driveArabiaPadUrl }),
    ...(yallaMotorResult && { yallaMotorResult }),
  };
}
