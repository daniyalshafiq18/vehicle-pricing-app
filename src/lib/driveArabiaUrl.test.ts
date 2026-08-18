import { describe, expect, it } from 'vitest';
import { buildDriveArabiaModelYearUrl } from '@lib/driveArabiaUrl';

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
