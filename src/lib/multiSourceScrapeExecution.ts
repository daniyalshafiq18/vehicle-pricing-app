import type { MissingVehicleRequest } from '@types';
import { missingVehicleRepository } from '@repositories';
import { MISSING_VEHICLE_SCRAPE_STATUS } from '@data/dataverseOptionSets';
import {
  prepareMultiSourceScrape,
  refreshMultiSourceRun,
  type OrchestratedScrapeSource,
  type PreparedMultiSourceScrape,
} from './multiSourceOrchestrator';
import { buildCorrelatedDriveArabiaPadUrl } from './driveArabiaUrl';
import {
  scrapeYallaMotorIntoPreparedTarget,
  type YallaMotorDualWriteResult,
} from './yallaMotorDualWrite';
import {
  findScrapeInboxItemByCorrelation,
  processScrapeInbox,
  type InboxProcessSummary,
} from './multiSourceScraper';

const DRIVE_ARABIA_RECEIPT_POLL_MS = 3_000;
const DRIVE_ARABIA_RECEIPT_TIMEOUT_MS = 10 * 60_000;

export interface DriveArabiaPadDispatch {
  mode: 'automatic';
  inboxId: string;
  statusCode: number;
}

interface DriveArabiaReceiptTarget {
  runCorrelationId: string;
  attemptNumber: number;
}

export interface ExecuteMultiSourceScrapeInput {
  request: MissingVehicleRequest;
  sources: readonly OrchestratedScrapeSource[];
}

export interface MultiSourceScrapeExecutionResult {
  prepared: PreparedMultiSourceScrape;
  driveArabiaPadUrl?: string;
  driveArabiaDispatch?: DriveArabiaPadDispatch;
  driveArabiaInboxSummary?: InboxProcessSummary;
  yallaMotorResult?: YallaMotorDualWriteResult;
  sourceErrors: Array<{ source: OrchestratedScrapeSource; error: string }>;
}

interface MultiSourceScrapeExecutionDependencies {
  prepare: typeof prepareMultiSourceScrape;
  scrapeYallaMotor: typeof scrapeYallaMotorIntoPreparedTarget;
  waitForDriveArabiaReceipt: (
    target: DriveArabiaReceiptTarget,
  ) => Promise<DriveArabiaPadDispatch>;
  processDriveArabiaCapture: typeof processScrapeInbox;
  refreshRun: typeof refreshMultiSourceRun;
  updateRequestScrapeStatus: (id: string, scrapeStatusValue: number) => Promise<void>;
}

async function waitForDriveArabiaReceipt(
  target: DriveArabiaReceiptTarget,
): Promise<DriveArabiaPadDispatch> {
  const deadline = Date.now() + DRIVE_ARABIA_RECEIPT_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const item = await findScrapeInboxItemByCorrelation(target);
    if (item) {
      return {
        mode: 'automatic',
        inboxId: item.inboxId,
        statusCode: 202,
      };
    }
    await new Promise<void>((resolve) => {
      window.setTimeout(resolve, DRIVE_ARABIA_RECEIPT_POLL_MS);
    });
  }
  throw new Error('Timed out waiting for the correlated DriveArabia PAD capture in Azure Inbox');
}

const defaultDependencies: MultiSourceScrapeExecutionDependencies = {
  prepare: prepareMultiSourceScrape,
  scrapeYallaMotor: scrapeYallaMotorIntoPreparedTarget,
  waitForDriveArabiaReceipt,
  processDriveArabiaCapture: processScrapeInbox,
  refreshRun: refreshMultiSourceRun,
  updateRequestScrapeStatus: (id, scrapeStatusValue) =>
    missingVehicleRepository.updateScrapeStatus(id, scrapeStatusValue),
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

  const recordRequestScrapeStatus = async (
    scrapeStatusValue: number,
    source: OrchestratedScrapeSource,
  ) => {
    try {
      await deps.updateRequestScrapeStatus(input.request.id, scrapeStatusValue);
    } catch (error) {
      sourceErrors.push({
        source,
        error: `MVR scrape status could not be updated: ${errorMessage(error)}`,
      });
    }
  };

  await recordRequestScrapeStatus(
    MISSING_VEHICLE_SCRAPE_STATUS['In Progress']!,
    prepared.sources.some((target) => target.source === 'DriveArabia')
      ? 'DriveArabia'
      : 'YallaMotor',
  );

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

  let driveArabiaDispatch: DriveArabiaPadDispatch | undefined;
  let driveArabiaInboxSummary: InboxProcessSummary | undefined;
  if (driveArabiaTarget && driveArabiaPadUrl) {
    let driveArabiaCompleted = false;
    // YallaMotor preserves its standalone legacy write, so restore the shared
    // request lifecycle while DriveArabia is still outstanding.
    if (yallaMotorTarget) {
      await recordRequestScrapeStatus(
        MISSING_VEHICLE_SCRAPE_STATUS['In Progress']!,
        'DriveArabia',
      );
    }
    try {
      driveArabiaDispatch = await deps.waitForDriveArabiaReceipt({
        runCorrelationId: prepared.runCorrelationId,
        attemptNumber: driveArabiaTarget.attemptNumber,
      });
      driveArabiaInboxSummary = await deps.processDriveArabiaCapture({
        requests: [input.request],
        inboxId: driveArabiaDispatch.inboxId,
      });
      if (
        driveArabiaInboxSummary.completedItems !== 1 ||
        driveArabiaInboxSummary.failedItems > 0 ||
        driveArabiaInboxSummary.waitingItems > 0
      ) {
        const detail = driveArabiaInboxSummary.failures[0]?.error;
        throw new Error(detail ?? 'Automated PAD capture was not completed');
      }
      driveArabiaCompleted = true;
    } catch (error) {
      sourceErrors.push({ source: 'DriveArabia', error: errorMessage(error) });
    }

    try {
      let finalStatusValue = MISSING_VEHICLE_SCRAPE_STATUS.Scraped!;
      if (!driveArabiaCompleted) {
        const aggregate = await deps.refreshRun(
          prepared.runId,
          prepared.sources.length,
        );
        finalStatusValue = aggregate.isTerminal
          ? aggregate.successfulSourceCount > 0
            ? MISSING_VEHICLE_SCRAPE_STATUS.Scraped!
            : MISSING_VEHICLE_SCRAPE_STATUS.Failed!
          : MISSING_VEHICLE_SCRAPE_STATUS['In Progress']!;
      }
      await recordRequestScrapeStatus(finalStatusValue, 'DriveArabia');
    } catch (error) {
      sourceErrors.push({
        source: 'DriveArabia',
        error: `Shared scrape status could not be finalized: ${errorMessage(error)}`,
      });
    }
  }

  return {
    prepared,
    sourceErrors,
    ...(driveArabiaPadUrl && { driveArabiaPadUrl }),
    ...(driveArabiaDispatch && { driveArabiaDispatch }),
    ...(driveArabiaInboxSummary && { driveArabiaInboxSummary }),
    ...(yallaMotorResult && { yallaMotorResult }),
  };
}
