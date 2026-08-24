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
      { prepare, scrapeYallaMotor },
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
      { prepare: vi.fn().mockResolvedValue(driveOnly), scrapeYallaMotor },
    );

    expect(scrapeYallaMotor).not.toHaveBeenCalled();
    expect(result.driveArabiaPadUrl).toContain('vpiRun=shared-run');
  });
});
