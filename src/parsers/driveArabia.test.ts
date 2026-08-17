import { describe, it, expect } from 'vitest';
import {
  extractDriveArabiaPriceRows,
  extractDriveArabiaSpecs,
  extractDriveArabiaTrimPrices,
} from './driveArabia';
// Real view-source captures (2026-08-07): Toyota Camry model landing page + a trim detail page.
import pricesHtml from '../../tests/fixtures/drivearabia-camry-prices.html?raw';
import padPricesHtml from '../../tests/fixtures/drivearabia-camry-prices-pad.html?raw';
import trimHtml from '../../tests/fixtures/drivearabia-camry-trim.html?raw';
// Real PAD capture (2026-08-12): the per-model-year page for the 2024 Camry.
import pad2024Html from '../../tests/fixtures/drivearabia-camry-2024-pad.html?raw';

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

describe('extractDriveArabiaTrimPrices (PAD per-model-year page)', () => {
  const rows = extractDriveArabiaTrimPrices(pad2024Html);

  it('extracts every trim from the real 2024 PAD fixture', () => {
    expect(rows).toEqual([
      { year: 2024, trim: '2.5L I4 SE FWD', minPrice: 111900, maxPrice: 112000 },
      { year: 2024, trim: '3.5L V6 40th Anniversary FWD', minPrice: 133900, maxPrice: 134000 },
      { year: 2024, trim: '3.5L V6 Sport FWD', minPrice: 130000, maxPrice: 138900 },
      { year: 2024, trim: '2.5H I4 Limited FWD', minPrice: 142900, maxPrice: 143000 },
    ]);
  });

  it('uses the table heading rather than the earlier navigation label', () => {
    expect(rows[0]?.trim).toBe('2.5L I4 SE FWD');
    expect(rows.every((row) => row.trim.length <= 60)).toBe(true);
  });

  it('supports common non-FWD drivetrain labels and de-duplicates trims', () => {
    const html = `
      <title>Example 2026 Price in UAE</title>
      <h2>Original Trim Prices</h2>
      <div>Base AWD AED 100,000 - 110,000</div>
      <div>Sport RWD AED 120,000 – 125,000</div>
      <div>Trail 4WD AED 130,000 — 135,000</div>
      <div>Trail 4WD AED 130,000 - 135,000</div>
      <div>Contact Dealer</div>
      <div>Related AWD AED 1 - 999,999</div>
    `;

    expect(extractDriveArabiaTrimPrices(html)).toEqual([
      { year: 2026, trim: 'Base AWD', minPrice: 100000, maxPrice: 110000 },
      { year: 2026, trim: 'Sport RWD', minPrice: 120000, maxPrice: 125000 },
      { year: 2026, trim: 'Trail 4WD', minPrice: 130000, maxPrice: 135000 },
    ]);
  });

  it('returns [] when the year or trim-table heading is missing', () => {
    expect(
      extractDriveArabiaTrimPrices('<h2>Original Trim Prices</h2> Base AWD AED 1 - 2'),
    ).toEqual([]);
    expect(extractDriveArabiaTrimPrices('<title>Example 2026 Price in UAE</title>')).toEqual([]);
  });
});

describe('extractDriveArabiaSpecs (trim detail page)', () => {
  it('prefers the selected Product/Vehicle JSON-LD over unrelated visible copy', () => {
    const s = extractDriveArabiaSpecs(trimHtml);
    expect(s).toMatchObject({
      trim: 'XLE',
      year: 2026,
      bodyType: 'Sedan',
      fuelType: 'Petrol',
      doors: '4',
      countryOfOrigin: 'Japan',
    });
  });

  it('reads horsepower and torque', () => {
    const s = extractDriveArabiaSpecs(trimHtml);
    expect(s.horsepower).toBe(201);
    expect(s.torqueNm).toBe(240);
  });

  it('never throws on empty / missing input', () => {
    expect(extractDriveArabiaSpecs('')).toEqual({});
  });

  it('extracts exact selected-trim specs from the real 2024 PAD capture', () => {
    expect(extractDriveArabiaSpecs(pad2024Html)).toMatchObject({
      trim: '2.5L I4 SE FWD',
      year: 2024,
      bodyType: 'Sedan',
      fuelType: 'Petrol',
      transmission: 'Automatic',
      driveType: 'FWD',
      cylinders: '4',
      engineSize: '2500',
      doors: '4',
      horsepower: 204,
      torqueNm: 243,
      countryOfOrigin: 'Japan',
    });
  });
});
