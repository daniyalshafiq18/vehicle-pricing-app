import { describe, it, expect } from 'vitest';
import { parseDetailJsonLd, parseSearchJsonLd } from './yallaJsonLd';

import pajeroBlocks from '../../tests/fixtures/yallamotor-pajero-detail.jsonld.json';
import camryBlocks from '../../tests/fixtures/yallamotor-camry-search.jsonld.json';
import wranglerBlocks from '../../tests/fixtures/yallamotor-wrangler-detail.jsonld.json';

describe('parseDetailJsonLd (Pajero detail page)', () => {
  const specs = parseDetailJsonLd(pajeroBlocks);

  it('extracts the live-verified spec values', () => {
    expect(specs.bodyType).toBe('SUV / Crossover');
    expect(specs.fuelType).toBe('Petrol');
    expect(specs.transmission).toBe('Automatic');
    expect(specs.driveType).toBe('https://schema.org/AllWheelDriveConfiguration');
  });

  it('handles the quoted-string engine and unquoted-number mileage variance', () => {
    expect(specs.engineSize).toBe('2972');
    expect(specs.mileage).toBe('130161');
    expect(specs.doors).toBe('4');
  });

  it('derives regional specs from the description and keeps price/name', () => {
    expect(specs.regionalSpecs).toBe('GCC Specs');
    expect(specs.price).toBe(52999);
    expect(specs.name).toBe('Used Mitsubishi Pajero GLS V6 2020');
  });

  it('never throws on empty input', () => {
    expect(parseDetailJsonLd([])).toEqual({});
    expect(parseDetailJsonLd(null)).toEqual({});
  });
});

describe('parseDetailJsonLd (Wrangler detail page — live Azure probe 2026-08-06)', () => {
  const specs = parseDetailJsonLd(wranglerBlocks);

  it('reproduces the Flow 3 values from the Azure probe capture', () => {
    expect(specs.bodyType).toBe('SUV / Crossover');
    expect(specs.fuelType).toBe('Petrol');
    expect(specs.transmission).toBe('Automatic');
    expect(specs.driveType).toBe('https://schema.org/AllWheelDriveConfiguration');
    expect(specs.engineSize).toBe('3600');
    expect(specs.mileage).toBe('123000');
    expect(specs.doors).toBe('4');
    expect(specs.regionalSpecs).toBe('GCC Specs');
    expect(specs.price).toBe(93000);
    expect(specs.name).toBe('Used Jeep Wrangler 3.6L Automatic 2021');
  });
});

describe('parseSearchJsonLd (Camry search page)', () => {
  const search = parseSearchJsonLd(camryBlocks);

  it('reads count / min / max from the CollectionPage description', () => {
    expect(search.count).toBe(503);
    expect(search.minPrice).toBe(120);
    expect(search.maxPrice).toBe(350000);
  });

  it('keeps the raw description as heading', () => {
    expect(search.heading).toContain('503 listings');
    expect(search.heading).toContain('1996–2026');
  });

  it('finds the first listing URL from the ItemList', () => {
    expect(search.firstListingUrl).toBe(
      'https://uae.yallamotor.com/used-cars/toyota/camry/2019/used-toyota-camry-2019-ajman-2116847',
    );
  });

  it('never throws on missing input', () => {
    expect(parseSearchJsonLd([]).count).toBe(0);
  });
});