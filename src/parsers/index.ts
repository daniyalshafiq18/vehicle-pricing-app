/**
 * In-repo YallaMotor extraction core — pure, testable, transport-agnostic.
 *
 * - `yallaJsonLd`     — defensive JSON-LD → typed structures (detail + search)
 * - `jsonLdFromHtml`  — HTML → parsed JSON-LD blocks (shared with the Azure adapter)
 * - `specTable`       — detail-page HTML spec-grid extraction (cylinders)
 * - `mappers`         — label/URL → Dataverse option-set label
 * - `normalize`       — `DetailSpecs` → Dataverse option-set integers (single boundary)
 *
 * Consumed by the app (see `@parsers/...` imports in `useTriggerScrape.ts`) and,
 * eventually, by the Azure Functions adapter for the same values server-side.
 */

export type {
  SearchQuery,
  DetailSpecs,
  SearchResult,
  NormalizedListing,
} from './types';

export { parseDetailJsonLd, parseSearchJsonLd } from './yallaJsonLd';
export { extractJsonLdBlocks } from './jsonLdFromHtml';
export { extractCylinders } from './specTable';
export {
  mapDriveType,
  mapCategory,
  mapFuelType,
  lookupDoorsValue,
  lookupSeatsValue,
} from './mappers';
export { normalizeToDataverse } from './normalize';