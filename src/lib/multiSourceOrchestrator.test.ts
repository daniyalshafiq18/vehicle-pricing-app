import { describe, expect, it, vi } from 'vitest';
import type {
  MissingVehicleRequest,
  VehicleScrapeRun,
  VehicleScrapeSourceResult,
} from '@types';
import {
  prepareMultiSourceScrape,
  refreshMultiSourceRun,
  resolvePreparedDriveArabiaTarget,
} from './multiSourceOrchestrator';

const REQUEST = {
  id: '11111111-1111-f011-8111-111111111111',
  make: 'MG',
  model: '5',
  trim: 'STD',
  modelYear: 2026,
} as MissingVehicleRequest;
const STARTED_ON = new Date('2026-08-20T10:00:00.000Z');
const FAILED_ON = new Date('2026-08-20T10:00:01.000Z');

function dependencies() {
  return {
    createRun: vi.fn().mockResolvedValue('run-id'),
    updateRun: vi.fn().mockResolvedValue(undefined),
    createSourceResult: vi
      .fn()
      .mockResolvedValueOnce('yalla-result-id')
      .mockResolvedValueOnce('drive-result-id'),
    updateSourceResult: vi.fn().mockResolvedValue(undefined),
    now: vi.fn<() => Date>().mockReturnValue(STARTED_ON),
    correlationId: vi.fn().mockReturnValue('run-correlation-id'),
  };
}

describe('prepareMultiSourceScrape', () => {
  it('creates one shared Run and one queued result for each selected source', async () => {
    const deps = dependencies();

    await expect(
      prepareMultiSourceScrape(
        { request: REQUEST, sources: ['YallaMotor', 'DriveArabia'] },
        deps,
      ),
    ).resolves.toEqual({
      runId: 'run-id',
      runCorrelationId: 'run-correlation-id',
      startedOn: STARTED_ON,
      request: REQUEST,
      sources: [
        {
          id: 'yalla-result-id',
          source: 'YallaMotor',
          attemptNumber: 1,
          resultCorrelationId: 'run-correlation-id:yallamotor:1',
        },
        {
          id: 'drive-result-id',
          source: 'DriveArabia',
          attemptNumber: 1,
          resultCorrelationId: 'run-correlation-id:drivearabia:1',
        },
      ],
    });

    expect(deps.createRun).toHaveBeenCalledWith({
      name: 'Scrape - Multi-source - MG 5 STD 2026',
      correlationId: 'run-correlation-id',
      missingVehicleRequestId: REQUEST.id,
      overallStatusValue: 2,
      triggerTypeValue: 1,
      startedOn: STARTED_ON,
      requestedSourceCount: 2,
    });
    expect(deps.createSourceResult).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        name: 'YallaMotor - MG 5 STD 2026',
        scrapeRunId: 'run-id',
        resultCorrelationId: 'run-correlation-id:yallamotor:1',
        sourceValue: 1,
        transportValue: 1,
        processingStatusValue: 1,
        priceTypeValue: 1,
        attemptNumber: 1,
      }),
    );
    expect(deps.createSourceResult).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        name: 'DriveArabia - MG 5 STD 2026',
        resultCorrelationId: 'run-correlation-id:drivearabia:1',
        sourceValue: 2,
        transportValue: 3,
        processingStatusValue: 1,
        priceTypeValue: 2,
      }),
    );
  });

  it('de-duplicates selected sources before creating the Run', async () => {
    const deps = dependencies();
    const result = await prepareMultiSourceScrape(
      { request: REQUEST, sources: ['YallaMotor', 'YallaMotor'] },
      deps,
    );

    expect(result.sources).toHaveLength(1);
    expect(deps.createRun).toHaveBeenCalledWith(
      expect.objectContaining({ requestedSourceCount: 1 }),
    );
    expect(deps.createSourceResult).toHaveBeenCalledOnce();
  });

  it('supports a Retry Run without changing the evidence contract', async () => {
    const deps = dependencies();
    await prepareMultiSourceScrape(
      {
        request: REQUEST,
        sources: ['DriveArabia'],
        trigger: 'Retry',
        attemptNumber: 2,
      },
      deps,
    );

    expect(deps.createRun).toHaveBeenCalledWith(
      expect.objectContaining({ triggerTypeValue: 3, requestedSourceCount: 1 }),
    );
    expect(deps.createSourceResult).toHaveBeenCalledWith(
      expect.objectContaining({
        attemptNumber: 2,
        resultCorrelationId: 'run-correlation-id:drivearabia:2',
      }),
    );
  });

  it('fails a partially prepared Run and skips existing queued targets', async () => {
    const deps = dependencies();
    deps.now.mockReturnValueOnce(STARTED_ON).mockReturnValueOnce(FAILED_ON);
    deps.createSourceResult
      .mockReset()
      .mockResolvedValueOnce('yalla-result-id')
      .mockRejectedValueOnce(new Error('Drive result rejected'));

    await expect(
      prepareMultiSourceScrape(
        { request: REQUEST, sources: ['YallaMotor', 'DriveArabia'] },
        deps,
      ),
    ).rejects.toThrow('Unable to prepare DriveArabia evidence: Drive result rejected');

    expect(deps.updateSourceResult).toHaveBeenCalledWith(
      'yalla-result-id',
      expect.objectContaining({
        processingStatusValue: 7,
        completedOn: FAILED_ON,
        errorCode: 'ORCHESTRATION_SETUP_FAILED',
      }),
    );
    expect(deps.updateRun).toHaveBeenCalledWith('run-id', {
      overallStatusValue: 5,
      completedOn: FAILED_ON,
      successfulSourceCount: 0,
      failedSourceCount: 2,
      errorSummary: 'Unable to prepare DriveArabia evidence: Drive result rejected',
    });
  });

  it('does not create evidence when Run creation fails', async () => {
    const deps = dependencies();
    deps.createRun.mockRejectedValue(new Error('Run rejected'));

    await expect(
      prepareMultiSourceScrape({ request: REQUEST, sources: ['YallaMotor'] }, deps),
    ).rejects.toThrow('Run rejected');
    expect(deps.createSourceResult).not.toHaveBeenCalled();
  });

  it('rejects empty sources and invalid attempt numbers before Run creation', async () => {
    const deps = dependencies();

    await expect(
      prepareMultiSourceScrape({ request: REQUEST, sources: [] }, deps),
    ).rejects.toThrow('Select at least one scrape source');
    await expect(
      prepareMultiSourceScrape(
        { request: REQUEST, sources: ['YallaMotor'], attemptNumber: 0 },
        deps,
      ),
    ).rejects.toThrow('Attempt number must be a positive integer');
    expect(deps.createRun).not.toHaveBeenCalled();
  });
});

describe('refreshMultiSourceRun', () => {
  it('keeps a shared Run active while DriveArabia is queued', async () => {
    const updateRun = vi.fn().mockResolvedValue(undefined);
    const results = [
      {
        source: 'YallaMotor',
        sourceValue: 1,
        attemptNumber: 1,
        processingStatus: 'Succeeded',
        processingStatusValue: 3,
      },
      {
        source: 'DriveArabia',
        sourceValue: 2,
        attemptNumber: 1,
        processingStatus: 'Queued',
        processingStatusValue: 1,
      },
    ] as VehicleScrapeSourceResult[];

    await expect(
      refreshMultiSourceRun('run-id', 2, {
        getSourceResults: vi.fn().mockResolvedValue(results),
        updateRun,
      }),
    ).resolves.toMatchObject({ overallStatusValue: 2, successfulSourceCount: 1 });
    expect(updateRun).toHaveBeenCalledWith('run-id', {
      overallStatusValue: 2,
      successfulSourceCount: 1,
      failedSourceCount: 0,
      errorSummary: null,
    });
  });

  it('writes Completed On only after every selected source is terminal', async () => {
    const completedOn = new Date('2026-08-20T10:00:05.000Z');
    const updateRun = vi.fn().mockResolvedValue(undefined);
    const results = [
      {
        source: 'YallaMotor',
        sourceValue: 1,
        attemptNumber: 1,
        processingStatus: 'Succeeded',
        processingStatusValue: 3,
      },
    ] as VehicleScrapeSourceResult[];

    await refreshMultiSourceRun('run-id', 1, {
      getSourceResults: vi.fn().mockResolvedValue(results),
      updateRun,
      now: () => completedOn,
    });
    expect(updateRun).toHaveBeenCalledWith('run-id', {
      overallStatusValue: 4,
      successfulSourceCount: 1,
      failedSourceCount: 0,
      errorSummary: null,
      completedOn,
    });
  });
});

describe('resolvePreparedDriveArabiaTarget', () => {
  const RUN = {
    id: 'run-id',
    correlationId: 'run-correlation-id',
    missingVehicleRequestId: REQUEST.id,
    overallStatusValue: 2,
    requestedSourceCount: 2,
  } as VehicleScrapeRun;
  const DRIVE_TARGET = {
    id: 'drive-result-id',
    scrapeRunId: RUN.id,
    resultCorrelationId: 'run-correlation-id:drivearabia:1',
    sourceValue: 2,
    attemptNumber: 1,
    processingStatusValue: 1,
  } as VehicleScrapeSourceResult;

  it('resolves only the exact active Run and queued DriveArabia attempt', async () => {
    await expect(
      resolvePreparedDriveArabiaTarget(
        REQUEST.id,
        { runCorrelationId: RUN.correlationId, attemptNumber: 1 },
        {
          getRunByCorrelationId: vi.fn().mockResolvedValue(RUN),
          getSourceResults: vi.fn().mockResolvedValue([DRIVE_TARGET]),
        },
      ),
    ).resolves.toEqual({
      runId: RUN.id,
      runCorrelationId: RUN.correlationId,
      sourceResultId: DRIVE_TARGET.id,
      requestedSourceCount: 2,
      attemptNumber: 1,
    });
  });

  it('returns null instead of guessing when Run or result correlation differs', async () => {
    const getSourceResults = vi.fn().mockResolvedValue([
      { ...DRIVE_TARGET, resultCorrelationId: 'different:drivearabia:1' },
    ]);

    await expect(
      resolvePreparedDriveArabiaTarget(
        REQUEST.id,
        { runCorrelationId: RUN.correlationId, attemptNumber: 1 },
        { getRunByCorrelationId: vi.fn().mockResolvedValue(RUN), getSourceResults },
      ),
    ).resolves.toBeNull();
    await expect(
      resolvePreparedDriveArabiaTarget(
        REQUEST.id,
        { runCorrelationId: 'unknown-run', attemptNumber: 1 },
        { getRunByCorrelationId: vi.fn().mockResolvedValue(null), getSourceResults },
      ),
    ).resolves.toBeNull();
  });

  it('rejects a correlated Run owned by a different missing vehicle request', async () => {
    const getSourceResults = vi.fn().mockResolvedValue([DRIVE_TARGET]);

    await expect(
      resolvePreparedDriveArabiaTarget(
        REQUEST.id,
        { runCorrelationId: RUN.correlationId, attemptNumber: 1 },
        {
          getRunByCorrelationId: vi.fn().mockResolvedValue({
            ...RUN,
            missingVehicleRequestId: 'different-request-id',
          }),
          getSourceResults,
        },
      ),
    ).resolves.toBeNull();
    expect(getSourceResults).not.toHaveBeenCalled();
  });
});
