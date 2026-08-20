import { describe, expect, it, vi } from 'vitest';
import { persistDriveArabiaEvidence } from './driveArabiaDualWrite';

const INPUT = {
  request: {
    id: '11111111-1111-f011-a111-111111111111',
    make: 'Toyota',
    model: 'Camry',
    trim: '2.5L I4 SE FWD',
    modelYear: 2024,
    bodyType: 'Sedan',
  },
  inboxId: 'pad-inbox-123',
  sourceUrl: 'https://www.drivearabia.com/carprices/uae/toyota/toyota-camry/2024/',
  minimumPrice: 111900,
  maximumPrice: 112000,
  specs: {
    trim: '2.5L I4 SE FWD',
    year: 2024,
    bodyType: 'Sedan',
    engineSize: '2500',
    cylinders: '4',
    fuelType: 'Petrol',
    transmission: 'Automatic',
    driveType: 'FWD',
    horsepower: 204,
    doors: '4',
    countryOfOrigin: 'Japan',
    torqueNm: 243,
  },
};

const STARTED_ON = new Date('2026-08-20T09:00:00.000Z');
const COMPLETED_ON = new Date('2026-08-20T09:00:02.000Z');
const RUN_ID = '22222222-2222-f011-a222-222222222222';

function dependencies() {
  return {
    createRun: vi.fn().mockResolvedValue(RUN_ID),
    createSourceResult: vi.fn().mockResolvedValue('source-result-id'),
    updateRun: vi.fn().mockResolvedValue(undefined),
    now: vi
      .fn<() => Date>()
      .mockReturnValueOnce(STARTED_ON)
      .mockReturnValueOnce(COMPLETED_ON),
    correlationId: vi.fn().mockReturnValue('run-correlation-id'),
  };
}

describe('persistDriveArabiaEvidence', () => {
  it('creates a completed PAD Run and Original Reference Source Result', async () => {
    const deps = dependencies();

    await expect(persistDriveArabiaEvidence(INPUT, deps)).resolves.toBeUndefined();

    expect(deps.createRun).toHaveBeenCalledWith({
      name: 'Scrape - DriveArabia - Toyota Camry 2.5L I4 SE FWD 2024',
      correlationId: 'run-correlation-id',
      missingVehicleRequestId: INPUT.request.id,
      overallStatusValue: 2,
      triggerTypeValue: 2,
      startedOn: STARTED_ON,
      requestedSourceCount: 1,
      batchCorrelationKey: INPUT.inboxId,
    });
    const sourceResult = deps.createSourceResult.mock.calls[0]![0];
    expect(sourceResult).toMatchObject({
      name: 'DriveArabia - Toyota Camry 2.5L I4 SE FWD 2024',
      resultCorrelationId: 'run-correlation-id:drivearabia:1',
      scrapeRunId: RUN_ID,
      attemptNumber: 1,
      sourceValue: 2,
      transportValue: 3,
      processingStatusValue: 3,
      priceTypeValue: 2,
      listingCount: 1,
      minimumPrice: 111900,
      maximumPrice: 112000,
      engineSize: 2500,
      cylinders: 4,
      horsepower: 204,
      countryOfOrigin: 'Japan',
      torqueNm: 243,
      inboxId: INPUT.inboxId,
    });
    expect(JSON.parse(sourceResult.normalizedDetailsJson ?? '{}')).toMatchObject({
      trim: INPUT.request.trim,
      engineSize: 2500,
      horsepower: 204,
    });
    expect(JSON.parse(sourceResult.rawResultJson ?? '{}')).toMatchObject({
      source: 'DriveArabia',
      transport: 'pad',
      inboxId: INPUT.inboxId,
      minPrice: 111900,
      maxPrice: 112000,
    });
    expect(sourceResult.rawResultJson).not.toContain('<html');
    expect(deps.updateRun).toHaveBeenCalledWith(RUN_ID, {
      overallStatusValue: 4,
      completedOn: COMPLETED_ON,
      successfulSourceCount: 1,
      failedSourceCount: 0,
      errorSummary: null,
    });
  });

  it('returns a warning when Run creation fails', async () => {
    const deps = dependencies();
    deps.createRun.mockRejectedValue(new Error('403 table permission'));

    await expect(persistDriveArabiaEvidence(INPUT, deps)).resolves.toBe(
      'Vehicle Scrape Run creation failed: 403 table permission',
    );
    expect(deps.createSourceResult).not.toHaveBeenCalled();
  });

  it('marks the Run failed and caps a rejected Source Result diagnostic', async () => {
    const deps = dependencies();
    deps.createSourceResult.mockRejectedValue(new Error('x'.repeat(2500)));

    const warning = await persistDriveArabiaEvidence(INPUT, deps);

    expect(warning).toHaveLength(2000);
    expect(deps.updateRun).toHaveBeenCalledWith(
      RUN_ID,
      expect.objectContaining({
        overallStatusValue: 5,
        successfulSourceCount: 0,
        failedSourceCount: 1,
        errorSummary: warning,
      }),
    );
  });
});
