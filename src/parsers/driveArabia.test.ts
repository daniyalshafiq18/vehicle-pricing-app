import { describe, it, expect } from 'vitest';
import {
  extractDriveArabiaPriceRows,
  extractDriveArabiaSpecGroups,
  extractDriveArabiaSpecs,
  extractDriveArabiaSpecsForTrim,
  extractDriveArabiaTrimPrices,
} from './driveArabia';
// Real view-source captures (2026-08-07): Toyota Camry model landing page + a trim detail page.
import pricesHtml from '../../tests/fixtures/drivearabia-camry-prices.html?raw';
import padPricesHtml from '../../tests/fixtures/drivearabia-camry-prices-pad.html?raw';
import trimHtml from '../../tests/fixtures/drivearabia-camry-trim.html?raw';
// Real PAD capture (2026-08-12): the per-model-year page for the 2024 Camry.
import pad2024Html from '../../tests/fixtures/drivearabia-camry-2024-pad.html?raw';

export const capturedCamrySpecGroups = [
  {
    configuration: '2.5 I4 FWD',
    text: 'Engine Layout\nI4\nEngine Size\n2.5 L\nEngine Type\nPetrol\nDrive Train\nFWD\nTransmission\n8A\nHorsepower\n204 HP\nTorque\n243 Nm',
  },
  {
    configuration: '3.5 V6 FWD',
    text: 'Engine Layout\nV6\nEngine Size\n3.5 L\nEngine Type\nPetrol\nDrive Train\nFWD\nTransmission\n8A\nHorsepower\n298 HP\nTorque\n356 Nm',
  },
  {
    configuration: '2.5 H I4 FWD',
    text: 'Engine Layout\nI4\nEngine Size\n2.5 L\nEngine Type\nHybrid\nDrive Train\nFWD\nTransmission\nCVT\nHorsepower\n208 HP\nTorque\n221 Nm',
  },
];

export const multiTrimPad2024Html = `${pad2024Html}<script type="application/json" id="vpi-pad-spec-groups">${JSON.stringify(capturedCamrySpecGroups)}</script>`;

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

  it('supports older trim labels that omit drivetrain details', () => {
    const html = `
      <title>Honda Accord 2011 Price in UAE</title>
      <h2>Original Trim Prices</h2>
      <div><span>2.4L sedan</span><span>AED 89,000 - 119,900</span></div>
      <div><span>3.5L sedan</span><span>AED 120,000 - 138,000</span></div>
      <div>Contact Dealer</div>
      <div>Unrelated model AED 1 - 999,999</div>
    `;

    expect(extractDriveArabiaTrimPrices(html)).toEqual([
      { year: 2011, trim: '2.4L sedan', minPrice: 89000, maxPrice: 119900 },
      { year: 2011, trim: '3.5L sedan', minPrice: 120000, maxPrice: 138000 },
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

describe('DriveArabia multi-trim spec groups', () => {
  it('parses every PAD-captured engine accordion', () => {
    expect(extractDriveArabiaSpecGroups(multiTrimPad2024Html)).toEqual([
      expect.objectContaining({
        configuration: '2.5 I4 FWD',
        fuelType: 'Petrol',
        transmission: 'Automatic',
        engineSize: '2500',
        cylinders: '4',
        horsepower: 204,
      }),
      expect.objectContaining({
        configuration: '3.5 V6 FWD',
        engineSize: '3500',
        cylinders: '6',
        horsepower: 298,
        torqueNm: 356,
      }),
      expect.objectContaining({
        configuration: '2.5 H I4 FWD',
        fuelType: 'Hybrid',
        transmission: 'CVT',
        horsepower: 208,
      }),
    ]);
  });

  it('maps two commercial V6 trims to the one shared V6 engine group', () => {
    for (const trim of ['3.5L V6 40th Anniversary FWD', '3.5L V6 Sport FWD']) {
      expect(extractDriveArabiaSpecsForTrim(multiTrimPad2024Html, trim)).toMatchObject({
        trim,
        year: 2024,
        bodyType: 'Sedan',
        fuelType: 'Petrol',
        transmission: 'Automatic',
        driveType: 'FWD',
        cylinders: '6',
        engineSize: '3500',
        horsepower: 298,
        torqueNm: 356,
      });
    }
  });

  it('maps the Limited Hybrid trim to the hybrid group rather than the petrol SE group', () => {
    expect(
      extractDriveArabiaSpecsForTrim(multiTrimPad2024Html, '2.5H I4 Limited FWD'),
    ).toMatchObject({
      trim: '2.5H I4 Limited FWD',
      fuelType: 'Hybrid',
      transmission: 'CVT',
      cylinders: '4',
      engineSize: '2500',
      horsepower: 208,
      torqueNm: 221,
    });
  });

  it('enriches an exact older trim from one uniquely matching engine capacity', () => {
    const groups = [
      {
        configuration: '2.4 I4 FWD',
        text: 'Engine Layout\nI4\nEngine Size\n2.4 L\nEngine Type\nPetrol\nDrive Train\nFWD\nTransmission\n5A\nHorsepower\n178 HP\nTorque\n222 Nm',
      },
      {
        configuration: '3.5 V6 FWD',
        text: 'Engine Layout\nV6\nEngine Size\n3.5 L\nEngine Type\nPetrol\nDrive Train\nFWD\nTransmission\n5A\nHorsepower\n271 HP\nTorque\n339 Nm',
      },
    ];
    const html = `
      <script type="application/ld+json">${JSON.stringify({
        '@type': 'Vehicle',
        vehicleConfiguration: '2.4L sedan',
        vehicleModelDate: '2011',
        bodyType: 'Midsize Sedan',
        numberOfDoors: 4,
      })}</script>
      <script type="application/json" id="vpi-pad-spec-groups">${JSON.stringify(groups)}</script>
    `;

    expect(extractDriveArabiaSpecsForTrim(html, '2.4L sedan')).toMatchObject({
      trim: '2.4L sedan',
      year: 2011,
      bodyType: 'Sedan',
      doors: '4',
      fuelType: 'Petrol',
      transmission: 'Automatic',
      driveType: 'FWD',
      cylinders: '4',
      engineSize: '2400',
      horsepower: 178,
      torqueNm: 222,
    });
  });

  it('bridges a MINI TC commercial trim to its unique explicit engine spec group', () => {
    const groups = [
      {
        configuration: '1.5 TC I3 FWD',
        text: 'Engine Layout\nI3\nEngine Size\n1.5 L\nEngine Type\nPetrol\nDrive Train\nFWD\nTransmission\n7A\nHorsepower\n136 HP\nTorque\n219 Nm',
      },
      {
        configuration: '2.0 TC I4 FWD',
        text: 'Engine Layout\nI4\nEngine Size\n2.0 L\nEngine Type\nPetrol\nDrive Train\nFWD\nTransmission\n7A\nHorsepower\n192 HP\nTorque\n280 Nm',
      },
    ];
    const html = `
      <script type="application/ld+json">${JSON.stringify({
        '@type': 'Vehicle',
        vehicleConfiguration: '1.5TC I4 Cooper FWD',
        vehicleModelDate: '2024',
        bodyType: 'Mini Hatchback',
        numberOfDoors: 3,
      })}</script>
      <script type="application/json" id="vpi-pad-spec-groups">${JSON.stringify(groups)}</script>
    `;

    expect(extractDriveArabiaSpecsForTrim(html, '1.5TC I4 Cooper FWD')).toMatchObject({
      trim: '1.5TC I4 Cooper FWD',
      year: 2024,
      bodyType: 'Hatchback',
      doors: '3',
      fuelType: 'Petrol',
      transmission: 'Automatic',
      driveType: 'FWD',
      cylinders: '3',
      engineSize: '1500',
      horsepower: 136,
      torqueNm: 219,
    });
  });

  it('enriches a generic D-Max trim only with unanimous engine-group values', () => {
    const groups = [
      {
        configuration: '2.5 TD I4 RWD',
        text: 'Engine Layout\nI4\nEngine Size\n2.5 L\nEngine Type\nDiesel\nDrive Train\nRWD\nTransmission\n5M\nHorsepower\n78 HP\nTorque\n176 Nm',
      },
      {
        configuration: '3.0 TD I4 4WD',
        text: 'Engine Layout\nI4\nEngine Size\n3.0 L\nEngine Type\nDiesel\nDrive Train\n4WD\nTransmission\n5A\nHorsepower\n163 HP\nTorque\n380 Nm',
      },
    ];
    const html = `
      <script type="application/ld+json">${JSON.stringify({
        '@type': 'Vehicle',
        vehicleConfiguration: 'D-Max',
        vehicleModelDate: '2019',
        bodyType: 'Midsize Pickup',
        numberOfDoors: 4,
      })}</script>
      <script type="application/json" id="vpi-pad-spec-groups">${JSON.stringify(groups)}</script>
    `;

    const specs = extractDriveArabiaSpecsForTrim(html, 'D-Max');
    expect(specs).toMatchObject({
      trim: 'D-Max',
      year: 2019,
      bodyType: 'Pick Up',
      doors: '4',
      fuelType: 'Diesel',
      cylinders: '4',
    });
    expect(specs.engineSize).toBeUndefined();
    expect(specs.driveType).toBeUndefined();
    expect(specs.transmission).toBeUndefined();
    expect(specs.horsepower).toBeUndefined();
    expect(specs.torqueNm).toBeUndefined();
  });

  it('returns no non-default specs when two engine groups match ambiguously', () => {
    const ambiguousHtml = `${pad2024Html}<script type="application/json" id="vpi-pad-spec-groups">${JSON.stringify([
      capturedCamrySpecGroups[2],
      capturedCamrySpecGroups[2],
    ])}</script>`;
    expect(extractDriveArabiaSpecsForTrim(ambiguousHtml, '2.5H I4 Limited FWD')).toEqual({});
  });
});
