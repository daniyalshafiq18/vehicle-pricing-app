import { describe, expect, it, vi } from 'vitest';
import type { MissingVehicleRequest } from '@types';
import { executeMultiSourceScrape } from './multiSourceScrapeExecution';

const REQUEST = {
  id: '11111111-1111-f011-8111-111111111111',
  make: 'MG',
  model: '5',
  trim: 'STD',
  modelYear: 2026,
} as MissingVehicleRequest;

const PREPARED = {
  runId: 'run-id',
  runCorrelationId: 'shared-run',
  startedOn: new Date('2026-08-20T10:00:00.000Z'),
  request: REQUEST,
  sources: [
    {
      id: 'yalla-result-id',
      source: 'YallaMotor' as const,
      attemptNumber: 1,
      resultCorrelationId: 'shared-run:yallamotor:1',
    },
    {
      id: 'drive-result-id',
      source: 'DriveArabia' as const,
      attemptNumber: 1,
      resultCorrelationId: 'shared-run:drivearabia:1',
    },
  ],
};

function automaticDriveArabia() {
  return {
    waitForDriveArabiaReceipt: vi.fn().mockResolvedValue({
      mode: 'automatic' as const,
      inboxId: 'automated-inbox',
      statusCode: 202,
    }),
    processDriveArabiaCapture: vi.fn().mockResolvedValue({
      processedItems: 1,
      completedItems: 1,
      failedItems: 0,
      waitingItems: 0,
      updatedRequestIds: [REQUEST.id],
      failures: [],
      evidenceWarnings: [],
    }),
    refreshRun: vi.fn().mockResolvedValue({
      overallStatusValue: 4,
      successfulSourceCount: 2,
      failedSourceCount: 0,
      isTerminal: true,
      errorSummary: null,
    }),
    updateRequestScrapeStatus: vi.fn().mockResolvedValue(undefined),
  };
}

describe('executeMultiSourceScrape', () => {
  it('dispatches YallaMotor into the shared target and returns a correlated PAD URL', async () => {
    const prepare = vi.fn().mockResolvedValue(PREPARED);
    const scrapeYallaMotor = vi.fn().mockResolvedValue({
      success: true,
      count: 3,
      minPrice: 40000,
      maxPrice: 50000,
    });

    const result = await executeMultiSourceScrape(
      { request: REQUEST, sources: ['YallaMotor', 'DriveArabia'] },
      {
        prepare,
        scrapeYallaMotor,
        ...automaticDriveArabia(),
      },
    );

    expect(prepare).toHaveBeenCalledWith({
      request: REQUEST,
      sources: ['YallaMotor', 'DriveArabia'],
    });
    expect(scrapeYallaMotor).toHaveBeenCalledWith(
      {
        id: REQUEST.id,
        make: REQUEST.make,
        model: REQUEST.model,
        trim: REQUEST.trim,
        year: REQUEST.modelYear,
      },
      {
        runId: PREPARED.runId,
        runCorrelationId: PREPARED.runCorrelationId,
        sourceResultId: 'yalla-result-id',
        requestedSourceCount: 2,
        attemptNumber: 1,
      },
    );
    expect(result.driveArabiaPadUrl).toBe(
      'https://www.drivearabia.com/carprices/uae/mg/5/2026/#vpiRun=shared-run&vpiAttempt=1',
    );
    expect(result.sourceErrors).toEqual([]);
  });

  it('keeps the DriveArabia work available when immediate YallaMotor fails', async () => {
    const result = await executeMultiSourceScrape(
      { request: REQUEST, sources: ['YallaMotor', 'DriveArabia'] },
      {
        prepare: vi.fn().mockResolvedValue(PREPARED),
        scrapeYallaMotor: vi.fn().mockRejectedValue(new Error('Yalla blocked')),
        ...automaticDriveArabia(),
      },
    );

    expect(result.driveArabiaPadUrl).toContain('#vpiRun=shared-run&vpiAttempt=1');
    expect(result.sourceErrors).toEqual([
      { source: 'YallaMotor', error: 'Yalla blocked' },
    ]);
  });

  it('does not dispatch YallaMotor when only DriveArabia was prepared', async () => {
    const scrapeYallaMotor = vi.fn();
    const driveOnly = { ...PREPARED, sources: [PREPARED.sources[1]!] };

    const result = await executeMultiSourceScrape(
      { request: REQUEST, sources: ['DriveArabia'] },
      {
        prepare: vi.fn().mockResolvedValue(driveOnly),
        scrapeYallaMotor,
        ...automaticDriveArabia(),
      },
    );

    expect(scrapeYallaMotor).not.toHaveBeenCalled();
    expect(result.driveArabiaPadUrl).toContain('vpiRun=shared-run');
  });

  it('processes the exact Inbox ID resolved from the correlated Azure capture', async () => {
    const processDriveArabiaCapture = vi.fn().mockResolvedValue({
      processedItems: 1,
      completedItems: 1,
      failedItems: 0,
      waitingItems: 0,
      updatedRequestIds: [REQUEST.id],
      failures: [],
      evidenceWarnings: [],
    });

    const waitForDriveArabiaReceipt = vi.fn().mockResolvedValue({
      mode: 'automatic' as const,
      inboxId: 'automated-inbox',
      statusCode: 202,
    });
    const result = await executeMultiSourceScrape(
      { request: REQUEST, sources: ['DriveArabia'] },
      {
        ...automaticDriveArabia(),
        prepare: vi.fn().mockResolvedValue({
          ...PREPARED,
          sources: [PREPARED.sources[1]!],
        }),
        scrapeYallaMotor: vi.fn(),
        waitForDriveArabiaReceipt,
        processDriveArabiaCapture,
      },
    );

    expect(waitForDriveArabiaReceipt).toHaveBeenCalledWith({
      runCorrelationId: PREPARED.runCorrelationId,
      attemptNumber: 1,
    });
    expect(processDriveArabiaCapture).toHaveBeenCalledWith({
      requests: [REQUEST],
      inboxId: 'automated-inbox',
    });
    expect(result.driveArabiaDispatch).toEqual({
      mode: 'automatic',
      inboxId: 'automated-inbox',
      statusCode: 202,
    });
    expect(result.driveArabiaInboxSummary?.completedItems).toBe(1);
    expect(result.sourceErrors).toEqual([]);
  });

  it('keeps the MVR In Progress until the shared Run becomes terminal', async () => {
    const updateRequestScrapeStatus = vi.fn().mockResolvedValue(undefined);
    const result = await executeMultiSourceScrape(
      { request: REQUEST, sources: ['DriveArabia'] },
      {
        ...automaticDriveArabia(),
        prepare: vi.fn().mockResolvedValue({
          ...PREPARED,
          sources: [PREPARED.sources[1]!],
        }),
        updateRequestScrapeStatus,
      },
    );

    expect(updateRequestScrapeStatus.mock.calls).toEqual([
      [REQUEST.id, 3],
      [REQUEST.id, 4],
    ]);
    expect(result.sourceErrors).toEqual([]);
  });

  it('marks the MVR Failed when every selected source terminates unsuccessfully', async () => {
    const updateRequestScrapeStatus = vi.fn().mockResolvedValue(undefined);
    const result = await executeMultiSourceScrape(
      { request: REQUEST, sources: ['DriveArabia'] },
      {
        ...automaticDriveArabia(),
        prepare: vi.fn().mockResolvedValue({
          ...PREPARED,
          sources: [PREPARED.sources[1]!],
        }),
        waitForDriveArabiaReceipt: vi.fn().mockRejectedValue(new Error('PAD failed')),
        refreshRun: vi.fn().mockResolvedValue({
          overallStatusValue: 5,
          successfulSourceCount: 0,
          failedSourceCount: 1,
          isTerminal: true,
          errorSummary: 'DriveArabia: PAD failed',
        }),
        updateRequestScrapeStatus,
      },
    );

    expect(updateRequestScrapeStatus.mock.calls).toEqual([
      [REQUEST.id, 3],
      [REQUEST.id, 5],
    ]);
    expect(result.sourceErrors).toContainEqual({
      source: 'DriveArabia',
      error: 'PAD failed',
    });
  });
});
