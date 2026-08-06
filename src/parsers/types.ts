/**
 * Shared types for the YallaMotor JSON-LD extraction core.
 *
 * These describe the *label-level* data parsed out of live JSON-LD, and the
 * normalized Dataverse-integer shape produced by `normalize.ts`. Pure and
 * transport-agnostic — nothing here knows about Power Automate, fetch, or React.
 */

/** A vehicle search the scraper asks YallaMotor for. */
export interface SearchQuery {
  make: string;
  model: string;
  trim: string;
  year: number;
}

/**
 * Spec fields extracted from a listing **detail** page's schema.org `Car`
 * block. Values are raw labels/strings as they appear in the JSON-LD (e.g.
 * `driveType` is the schema URL `…/AllWheelDriveConfiguration`; `engineSize`
 * is the quoted string `"2972"`; `mileage` is the unquoted number `130161`
 * flattened to a string). Absent fields are `undefined` — never thrown.
 */
export interface DetailSpecs {
  /** e.g. "SUV / Crossover" */
  bodyType?: string;
  /** e.g. "Petrol" */
  fuelType?: string;
  /** e.g. "Automatic" */
  transmission?: string;
  /** schema.org drive URL, e.g. "https://schema.org/AllWheelDriveConfiguration" */
  driveType?: string;
  /** e.g. "6" (only available from the HTML tile, not JSON-LD) */
  cylinders?: string;
  /** engine size cc as a string, e.g. "2972" */
  engineSize?: string;
  /** e.g. "4" */
  doors?: string;
  /** e.g. "5" (not reliably present in YallaMotor JSON-LD) */
  seats?: string;
  /** e.g. "130161" */
  mileage?: string;
  /** regional-spec phrase e.g. "GCC Specs", extracted from `description` */
  regionalSpecs?: string;
  /** `offers.price`, e.g. 52999 */
  price?: number;
  /** name of the listing, e.g. "Used Mitsubishi Pajero GLS V6 2020" */
  name?: string;
}

/**
 * Summary data extracted from a **search page**'s JSON-LD.
 *
 * `heading` is the raw CollectionPage description (e.g.
 * "503 listings · AED 120 – 350,000 · 1996–2026"), and `firstListingUrl` is
 * the first ItemList entry, so the caller can fan out to a detail page. */
export interface SearchResult {
  count: number;
  minPrice: number;
  maxPrice: number;
  heading: string;
  firstListingUrl?: string;
}

/** Dataverse-integer mapping of a `DetailSpecs` — the `normalizeToDataverse` output. */
export interface NormalizedListing {
  bodyTypeValue?: number;
  fuelTypeValue?: number;
  transmissionValue?: number;
  driveTypeValue?: number;
  cylindersValue?: number;
  engineSizeValue?: number;
  doorsValue?: number;
  seatsValue?: number;
  categoryValue?: number;
  mileageValue?: number;
}