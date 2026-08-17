/**
 * DriveArabia extraction core — pure, network-free, never throws.
 *
 * Structural reality of DriveArabia (differs from YallaMotor):
 *  - Current per-year pages expose a schema.org Product/Vehicle JSON-LD block
 *    for the selected/default trim. It is preferred for specs because generic
 *    visible page copy can mention several engines and fuel types.
 *  - Prices live in a serialized React payload using ESCAPED quotes, e.g.
 *      \"2.5L I4 E FWD\",\"AED 109,900 - 110,000\"
 *    The surrounding keys (_1488, _100) are minified and unstable across
 *    builds, but the trim names and the AED range strings are stable — so we
 *    normalize the escaped quotes away, then match those two directly.
 *  - Visible DOM text remains a fallback for fields absent from JSON-LD.
 *
 * Output follows DetailSpecs naming so downstream mappers / option-set logic
 * can be shared. This source feeds the master reference table
 * (vpi_vehicledatas: make/model/trim/year/min-price/max-price), not the
 * used-listing scrape tables. See docs/power-automate-desktop-scraper-guide.md.
 */

/** A per-model-year, per-trim price row from the model landing page. */
export interface DriveArabiaPriceRow {
  /** model year the trim belongs to, e.g. 2025 */
  year: number;
  /** display trim name, e.g. GLE Hybrid or 3.5L V6 Sport FWD */
  trim: string;
  /** lower bound of the AED price range */
  minPrice: number;
  /** upper bound, guarded so it is never below minPrice */
  maxPrice: number;
}

/** Specs read from a model/trim detail page. */
export interface DriveArabiaSpecs {
  /** Exact selected/default trim represented by the structured spec block. */
  trim?: string;
  year?: number;
  bodyType?: string;
  fuelType?: string;
  driveType?: string;
  transmission?: string;
  cylinders?: string;
  engineSize?: string;
  doors?: string;
  horsepower?: number;
  torqueNm?: number;
  countryOfOrigin?: string;
}

const Q = String.fromCharCode(34); // hold onto a bare double-quote char
const BS = String.fromCharCode(92); // backslash, for unescaping the payload
const ESCAPED_Q = BS + Q;

/** a single space for the value in the file is one space — collapsed below */

/**
 * Walk the serialized payload in document order, assigning each trim/price pair
 * to the most recent year marker (e.g. `,2025,\"109900\",5,[`). Returns rows with
 * maxPrice guarded so a max<min data glitch degrades safely.
 */
export function extractDriveArabiaPriceRows(html: string): DriveArabiaPriceRow[] {
  // Normalize the JSON-escaped quotes to plain quotes so we can read the pairs
  // as ordinary text. split/join avoids any regex-escape fragility.
  const doc = html.split(ESCAPED_Q).join(Q);

  const pairRe = new RegExp(
    Q + '([^' + Q + ']{4,90})' + Q + ',' + Q + 'AED ([0-9,]{3,}) - ([0-9,]{3,})' + Q,
    'g',
  );
  const yearRe = new RegExp(',([0-9]{4}),' + Q + '([0-9]{6,7})' + Q + ',[0-9]+,\\[', 'g');

  type Ev = { pos: number; year: number } | { pos: number; row: [string, number, number] };
  const evs: Ev[] = [];
  let m: RegExpExecArray | null;
  while ((m = pairRe.exec(doc))) {
    const trim = m[1]!;
    const min = Number(m[2]!.replace(/,/g, ''));
    const max = Number(m[3]!.replace(/,/g, ''));
    evs.push({ pos: m.index, row: [trim, Math.min(min, max), Math.max(min, max)] });
  }
  while ((m = yearRe.exec(doc))) {
    evs.push({ pos: m.index, year: Number(m[1]!) });
  }
  evs.sort((a, b) => a.pos - b.pos);

  const rows: DriveArabiaPriceRow[] = [];
  let curYear = 0;
  for (const ev of evs) {
    if ('year' in ev) {
      curYear = ev.year;
    } else if (curYear) {
      rows.push({ year: curYear, trim: ev.row[0], minPrice: ev.row[1], maxPrice: ev.row[2] });
    }
  }
  return rows;
}

/**
 * Per-model-year page (`…/carprices/uae/<make>/<model>/<year>/?page=N`), e.g.
 * `.../toyota-camry/2024/` — structure differs from the landing page:
 *  - The year is fixed by the URL — there are NO serialized year markers here.
 *  - Trims + their AED ranges render in a visible "Original Trim Prices" table
 *    and the FULL trim names are present ("2.5L I4 SE FWD AED 111,900 - 112,000"),
 *    unlike the landing page's abbreviated serialized names.
 *  - The rest of the page ("See Similar Cars" / "Key Information") lists OTHER
 *    makes with their own AED ranges, so extraction is bounded to the actual
 *    trim-table section and requires a known drivetrain before each AED range.
 *
 * Returns rows for the page's single model year; `[]` if the year is missing.
 */
export function extractDriveArabiaTrimPrices(html: string): DriveArabiaPriceRow[] {
  const year = extractDriveArabiaYear(html);
  if (!year) {
    return [];
  }

  const text = visibleText(html);
  // The label appears first in the tab navigation and again above the actual
  // table. The final occurrence is the table heading; using the first makes the
  // first trim absorb the intervening overview copy.
  const heading = 'Original Trim Prices';
  const start = text.lastIndexOf(heading);
  if (start === -1) {
    return [];
  }
  const afterHeading = text.slice(start + heading.length);
  const end = afterHeading.search(/\b(?:Contact Dealer|Specs|Similar Cars)\b/);
  const section = end === -1 ? afterHeading : afterHeading.slice(0, end);

  const pairRe = new RegExp(
    "([A-Za-z0-9][A-Za-z0-9 .'+/\\\\-]*?\\b(?:FWD|RWD|AWD|4WD|4x4|2WD))" +
      '\\s+AED\\s+([0-9,]+)\\s*[-\\u2013\\u2014]\\s*([0-9,]+)',
    'gi',
  );
  const seen = new Set<string>();
  const rows: DriveArabiaPriceRow[] = [];
  let m: RegExpExecArray | null;
  while ((m = pairRe.exec(section))) {
    const trim = m[1]!.trim();
    const min = Number(m[2]!.replace(/,/g, ''));
    const max = Number(m[3]!.replace(/,/g, ''));
    const key = trim.toLowerCase();
    if (trim.length > 60 || min <= 0 || max <= 0 || seen.has(key)) {
      continue;
    }
    seen.add(key);
    rows.push({ year, trim, minPrice: Math.min(min, max), maxPrice: Math.max(min, max) });
  }
  return rows;
}

/** The model year of a per-year page, read from the most reliable marker first. */
function extractDriveArabiaYear(html: string): number {
  const candidates = [
    /carprices\/uae\/[^"'/]+\/[^"'/]+\/(\d{4})\//, // canonical / og url → .../toyota-camry/2024/
    /"carYear":"(\d{4})"/, // dataLayer
    /(\d{4}) Price in UAE/, // <title>
  ] as const;
  for (const re of candidates) {
    const m = re.exec(html);
    if (m) {
      const y = Number(m[1]);
      if (y >= 1990 && y <= 2035) {
        return y;
      }
    }
  }
  return 0;
}

/** Collapse the stripped page to a single-spaced visible-text line. */
function visibleText(html: string): string {
  return html
    .replace(new RegExp('<' + 'script[^]*?<\\/script>', 'gi'), ' ')
    .replace(new RegExp('<style[^]*?</style>', 'gi'), ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/ +/g, ' ')
    .replace(/--+/g, '-')
    .trim();
}

type JsonRecord = Record<string, unknown>;

function record(value: unknown): JsonRecord | undefined {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as JsonRecord)
    : undefined;
}

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function numberValue(value: unknown): number | undefined {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function hasSchemaType(value: unknown, expected: string): boolean {
  const values = Array.isArray(value) ? value : [value];
  return values.some((candidate) => candidate === expected);
}

/** Find the Product/Vehicle block without trusting surrounding JSON-LD order. */
function driveArabiaVehicleJsonLd(html: string): JsonRecord | undefined {
  const scriptRe = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;
  while ((match = scriptRe.exec(html))) {
    try {
      const parsed = JSON.parse(match[1]!) as unknown;
      const candidates = Array.isArray(parsed) ? parsed : [parsed];
      const vehicle = candidates.find((candidate) => {
        const item = record(candidate);
        return (
          item &&
          (hasSchemaType(item['@type'], 'Vehicle') || hasSchemaType(item['@type'], 'Product'))
        );
      });
      const item = record(vehicle);
      if (item) {
        return item;
      }
    } catch {
      // Ignore malformed/non-vehicle blocks and continue to the next script.
    }
  }
  return undefined;
}

function normalizeBodyType(value: string): string {
  const lower = value.toLowerCase();
  if (lower.includes('sedan')) {
    return 'Sedan';
  }
  if (lower.includes('crossover')) {
    return 'SUV - Crossover';
  }
  if (lower.includes('suv')) {
    return 'SUV';
  }
  if (lower.includes('hatchback')) {
    return 'Hatchback';
  }
  if (lower.includes('coupe')) {
    return 'Coupe';
  }
  if (lower.includes('wagon')) {
    return 'Wagon';
  }
  if (lower.includes('pickup') || lower.includes('pick up')) {
    return 'Pick Up';
  }
  if (lower.includes('van')) {
    return 'Van';
  }
  return value;
}

function normalizeTransmission(value: string): string {
  if (/cvt/i.test(value)) {
    return 'CVT';
  }
  if (/automatic|(?:^|\s)\d+\s*a(?:\s|$)/i.test(value)) {
    return 'Automatic';
  }
  if (/manual|(?:^|\s)\d+\s*m(?:\s|$)/i.test(value)) {
    return 'Manual';
  }
  return value;
}

function specsFromVehicleJsonLd(vehicle: JsonRecord): DriveArabiaSpecs {
  const out: DriveArabiaSpecs = {};
  const trim = stringValue(vehicle.vehicleConfiguration);
  if (trim) {
    out.trim = trim;
    const litres = /(?:^|\s)(\d+(?:\.\d+)?)\s*L\b/i.exec(trim);
    if (litres) {
      out.engineSize = String(Math.round(Number(litres[1]) * 1000));
    }
    const cylinders = /\b(?:I|V|H)(\d{1,2})\b/i.exec(trim);
    if (cylinders) {
      out.cylinders = cylinders[1];
    }
    const drive = /\b(FWD|RWD|AWD|4WD|4X4|2WD)\b/i.exec(trim);
    if (drive) {
      out.driveType = drive[1]!.toUpperCase();
    }
  }

  const year = numberValue(vehicle.vehicleModelDate);
  if (year) {
    out.year = year;
  }
  const bodyType = stringValue(vehicle.bodyType);
  if (bodyType) {
    out.bodyType = normalizeBodyType(bodyType);
  }
  const doors = numberValue(vehicle.numberOfDoors);
  if (doors) {
    out.doors = String(doors);
  }
  const transmission = stringValue(vehicle.vehicleTransmission);
  if (transmission) {
    out.transmission = normalizeTransmission(transmission);
  }

  const engine = record(vehicle.vehicleEngine);
  const fuelType = stringValue(engine?.fuelType);
  if (fuelType) {
    out.fuelType = fuelType;
  }
  const power = record(engine?.enginePower);
  const horsepower = numberValue(power?.value);
  if (horsepower) {
    out.horsepower = horsepower;
  }
  const origin = record(vehicle.countryOfOrigin);
  const country = stringValue(origin?.name);
  if (country) {
    out.countryOfOrigin = country;
  }
  return out;
}

/** Extract specs from a trim/model detail page's visible text (never throws). */
export function extractDriveArabiaSpecs(html: string): DriveArabiaSpecs {
  const text = visibleText(html);
  const vehicle = driveArabiaVehicleJsonLd(html);
  const out: DriveArabiaSpecs = vehicle ? specsFromVehicleJsonLd(vehicle) : {};
  const hp = /Horsepower ([0-9,]+) (.?HP)/.exec(text);
  if (hp && out.horsepower === undefined) {
    out.horsepower = Number(hp[1]!.replace(/,/g, ''));
  }
  const trq = /Torque ([0-9,]+) (Nm|NmHc)/.exec(text);
  if (trq) {
    out.torqueNm = Number(trq[1]!.replace(/,/g, ''));
  }
  for (const [label, re] of [
    ['fuelType', /(?:^| )(Petrol|Diesel|Electric|Hybrid)(?: |$)/],
    ['driveType', /Drive Train ([A-Za-z0-9]+)/],
    ['transmission', /Transmission ([A-Za-z0-9]+)/],
  ] as const) {
    const mm = re.exec(text);
    if (mm && mm[1] && out[label] === undefined) {
      out[label] = mm[1];
    }
  }
  return out;
}
