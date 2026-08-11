import { describe, it, expect } from 'vitest';
import { extractDriveArabiaPriceRows, extractDriveArabiaSpecs } from './driveArabia';
// Real view-source captures (2026-08-07): Toyota Camry model landing page + a trim detail page.
import pricesHtml from '../../tests/fixtures/drivearabia-camry-prices.html?raw';
import padPricesHtml from '../../tests/fixtures/drivearabia-camry-prices-pad.html?raw';
import trimHtml from '../../tests/fixtures/drivearabia-camry-trim.html?raw';

describe('extractDriveArabiaPriceRows (model landing page)', () => {
  const rows = extractDriveArabiaPriceRows(pricesHtml);

  it('extracts the serialized React trim/price pairs', () => {
    expect(rows.length).toBe(21);
  });

  it('assigns each price pair to its model-year marker (2025 and 2024 present)', () => {
    const years = [...new Set(rows.map((r) => r.year))].sort();
    expect(years).toEqual([2024, 2025]);
  });

  it('parses a known 2025 trim to its numeric AED range', () => {
    const row = rows.find((r) => r.trim === '2.5L I4 E FWD');
    expect(row).toBeDefined();
    expect(row && row.minPrice).toBe(109900);
    expect(row && row.maxPrice).toBe(110000);
  });

  it('guards the 3.5L V6 Sport FWD glitch (data has max<min) so it degrades safely', () => {
    const glitch = rows.find((r) => r.trim === '3.5L V6 Sport FWD');
    expect(glitch).toBeDefined();
    expect(glitch && glitch.minPrice).toBe(130000);
    expect(glitch && glitch.maxPrice).toBe(138900);
  });

  it('never emits a row where maxPrice < minPrice', () => {
    expect(rows.every((r) => r.maxPrice >= r.minPrice)).toBe(true);
  });

  it('returns [] for empty / missing input (never throws)', () => {
    expect(extractDriveArabiaPriceRows('')).toEqual([]);
  });
});

describe('extractDriveArabiaPriceRows (PAD capture 2026-08-11 — real-browser route)', () => {
  // Fixture rule (§8): raw outerHTML captured through the Power Automate Desktop
  // flow on the user's residential IP, pinned verbatim as the PAD-capture fixture.
  const rows = extractDriveArabiaPriceRows(padPricesHtml);

  it('extracts the same 21 trim/price pairs as the reference fixture', () => {
    expect(rows.length).toBe(21);
  });

  it('assigns the pairs to the same model years (2024 and 2025)', () => {
    const years = [...new Set(rows.map((r) => r.year))].sort();
    expect(years).toEqual([2024, 2025]);
  });

  it('parses the known 2025 trim to the same numeric AED range', () => {
    const row = rows.find((r) => r.trim === '2.5L I4 E FWD');
    expect(row).toBeDefined();
    expect(row && row.minPrice).toBe(109900);
    expect(row && row.maxPrice).toBe(110000);
  });

  it('guards the live max<min data glitch (raw "AED 138,900 - 130,000") safely', () => {
    expect(rows.some((r) => r.minPrice === 130000 && r.maxPrice === 138900)).toBe(true);
    expect(rows.every((r) => r.maxPrice >= r.minPrice)).toBe(true);
  });
});

describe('extractDriveArabiaSpecs (trim detail page)', () => {
  it('reads fuel / drive / transmission from the visible DOM text', () => {
    const s = extractDriveArabiaSpecs(trimHtml);
    expect(s.fuelType).toBe('Hybrid');
    expect(s.driveType).toBe('FWD');
    expect(s.transmission).toBe('8A');
  });

  it('reads horsepower and torque', () => {
    const s = extractDriveArabiaSpecs(trimHtml);
    expect(s.horsepower).toBe(201);
    expect(s.torqueNm).toBe(240);
  });

  it('never throws on empty / missing input', () => {
    expect(extractDriveArabiaSpecs('')).toEqual({});
  });
});