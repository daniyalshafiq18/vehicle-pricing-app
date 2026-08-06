/**
 * Defensive extraction of YallaMotor JSON-LD blocks into typed structures.
 *
 * These are pure functions over `unknown` (the parsed schema.org blocks from a
 * live scrape). Every lookup is safe — a missing or mis-shaped field returns
 * `undefined` rather than throwing, mirroring the "never throws" rule of the
 * guide's §7.3 extraction table and the hardened Flow-3 expressions.
 *
 * Two entry points:
 *  - `parseDetailJsonLd` — a listing detail page (`Product`/`Car` block) → `DetailSpecs`
 *  - `parseSearchJsonLd` — a search page (`CollectionPage` + `ItemList`) → `SearchResult`
 */

import type { DetailSpecs, SearchResult } from './types';

/** A JSON object record (used to walk `unknown` defensively). */
type Obj = Record<string, unknown>;

function asObject(v: unknown): Obj | undefined {
  return v !== null && typeof v === 'object' && !Array.isArray(v) ? (v as Obj) : undefined;
}

function isObjectList(v: unknown): v is Obj[] {
  return Array.isArray(v) && v.every((x) => asObject(x) !== undefined);
}

/** String value — trims, rejects empty, converts finite numbers. */
function asString(v: unknown): string | undefined {
  if (typeof v === 'string' && v.trim() !== '') {
    return v;
  }
  if (typeof v === 'number' && Number.isFinite(v)) {
    return String(v);
  }
  return undefined;
}

/** Numeric value — from a plain number OR a numeric string; commas stripped. */
function asNumber(v: unknown): number | undefined {
  if (typeof v === 'number' && Number.isFinite(v)) {
    return v;
  }
  if (typeof v === 'string') {
    const n = Number(v.replace(/[^0-9.-]/g, ''));
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

/**
 * Resolve a QuantitativeValue: a raw number OR an object with a `.value`
 * ("mileageFromOdometer": {"@type":"QuantitativeValue","value":130161}).
 */
function quantitativeValue(v: unknown): number | undefined {
  if (typeof v === 'number') {
    return Number.isFinite(v) ? v : undefined;
  }
  const obj = asObject(v);
  return obj ? asNumber(obj['value']) : undefined;
}

/** Find the first block whose `@type` (string or array) contains `type`. */
function findBlockOfType(blocks: unknown[], type: string): Obj | undefined {
  if (!isObjectList(blocks)) {
    return undefined;
  }
  for (const block of blocks) {
    const t = block['@type'];
    const names = Array.isArray(t) ? t : [t];
    if (names.some((n) => n === type)) {
      return block;
    }
  }
  return undefined;
}

/** Scan a `description` string for a regional-spec phrase the frontend matches. */
function extractRegionalSpecs(description: string | undefined): string | undefined {
  if (!description) {
    return undefined;
  }
  const lows = description.toLowerCase();
  if (lows.includes('gcc specs')) {
    return 'GCC Specs';
  }
  if (lows.includes('other specs')) {
    return 'Other Specs';
  }
  if (lows.includes('not sure')) {
    return 'Not Sure';
  }
  if (lows.includes('non-gcc')) {
    return 'Non-GCC';
  }
  // Any other "…Specs" mention → the generic marker (mapCategory keyed on 'Specs')
  if (lows.includes('specs')) {
    const m = lows.match(/[a-z]+ specs/);
    return m ? m[0] : 'Specs';
  }
  return undefined;
}

/**
 * Parse a listing **detail** page's JSON-LD blocks into `DetailSpecs`.
 *
 * Mirrors the Flow-3 verified mapping — including the quoted-string engine
 * (`vehicleEngine.engineDisplacement.value = "2972"`) and the unquoted-number
 * mileage (`mileageFromOdometer.value = 130161`).
 */
export function parseDetailJsonLd(blocks: unknown): DetailSpecs {
  const car = findBlockOfType(Array.isArray(blocks) ? blocks : [], 'Car') ??
    findBlockOfType(Array.isArray(blocks) ? blocks : [], 'Product');

  if (!car) {
    return {};
  }

  const engineObj = asObject(car['vehicleEngine']);
  const engineDisp = asObject(engineObj?.['engineDisplacement']);

  const mileage = quantitativeValue(car['mileageFromOdometer']);
  const doors = quantitativeValue(car['numberOfDoors']);

  const offers = asObject(car['offers']);
  const price = offers ? asNumber(offers['price']) : undefined;

  const name = asString(car['name']);

  return {
    bodyType: asString(car['bodyType']),
    fuelType: asString(car['fuelType']),
    transmission: asString(car['vehicleTransmission']),
    driveType: asString(car['driveWheelConfiguration']),
    engineSize: engineDisp ? asString(engineDisp['value']) : undefined,
    mileage: mileage !== undefined ? String(mileage) : undefined,
    doors: doors === undefined ? undefined : String(doors),
    regionalSpecs: extractRegionalSpecs(asString(car['description'])),
    price,
    name,
  };
}

/**
 * Parse a search page's JSON-LD into `SearchResult`.
 *
 * `count` prefers the CollectionPage `description` (the true listing total,
 * e.g. "503 listings …"), falling back to `ItemList.numberOfItems`. Min/max
 * prices and `heading` come from that same description.
 */
export function parseSearchJsonLd(blocks: unknown): SearchResult {
  const list = Array.isArray(blocks) ? blocks : [];
  const page = findBlockOfType(list, 'CollectionPage');
  const itemList = findBlockOfType(list, 'ItemList');

  const heading = asString(page?.['description']) ?? '';

  const listingCount = /(\d+)\s+listings/i.exec(heading)?.[1];
  const priceMatch = /AED\s+([\d,]+)\s*[–-]\s*([\d,]+)/i.exec(heading);

  const count =
    (listingCount ? Number(listingCount) : Number(asString(itemList?.['numberOfItems']))) || 0;

  const minRaw = priceMatch?.[1];
  const maxRaw = priceMatch?.[2];
  const minPrice = minRaw ? Number(minRaw.replace(/,/g, '')) : 0;
  const maxPrice = maxRaw ? Number(maxRaw.replace(/,/g, '')) : 0;

  return {
    count,
    minPrice,
    maxPrice,
    heading,
    firstListingUrl: firstListingUrl(itemList),
  };
}

/** First listing URL from an `ItemList`: an `item.url` or a direct `url`. */
function firstListingUrl(itemList: Obj | undefined): string | undefined {
  const elements = itemList && Array.isArray(itemList['itemListElement']) ? itemList['itemListElement'] : [];
  for (const el of elements) {
    const obj = asObject(el);
    if (!obj) {
      continue;
    }
    const direct = asString(obj['url']);
    if (direct) {
      return direct;
    }
    const item = asObject(obj['item']);
    const nested = item ? asString(item['url']) : undefined;
    if (nested) {
      return nested;
    }
  }
  return undefined;
}