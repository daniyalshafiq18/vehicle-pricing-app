import { describe, expect, it, vi } from 'vitest';
import type { VehicleScrapeSourceResult } from '@types';
import type { TransportedResponse } from './azureYallaMotorScraper';
import {
  scrapeYallaMotorIntoPreparedTarget,
  scrapeYallaMotorWithDualWrite,
} from './yallaMotorDualWrite';

const PARAMS = {
  id: '11111111-1111-4111-8111-111111111111',
  make: 'Jeep',
  model: 'Wrangler',
  trim: '3.6L Automatic',
  year: 2021,
};
const RUN_ID = '22222222-2222-4222-8222-222222222222';
const STARTED_ON = new Date('2026-08-19T10:00:00.000Z');
const COMPLETED_ON = new Date('2026-08-19T10:00:05.000Z');

const SUCCESS: TransportedResponse = {
  success: true,
  transport: 'azure',
  make: PARAMS.make,
  model: PARAMS.model,
  trim: PARAMS.trim,
  year: PARAMS.year,
  count: 3,
  minPrice: 93000,
  maxPrice: 129000,
  heading: '3 listings',
  sourceUrl:
    'https://uae.yallamotor.com/used-cars/jeep/wrangler/vr_3-6l-automatic/yr_2021_2021',
  bodyType: 'SUV / Crossover',
  fuelType: 'Petrol',
  transmission: 'Automatic',
  driveType: 'AWD',
  cylinders: '6',
  engineSize: '3600',
  doors: '4',
  mileage: '123000',
  regionalSpecs: 'GCC Specs',
};

function dependencies(result: TransportedResponse = SUCCESS) {
  return {
    scrape: vi.fn().mockResolvedValue(result),
    updateLegacy: vi.fn().mockResolvedValue(undefined),
    createRun: vi.fn().mockResolvedValue(RUN_ID),
    createSourceResult: vi.fn().mockResolvedValue('source-result-id'),
    updateSourceResult: vi.fn().mockResolvedValue(undefined),
    getSourceResults: vi.fn().mockResolvedValue([]),
    updateRun: vi.fn().mockResolvedValue(undefined),
    now: vi
      .fn<() => Date>()
      .mockReturnValueOnce(STARTED_ON)
      .mockReturnValueOnce(COMPLETED_ON),
    correlationId: vi.fn().mockReturnValue('run-correlation-id'),
  };
}

describe('scrapeYallaMotorWithDualWrite', () => {
  it('preserves the legacy MVR write and stores a completed YallaMotor result', async () => {
    const deps = dependencies();

    await expect(scrapeYallaMotorWithDualWrite(PARAMS, deps)).resolves.toMatchObject({
      success: true,
      count: 3,
      transport: 'azure',
    });

    expect(deps.createRun).toHaveBeenCalledWith({
      name: 'Scrape - Jeep Wrangler 3.6L Automatic 2021',
      correlationId: 'run-correlation-id',
      missingVehicleRequestId: PARAMS.id,
      overallStatusValue: 2,
      triggerTypeValue: 1,
      startedOn: STARTED_ON,
      requestedSourceCount: 1,
    });
    expect(deps.updateLegacy).toHaveBeenCalledWith(
      PARAMS.id,
      expect.objectContaining({
        scrapedMinPrice: 93000,
        scrapedMaxPrice: 129000,
        scrapedSources: SUCCESS.success ? SUCCESS.sourceUrl : '',
        scrapeStatusValue: 4,
        bodyTypeValue: 57,
        fuelTypeValue: 1,
        transmissionValue: 1,
        driveTypeValue: 2,
        cylindersValue: 4,
        engineSizeValue: 3600,
        doorsValue: 4,
        categoryValue: 1,
        mileageValue: 123000,
      }),
    );
    expect(deps.createSourceResult).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'YallaMotor - Jeep Wrangler 3.6L Automatic 2021',
        resultCorrelationId: 'run-correlation-id:yallamotor:1',
        scrapeRunId: RUN_ID,
        attemptNumber: 1,
        sourceValue: 1,
        transportValue: 1,
        processingStatusValue: 3,
        priceTypeValue: 1,
        listingCount: 3,
        minimumPrice: 93000,
        maximumPrice: 129000,
        engineSize: 3600,
        cylinders: 6,
        category: 'GCC',
      }),
    );
    expect(deps.updateRun).toHaveBeenCalledWith(RUN_ID, {
      overallStatusValue: 4,
      completedOn: COMPLETED_ON,
      successfulSourceCount: 1,
      failedSourceCount: 0,
      errorSummary: null,
    });
  });

  it('uses the MVR category mapper while preserving the raw regional-spec text', async () => {
    const deps = dependencies({ ...SUCCESS, regionalSpecs: 'american specs' });

    await scrapeYallaMotorWithDualWrite(PARAMS, deps);

    const sourceResult = deps.createSourceResult.mock.calls[0]![0];
    expect(sourceResult.category).toBe('NON-GCC');
    expect(JSON.parse(sourceResult.normalizedDetailsJson ?? '{}')).toMatchObject({
      category: 'NON-GCC',
    });
    expect(JSON.parse(sourceResult.rawResultJson ?? '{}')).toMatchObject({
      regionalSpecs: 'american specs',
    });
  });

  it('keeps a successful legacy scrape when Run creation fails', async () => {
    const deps = dependencies();
    deps.createRun.mockRejectedValue(new Error('403 table permission'));

    const result = await scrapeYallaMotorWithDualWrite(PARAMS, deps);

    expect(deps.updateLegacy).toHaveBeenCalledOnce();
    expect(deps.createSourceResult).not.toHaveBeenCalled();
    expect(result.evidenceWarning).toBe(
      'Vehicle Scrape Run creation failed: 403 table permission',
    );
  });

  it('keeps a successful legacy scrape and marks the Run failed when result storage fails', async () => {
    const deps = dependencies();
    deps.createSourceResult.mockRejectedValue(new Error('result rejected'));

    const result = await scrapeYallaMotorWithDualWrite(PARAMS, deps);

    expect(deps.updateLegacy).toHaveBeenCalledOnce();
    expect(result.evidenceWarning).toBe('Source Result write failed: result rejected');
    expect(deps.updateRun).toHaveBeenCalledWith(
      RUN_ID,
      expect.objectContaining({
        overallStatusValue: 5,
        successfulSourceCount: 0,
        failedSourceCount: 1,
        errorSummary: 'Source Result write failed: result rejected',
      }),
    );
  });

  it('caps detailed Source Result errors before finalizing a failed Run', async () => {
    const deps = dependencies();
    deps.createSourceResult.mockRejectedValue(new Error('x'.repeat(2500)));

    const result = await scrapeYallaMotorWithDualWrite(PARAMS, deps);
    const warning = result.evidenceWarning ?? '';
    const finalization = deps.updateRun.mock.calls[0]![1];

    expect(warning).toHaveLength(2000);
    expect(warning).toBe(finalization.errorSummary);
    expect(finalization).toMatchObject({
      overallStatusValue: 5,
      successfulSourceCount: 0,
      failedSourceCount: 1,
    });
  });

  it('records a failed source attempt and preserves the existing failed MVR behavior', async () => {
    const deps = dependencies({
      success: false,
      transport: 'flow3',
      error: 'Failed to fetch',
      url: 'https://uae.yallamotor.com/used-cars/jeep/wrangler',
      statusCode: '503',
    });

    await expect(scrapeYallaMotorWithDualWrite(PARAMS, deps)).rejects.toThrow(
      'Failed to fetch',
    );

    expect(deps.updateLegacy).toHaveBeenCalledWith(
      PARAMS.id,
      expect.objectContaining({ scrapeStatusValue: 5 }),
    );
    expect(deps.createSourceResult).toHaveBeenCalledWith(
      expect.objectContaining({
        transportValue: 2,
        processingStatusValue: 6,
        httpStatusCode: 503,
        errorCode: '503',
        errorMessage: 'Failed to fetch',
      }),
    );
    expect(deps.updateRun).toHaveBeenCalledWith(
      RUN_ID,
      expect.objectContaining({ overallStatusValue: 5, failedSourceCount: 1 }),
    );
  });

  it('records an unavailable result as Blocked and keeps the MVR Unreachable status', async () => {
    const deps = dependencies({
      ...SUCCESS,
      count: 0,
      minPrice: 0,
      maxPrice: 0,
      sourceUrl: '',
      _unavailable: true,
      transport: 'flow3',
    });

    await expect(scrapeYallaMotorWithDualWrite(PARAMS, deps)).rejects.toThrow(
      'YallaMotor is currently unreachable',
    );

    expect(deps.updateLegacy).toHaveBeenCalledWith(
      PARAMS.id,
      expect.objectContaining({ scrapeStatusValue: 6 }),
    );
    expect(deps.createSourceResult).toHaveBeenCalledWith(
      expect.objectContaining({
        transportValue: 2,
        processingStatusValue: 5,
        errorCode: 'YALLAMOTOR_UNAVAILABLE',
      }),
    );
  });
});

describe('scrapeYallaMotorIntoPreparedTarget', () => {
  it('updates the queued target and keeps the shared Run active for DriveArabia', async () => {
    const deps = dependencies();
    deps.getSourceResults.mockResolvedValue([
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
    ] as VehicleScrapeSourceResult[]);

    await expect(
      scrapeYallaMotorIntoPreparedTarget(
        PARAMS,
        {
          runId: RUN_ID,
          runCorrelationId: 'shared-run-correlation',
          sourceResultId: 'prepared-yalla-result-id',
          requestedSourceCount: 2,
        },
        deps,
      ),
    ).resolves.toMatchObject({ success: true, count: 3, transport: 'azure' });

    expect(deps.createRun).not.toHaveBeenCalled();
    expect(deps.createSourceResult).not.toHaveBeenCalled();
    expect(deps.updateSourceResult).toHaveBeenNthCalledWith(1, 'prepared-yalla-result-id', {
      processingStatusValue: 2,
      startedOn: STARTED_ON,
      errorCode: null,
      errorMessage: null,
    });
    expect(deps.updateSourceResult).toHaveBeenNthCalledWith(
      2,
      'prepared-yalla-result-id',
      expect.objectContaining({
        processingStatusValue: 3,
        transportValue: 1,
        minimumPrice: 93000,
        maximumPrice: 129000,
        completedOn: COMPLETED_ON,
      }),
    );
    expect(deps.updateSourceResult.mock.calls[1]![1]).not.toHaveProperty(
      'resultCorrelationId',
    );
    expect(deps.updateLegacy).toHaveBeenCalledOnce();
    expect(deps.updateRun).toHaveBeenCalledWith(RUN_ID, {
      overallStatusValue: 2,
      successfulSourceCount: 1,
      failedSourceCount: 0,
      errorSummary: null,
    });
  });

  it('does not scrape when the queued target cannot enter Running', async () => {
    const deps = dependencies();
    deps.updateSourceResult.mockRejectedValueOnce(new Error('PATCH rejected'));

    await expect(
      scrapeYallaMotorIntoPreparedTarget(
        PARAMS,
        {
          runId: RUN_ID,
          runCorrelationId: 'shared-run-correlation',
          sourceResultId: 'prepared-yalla-result-id',
          requestedSourceCount: 2,
        },
        deps,
      ),
    ).rejects.toThrow('Unable to start YallaMotor evidence: PATCH rejected');
    expect(deps.scrape).not.toHaveBeenCalled();
    expect(deps.updateLegacy).not.toHaveBeenCalled();
  });
});
