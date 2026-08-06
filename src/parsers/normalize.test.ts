import { describe, it, expect } from 'vitest';
import { normalizeToDataverse } from './normalize';
import { parseDetailJsonLd } from './yallaJsonLd';
import type { DetailSpecs } from './types';

import pajeroBlocks from '../../tests/fixtures/yallamotor-pajero-detail.jsonld.json';

describe('normalizeToDataverse', () => {
  it('maps the full Pajero DetailSpecs to the exact option-set integers', () => {
    const specs = parseDetailJsonLd(pajeroBlocks);
    const n = normalizeToDataverse(specs);

    expect(n.bodyTypeValue).toBe(57); // SUV - Crossover
    expect(n.fuelTypeValue).toBe(1); // Petrol
    expect(n.transmissionValue).toBe(1); // Automatic (MVR set)
    expect(n.driveTypeValue).toBe(2); // AllWheel → AWD
    expect(n.engineSizeValue).toBe(2972);
    expect(n.doorsValue).toBe(4);
    expect(n.categoryValue).toBe(1); // GCC
    expect(n.mileageValue).toBe(130161);
    // Cylinders/Seats are not in the detail JSON-LD → omitted (undefined)
    expect(n.cylindersValue).toBeUndefined();
    expect(n.seatsValue).toBeUndefined();
  });

  it('maps cylinders and seats when provided (from the HTML-only path)', () => {
    const specs: DetailSpecs = { cylinders: '6', seats: '5', fuelType: 'Petrol' };
    const n = normalizeToDataverse(specs);
    expect(n.cylindersValue).toBe(4); // MISSING_VEHICLE_CYLINDERS["6"]
    expect(n.seatsValue).toBe(4); // SEATS["5"]
  });

  it('normalises drive/fuel labels that differ from the Dataverse labels', () => {
    const n = normalizeToDataverse({
      driveType: 'https://schema.org/RearWheelDriveConfiguration',
      fuelType: 'diesel',
      regionalSpecs: 'Not Sure',
    });
    expect(n.driveTypeValue).toBe(4); // RWD
    expect(n.fuelTypeValue).toBe(2); // Diesel (case-normalised)
    expect(n.categoryValue).toBe(3); // OTHER/STANDARD
  });

  it('omits every key when no specs are present', () => {
    expect(normalizeToDataverse({})).toEqual({
      bodyTypeValue: undefined,
      fuelTypeValue: undefined,
      transmissionValue: undefined,
      driveTypeValue: undefined,
      cylindersValue: undefined,
      engineSizeValue: undefined,
      doorsValue: undefined,
      seatsValue: undefined,
      categoryValue: undefined,
      mileageValue: undefined,
    });
  });
});