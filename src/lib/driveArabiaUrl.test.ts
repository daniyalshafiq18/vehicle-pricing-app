import { describe, expect, it } from 'vitest';
import {
  buildCorrelatedDriveArabiaPadUrl,
  buildDriveArabiaModelYearUrl,
  cleanDriveArabiaSourceUrl,
  parseDriveArabiaPadCorrelation,
} from '@lib/driveArabiaUrl';

describe('buildDriveArabiaModelYearUrl', () => {
  it.each([
    [
      { make: 'Toyota', model: 'Camry', year: 2024 },
      'https://www.drivearabia.com/carprices/uae/toyota/camry/2024/',
    ],
    [
      { make: 'Land Rover', model: 'Range Rover Sport', year: 2015 },
      'https://www.drivearabia.com/carprices/uae/land-rover/range-rover-sport/2015/',
    ],
    [
      { make: 'Mercedes-Benz', model: 'C-Class', year: 2026 },
      'https://www.drivearabia.com/carprices/uae/mercedes-benz/c-class/2026/',
    ],
  ])('builds the short route for %o', (params, expected) => {
    expect(buildDriveArabiaModelYearUrl(params)).toBe(expected);
  });

  it('rejects incomplete or invalid request identity', () => {
    expect(() => buildDriveArabiaModelYearUrl({ make: '', model: 'Camry', year: 2024 })).toThrow(
      'A valid make, model, and model year are required',
    );
    expect(() => buildDriveArabiaModelYearUrl({ make: 'Toyota', model: 'Camry', year: 0 })).toThrow(
      'A valid make, model, and model year are required',
    );
  });
});

describe('DriveArabia PAD correlation', () => {
  it('builds a non-secret Run marker without changing the vehicle path', () => {
    const url = buildCorrelatedDriveArabiaPadUrl(
      { make: 'MG', model: '5', year: 2026 },
      { runCorrelationId: 'run-correlation-id', attemptNumber: 1 },
    );

    expect(url).toBe(
      'https://www.drivearabia.com/carprices/uae/mg/5/2026/#vpiRun=run-correlation-id&vpiAttempt=1',
    );
    expect(parseDriveArabiaPadCorrelation(url)).toEqual({
      runCorrelationId: 'run-correlation-id',
      attemptNumber: 1,
    });
  });

  it('reads correlation after DriveArabia redirects to a canonical path', () => {
    expect(
      parseDriveArabiaPadCorrelation(
        'https://www.drivearabia.com/carprices/uae/mg/mg-5/2026/#vpiRun=abc-123&vpiAttempt=2',
      ),
    ).toEqual({ runCorrelationId: 'abc-123', attemptNumber: 2 });
  });

  it('strips internal keys while preserving unrelated fragments', () => {
    expect(
      cleanDriveArabiaSourceUrl(
        'https://www.drivearabia.com/carprices/uae/mg/mg-5/2026/#section=specs&vpiRun=abc&vpiAttempt=1',
      ),
    ).toBe('https://www.drivearabia.com/carprices/uae/mg/mg-5/2026/#section=specs');
  });

  it('rejects missing or malformed correlation values', () => {
    expect(parseDriveArabiaPadCorrelation('https://www.drivearabia.com/')).toBeNull();
    expect(
      parseDriveArabiaPadCorrelation(
        'https://www.drivearabia.com/#vpiRun=abc&vpiAttempt=0',
      ),
    ).toBeNull();
    expect(() =>
      buildCorrelatedDriveArabiaPadUrl(
        { make: 'MG', model: '5', year: 2026 },
        { runCorrelationId: '', attemptNumber: 1 },
      ),
    ).toThrow('A Run correlation ID and positive attempt number are required');
  });
});
