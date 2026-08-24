import { describe, expect, it } from 'vitest';
import type { VehicleScrapeSourceResult } from '@types';
import {
  aggregateVehicleScrapeRun,
  buildSourceResultCorrelationId,
  latestVehicleScrapeSourceAttempts,
} from './vehicleScrapeRunState';

type Attempt = Pick<
  VehicleScrapeSourceResult,
  | 'source'
  | 'sourceValue'
  | 'attemptNumber'
  | 'processingStatus'
  | 'processingStatusValue'
  | 'errorMessage'
>;

function attempt(fields: Partial<Attempt> & Pick<Attempt, 'source' | 'sourceValue'>): Attempt {
  return {
    attemptNumber: 1,
    processingStatus: 'Queued',
    processingStatusValue: 1,
    ...fields,
  };
}

describe('latestVehicleScrapeSourceAttempts', () => {
  it('keeps only the highest attempt number for each source', () => {
    const latest = latestVehicleScrapeSourceAttempts([
      attempt({ source: 'YallaMotor', sourceValue: 1, attemptNumber: 1 }),
      attempt({
        source: 'DriveArabia',
        sourceValue: 2,
        attemptNumber: 1,
        processingStatus: 'Succeeded',
        processingStatusValue: 3,
      }),
      attempt({
        source: 'YallaMotor',
        sourceValue: 1,
        attemptNumber: 2,
        processingStatus: 'Failed',
        processingStatusValue: 6,
      }),
    ]);

    expect(latest).toHaveLength(2);
    expect(latest[0]).toMatchObject({ source: 'YallaMotor', attemptNumber: 2 });
    expect(latest[1]).toMatchObject({ source: 'DriveArabia', attemptNumber: 1 });
  });
});

describe('aggregateVehicleScrapeRun', () => {
  const yallaSucceeded = attempt({
    source: 'YallaMotor',
    sourceValue: 1,
    processingStatus: 'Succeeded',
    processingStatusValue: 3,
  });
  const driveQueued = attempt({ source: 'DriveArabia', sourceValue: 2 });
  const driveSucceeded = attempt({
    source: 'DriveArabia',
    sourceValue: 2,
    processingStatus: 'Succeeded',
    processingStatusValue: 3,
  });
  const driveFailed = attempt({
    source: 'DriveArabia',
    sourceValue: 2,
    processingStatus: 'Failed',
    processingStatusValue: 6,
    errorMessage: 'PAD capture failed',
  });

  it('remains Running while one requested source is queued', () => {
    expect(aggregateVehicleScrapeRun(2, [yallaSucceeded, driveQueued])).toEqual({
      overallStatusValue: 2,
      successfulSourceCount: 1,
      failedSourceCount: 0,
      isTerminal: false,
      errorSummary: null,
    });
  });

  it('completes only when every requested source succeeds', () => {
    expect(aggregateVehicleScrapeRun(2, [yallaSucceeded, driveSucceeded])).toEqual({
      overallStatusValue: 4,
      successfulSourceCount: 2,
      failedSourceCount: 0,
      isTerminal: true,
      errorSummary: null,
    });
  });

  it('returns Partial Success when one source succeeds and one fails', () => {
    expect(aggregateVehicleScrapeRun(2, [yallaSucceeded, driveFailed])).toEqual({
      overallStatusValue: 3,
      successfulSourceCount: 1,
      failedSourceCount: 1,
      isTerminal: true,
      errorSummary: 'DriveArabia: PAD capture failed',
    });
  });

  it('returns Failed when no requested source succeeds', () => {
    const yallaBlocked = attempt({
      source: 'YallaMotor',
      sourceValue: 1,
      processingStatus: 'Blocked',
      processingStatusValue: 5,
    });
    expect(aggregateVehicleScrapeRun(2, [yallaBlocked, driveFailed])).toMatchObject({
      overallStatusValue: 5,
      successfulSourceCount: 0,
      failedSourceCount: 2,
      isTerminal: true,
    });
  });

  it('remains Running when fewer source results exist than requested', () => {
    expect(aggregateVehicleScrapeRun(2, [yallaSucceeded])).toMatchObject({
      overallStatusValue: 2,
      successfulSourceCount: 1,
      isTerminal: false,
    });
  });

  it('uses the latest attempt rather than an earlier failure', () => {
    const earlierFailure = { ...driveFailed, attemptNumber: 1 };
    const laterSuccess = { ...driveSucceeded, attemptNumber: 2 };
    expect(
      aggregateVehicleScrapeRun(2, [yallaSucceeded, earlierFailure, laterSuccess]),
    ).toMatchObject({
      overallStatusValue: 4,
      successfulSourceCount: 2,
      failedSourceCount: 0,
    });
  });

  it('supports explicit cancellation and validates requested-source counts', () => {
    expect(aggregateVehicleScrapeRun(2, [yallaSucceeded, driveQueued], true)).toMatchObject({
      overallStatusValue: 6,
      isTerminal: true,
    });
    expect(() => aggregateVehicleScrapeRun(0, [])).toThrow(
      'Requested source count must be a positive integer',
    );
  });
});

describe('buildSourceResultCorrelationId', () => {
  it('normalizes the source and includes the attempt number', () => {
    expect(buildSourceResultCorrelationId('run-id', 'DriveArabia', 2)).toBe(
      'run-id:drivearabia:2',
    );
  });

  it('rejects invalid correlation inputs', () => {
    expect(() => buildSourceResultCorrelationId('', 'YallaMotor', 1)).toThrow();
    expect(() => buildSourceResultCorrelationId('run-id', 'YallaMotor', 0)).toThrow();
  });
});
