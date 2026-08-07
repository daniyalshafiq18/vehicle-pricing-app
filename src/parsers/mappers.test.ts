import { describe, it, expect } from 'vitest';
import {
  mapDriveType,
  mapCategory,
  mapFuelType,
  lookupDoorsValue,
  lookupSeatsValue,
} from './mappers';

describe('mapDriveType', () => {
  it('maps schema.org drive URLs to short labels', () => {
    expect(mapDriveType('https://schema.org/RearWheelDriveConfiguration')).toBe('RWD');
    expect(mapDriveType('https://schema.org/FrontWheelDriveConfiguration')).toBe('FWD');
    expect(mapDriveType('https://schema.org/AllWheelDriveConfiguration')).toBe('AWD');
    expect(mapDriveType('https://schema.org/FourWheelDriveConfiguration')).toBe('4X4');
    expect(mapDriveType('4WD')).toBe('4X4');
  });

  it('returns undefined for unknown/empty input', () => {
    expect(mapDriveType('https://schema.org/Unknown')).toBeUndefined();
  });
});

describe('mapCategory', () => {
  it('maps regional-spec phrases to category labels', () => {
    expect(mapCategory('… AED 52,999, 130,161 km, Automatic, GCC Specs.')).toBe('GCC');
    expect(mapCategory('Regional Specs: Not Sure')).toBe('OTHER/STANDARD');
    expect(mapCategory('… Other Specs …')).toBe('OTHER/STANDARD');
    expect(mapCategory('… Japan Specs …')).toBe('NON-GCC');
  });

  it('handles lowercase generic spec phrases (regression: american specs → blank)', () => {
    // extractRegionalSpecs returns lowercase generic phrases for non-GCC specs.
    expect(mapCategory('… american specs …')).toBe('NON-GCC');
    expect(mapCategory('… GCC specs …')).toBe('GCC'); // lowercased input still works
    expect(mapCategory('… Other specs …')).toBe('OTHER/STANDARD');
  });

  it('maps the Non-GCC keyword (no "Specs" substring) → NON-GCC (regression)', () => {
    expect(mapCategory('Non-GCC')).toBe('NON-GCC');
  });

  it('returns undefined when no spec phrase is present', () => {
    expect(mapCategory('Just a plain listing description')).toBeUndefined();
  });
});

describe('mapFuelType', () => {
  it('maps case-insensitively to MVR fuel labels', () => {
    expect(mapFuelType('Petrol')).toBe('Petrol');
    expect(mapFuelType('DIESEL')).toBe('Diesel');
    expect(mapFuelType('hybrid')).toBe('Hybrid');
    expect(mapFuelType('Electric')).toBe('Electric');
    expect(mapFuelType('electrical')).toBe('Electric');
  });

  it('returns undefined for unknown fuels', () => {
    expect(mapFuelType('Wankel')).toBeUndefined();
  });
});

describe('lookupDoorsValue / lookupSeatsValue', () => {
  it('maps label strings to Dataverse integers', () => {
    expect(lookupDoorsValue('4')).toBe(4);
    expect(lookupDoorsValue('2')).toBe(2);
    expect(lookupSeatsValue('5')).toBe(4);
    expect(lookupSeatsValue('N/A')).toBe(29);
  });

  it('returns undefined for unmapped labels', () => {
    expect(lookupDoorsValue('9')).toBeUndefined();
    expect(lookupSeatsValue('4.5')).toBeUndefined();
  });
});