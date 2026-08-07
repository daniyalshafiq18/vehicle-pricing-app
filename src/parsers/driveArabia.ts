/**
 * DriveArabia extraction core — pure, network-free, never throws.
 *
 * Structural reality of DriveArabia (differs from YallaMotor):
 *  - NO useable JSON-LD (the application/ld+json blocks are only site/breadcrumb
 *    metadata — no car/price payload).
 *  - Prices live in a serialized React payload using ESCAPED quotes, e.g.
 *      \"2.5L I4 E FWD\",\"AED 109,900 - 110,000\"
 *    The surrounding keys (_1488, _100) are minified and unstable across
 *    builds, but the trim names and the AED range strings are stable — so we
 *    normalize the escaped quotes away, then match those two directly.
 *  - Specs (fuel / drive / transmission / horsepower) render in the VISIBLE
 *    DOM and are read from the stripped page text.
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
  fuelType?: string;
  driveType?: string;
  transmission?: string;
  horsepower?: number;
  torqueNm?: number;
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
    'g'
  );
  const yearRe = new RegExp(
    ',([0-9]{4}),' + Q + '([0-9]{6,7})' + Q + ',[0-9]+,\\[',
    'g'
  );

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

/** Extract specs from a trim/model detail page's visible text (never throws). */
export function extractDriveArabiaSpecs(html: string): DriveArabiaSpecs {
  const text = visibleText(html);
  const out: DriveArabiaSpecs = {};
  const hp = /Horsepower ([0-9,]+) (.?HP)/.exec(text);
  if (hp) out.horsepower = Number(hp[1]!.replace(/,/g, ''));
  const trq = /Torque ([0-9,]+) (Nm|NmHc)/.exec(text);
  if (trq) out.torqueNm = Number(trq[1]!.replace(/,/g, ''));
  for (const [label, re] of [
    ['fuelType', /(?:^| )(Petrol|Diesel|Electric|Hybrid)(?: |$)/],
    ['driveType', /Drive Train ([A-Za-z0-9]+)/],
    ['transmission', /Transmission ([A-Za-z0-9]+)/],
  ] as const) {
    const mm = re.exec(text);
    if (mm && mm[1]) out[label] = mm[1];
  }
  return out;
}