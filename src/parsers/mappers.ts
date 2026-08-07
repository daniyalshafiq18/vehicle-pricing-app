/**
 * Value mappers from YallaMotor labels/URLs to the labels Dataverse option sets
 * understand. Extracted from `useTriggerScrape.ts` so they are unit-testable.
 * Each returns the *label* (not the integer) — `normalize.ts` turns the label
 * into the option-set value against `@data/dataverseOptionSets`.
 */

import { DOORS, SEATS } from '@data/dataverseOptionSets';

/** Normalise a drive-type schema URL to the short label Dataverse recognises. */
export function mapDriveType(driveType: string): string | undefined {
  const url = driveType.toLowerCase();
  if (url.includes('rearwheel')) {
    return 'RWD';
  }
  if (url.includes('frontwheel')) {
    return 'FWD';
  }
  if (url.includes('allwheel')) {
    return 'AWD';
  }
  if (url.includes('4wd') || url.includes('fourwheel')) {
    return '4X4';
  }
  return undefined;
}

/**
 * Parse the listing description for regional-spec keywords → category label.
 *
 * Case-insensitive on purpose: `extractRegionalSpecs` (yallaJsonLd.ts) returns
 * lowercase generic phrases (e.g. `"american specs"`), and the label
 * `'Non-GCC'` is a separate keyword that never contains "Specs" — both were
 * missed by the old case-sensitive matching and silently dropped Category.
 */
export function mapCategory(description: string): string | undefined {
  const d = description.toLowerCase();
  if (d.includes('gcc specs')) {
    return 'GCC';
  }
  if (d.includes('non-gcc')) {
    return 'NON-GCC';
  }
  if (d.includes('not sure') || d.includes('other specs')) {
    return 'OTHER/STANDARD';
  }
  // Any other explicit spec mention → Non-GCC
  if (d.includes('specs')) {
    return 'NON-GCC';
  }
  return undefined;
}

/** Normalise a raw fuel type to a MISSING_VEHICLE_FUEL_TYPE label. */
export function mapFuelType(fuelType: string): string | undefined {
  const f = fuelType.toLowerCase();
  if (f === 'petrol') {
    return 'Petrol';
  }
  if (f === 'diesel') {
    return 'Diesel';
  }
  if (f === 'hybrid') {
    return 'Hybrid';
  }
  if (f === 'electric' || f === 'electrical') {
    return 'Electric';
  }
  return undefined;
}

/** Get the Dataverse integer value for a doors label string (e.g. "4" → 4). */
export function lookupDoorsValue(label: string): number | undefined {
  return DOORS[label];
}

/** Get the Dataverse integer value for a seats label string (e.g. "5" → 4). */
export function lookupSeatsValue(label: string): number | undefined {
  return SEATS[label];
}
