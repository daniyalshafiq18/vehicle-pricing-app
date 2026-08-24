import {
  VEHICLE_SCRAPE_PROCESSING_STATUS,
  VEHICLE_SCRAPE_RUN_STATUS,
} from '@data/dataverseOptionSets';
import type {
  MissingVehiclePricingDecisionStatus,
  VehicleScrapeSource,
  VehicleScrapeSourceResult,
} from '@types';

const RUN_ERROR_SUMMARY_MAX_LENGTH = 2000;

export type AdminPricingDecisionStatus = Exclude<
  MissingVehiclePricingDecisionStatus,
  'Awaiting Scrapes' | 'Scraping'
>;

/**
 * System-managed scrape statuses are not valid selections in the admin review form.
 * Normalize them before binding a controlled select so its visible option and submitted
 * value cannot diverge.
 */
export function adminPricingDecisionStatus(
  status: MissingVehiclePricingDecisionStatus | undefined,
): AdminPricingDecisionStatus {
  if (!status || status === 'Awaiting Scrapes' || status === 'Scraping') {
    return 'Ready for Review';
  }
  return status;
}

type SourceAttempt = Pick<
  VehicleScrapeSourceResult,
  | 'source'
  | 'sourceValue'
  | 'attemptNumber'
  | 'processingStatus'
  | 'processingStatusValue'
  | 'errorMessage'
>;

export interface VehicleScrapeRunAggregate {
  overallStatusValue: number;
  successfulSourceCount: number;
  failedSourceCount: number;
  isTerminal: boolean;
  errorSummary: string | null;
}

const TERMINAL_FAILURE_VALUES = new Set<number>([
  VEHICLE_SCRAPE_PROCESSING_STATUS['No Data']!,
  VEHICLE_SCRAPE_PROCESSING_STATUS.Blocked!,
  VEHICLE_SCRAPE_PROCESSING_STATUS.Failed!,
  VEHICLE_SCRAPE_PROCESSING_STATUS.Skipped!,
]);

/** Keep only the highest attempt number for each source. */
export function latestVehicleScrapeSourceAttempts(
  attempts: readonly SourceAttempt[],
): SourceAttempt[] {
  const latest = new Map<number, SourceAttempt>();
  for (const attempt of attempts) {
    const existing = latest.get(attempt.sourceValue);
    if (!existing || attempt.attemptNumber >= existing.attemptNumber) {
      latest.set(attempt.sourceValue, attempt);
    }
  }
  return [...latest.values()].sort((left, right) => left.sourceValue - right.sourceValue);
}

/**
 * Derive the parent Run state from the latest attempt for each requested source.
 * The caller persists the returned values and owns the completion timestamp.
 */
export function aggregateVehicleScrapeRun(
  requestedSourceCount: number,
  attempts: readonly SourceAttempt[],
  cancelled = false,
): VehicleScrapeRunAggregate {
  if (!Number.isInteger(requestedSourceCount) || requestedSourceCount < 1) {
    throw new Error('Requested source count must be a positive integer');
  }

  const latest = latestVehicleScrapeSourceAttempts(attempts);
  const successfulSourceCount = latest.filter(
    (attempt) =>
      attempt.processingStatusValue === VEHICLE_SCRAPE_PROCESSING_STATUS.Succeeded,
  ).length;
  const failedAttempts = latest.filter((attempt) =>
    TERMINAL_FAILURE_VALUES.has(attempt.processingStatusValue),
  );
  const failedSourceCount = failedAttempts.length;
  const errorSummary =
    failedAttempts.length === 0
      ? null
      : failedAttempts
          .map(
            (attempt) =>
              `${attempt.source}: ${attempt.errorMessage || attempt.processingStatus}`,
          )
          .join('; ')
          .slice(0, RUN_ERROR_SUMMARY_MAX_LENGTH);

  if (cancelled) {
    return {
      overallStatusValue: VEHICLE_SCRAPE_RUN_STATUS.Cancelled!,
      successfulSourceCount,
      failedSourceCount,
      isTerminal: true,
      errorSummary,
    };
  }

  const allRequestedSourcesHaveResults = latest.length >= requestedSourceCount;
  const allLatestAttemptsAreTerminal = latest.every(
    (attempt) =>
      attempt.processingStatusValue === VEHICLE_SCRAPE_PROCESSING_STATUS.Succeeded ||
      TERMINAL_FAILURE_VALUES.has(attempt.processingStatusValue),
  );
  if (!allRequestedSourcesHaveResults || !allLatestAttemptsAreTerminal) {
    return {
      overallStatusValue: VEHICLE_SCRAPE_RUN_STATUS.Running!,
      successfulSourceCount,
      failedSourceCount,
      isTerminal: false,
      errorSummary,
    };
  }

  const overallStatusValue =
    successfulSourceCount === requestedSourceCount
      ? VEHICLE_SCRAPE_RUN_STATUS.Completed!
      : successfulSourceCount > 0
        ? VEHICLE_SCRAPE_RUN_STATUS['Partial Success']!
        : VEHICLE_SCRAPE_RUN_STATUS.Failed!;

  return {
    overallStatusValue,
    successfulSourceCount,
    failedSourceCount,
    isTerminal: true,
    errorSummary,
  };
}

/** Stable alternate-key value for one source attempt under a Run. */
export function buildSourceResultCorrelationId(
  runCorrelationId: string,
  source: VehicleScrapeSource,
  attemptNumber: number,
): string {
  const runKey = runCorrelationId.trim();
  const sourceKey = source.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (!runKey || !sourceKey || !Number.isInteger(attemptNumber) || attemptNumber < 1) {
    throw new Error('A Run correlation ID, source, and positive attempt number are required');
  }
  return `${runKey}:${sourceKey}:${attemptNumber}`;
}
