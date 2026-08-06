/**
 * Azure Functions transport for YallaMotor — the app's PRIMARY scrape path with
 * automatic Power Automate Flow 3 fallback.
 *
 * Request flow:
 *   1. Build the search URL via the shared `buildYallaMotorSearchUrl`.
 *   2. Probe `?url=<search>&client=cloudscraper` → search HTML.
 *   3. `extractJsonLdBlocks` → `parseSearchJsonLd` → count / min / max / heading /
 *      firstListingUrl.
 *   4. If count > 0, probe the first listing's detail page → `parseDetailJsonLd` →
 *      spec labels; `extractCylinders(detailHtml)` → cylinders (from the HTML
 *      spec grid, since YallaMotor's JSON-LD carries no cylinders).
 *   5. Assemble a `Flow3ScrapeResult` — the exact same shape the Flow 3 path
 *      produces, so the hook and Dataverse write are unchanged.
 *
 * Never throws: every failure returns `{ success:false, error }` so the caller
 * can fall back to Flow 3 (`scrapeWithFallback`).
 */

import { parseDetailJsonLd, parseSearchJsonLd, extractJsonLdBlocks, extractCylinders } from '@parsers';
import type { DetailSpecs, SearchResult } from '@parsers';
import type { Flow3Response, Flow3ScrapeResult } from './yallaMotorHttpScraper';
import { scrapeViaFlow3 } from './yallaMotorHttpScraper';
import { buildYallaMotorSearchUrl } from './yallaMotorUrl';

/** Base URL of the deployed `probe_py` function (e.g. `…/api/probe_py`). */
const AZURE_FUNCTION_URL = (import.meta.env.VITE_AZURE_FUNCTION_URL as string | undefined) ?? '';

interface ScrapeParams {
  make: string;
  model: string;
  trim: string;
  year: number;
}

export interface AzureScrapeOptions {
  /** Override the probe base URL (tests inject a mock). */
  functionBaseUrl?: string;
  /** Override fetch (tests inject a mock transport). */
  fetchFn?: typeof fetch;
  /** Override the Flow 3 transport used by `scrapeWithFallback` (tests). */
  flow3?: (params: ScrapeParams) => Promise<Flow3Response>;
}

type ProbeResult =
  | { ok: true; html: string }
  | { ok: false; url: string; reason: string; statusCode?: string };

async function probe(url: string, opts: AzureScrapeOptions): Promise<ProbeResult> {
  const base = (opts.functionBaseUrl ?? AZURE_FUNCTION_URL).replace(/\/+$/, '');
  if (!base) {
    return { ok: false, url, reason: 'Azure function URL is not configured (set VITE_AZURE_FUNCTION_URL).' };
  }
  const fetchFn = opts.fetchFn ?? fetch;
  const res = await fetchFn(`${base}?url=${encodeURIComponent(url)}&client=cloudscraper`);
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  // Check blocked FIRST — the deployed probe returns HTTP 403 with a
  // `blocked:true` body, and the blocked reason is more useful than the code.
  if (body.blocked) {
    return {
      ok: false,
      url,
      reason: `Azure probe blocked (${body.reason ?? 'challenge page, no content'})`,
      statusCode: String(body.httpStatus ?? res.status),
    };
  }
  if (!res.ok) {
    return { ok: false, url, reason: `Azure probe HTTP ${res.status}`, statusCode: String(res.status) };
  }
  if (typeof body.html !== 'string') {
    return { ok: false, url, reason: 'Azure probe returned no HTML payload' };
  }
  return { ok: true, html: body.html };
}

/** Assemble the shared `Flow3ScrapeResult` from parsed search + detail + cylinders. */
export function assembleAzureResult(
  search: SearchResult,
  specs: DetailSpecs,
  cylinders: string | undefined,
  params: ScrapeParams,
): Flow3ScrapeResult {
  return {
    success: true,
    make: params.make,
    model: params.model,
    trim: params.trim,
    year: params.year,
    count: search.count,
    minPrice: search.minPrice,
    maxPrice: search.maxPrice,
    heading: search.heading,
    sourceUrl: buildYallaMotorSearchUrl(params),
    // Spec labels — only include non-empty values, mirroring the Flow 3 path.
    ...(specs.bodyType && { bodyType: specs.bodyType }),
    ...(specs.fuelType && { fuelType: specs.fuelType }),
    ...(specs.transmission && { transmission: specs.transmission }),
    ...(specs.driveType && { driveType: specs.driveType }),
    // Cylinders come from the HTML spec grid; JSON-LD has none.
    ...((cylinders ?? specs.cylinders) && { cylinders: cylinders ?? specs.cylinders }),
    ...(specs.engineSize && { engineSize: specs.engineSize }),
    ...(specs.doors && { doors: specs.doors }),
    ...(specs.mileage && { mileage: specs.mileage }),
    ...(specs.regionalSpecs && { regionalSpecs: specs.regionalSpecs }),
  } satisfies Flow3ScrapeResult;
}

/**
 * Scrape a YallaMotor search via the deployed Azure probe. Returns a complete
 * result only when the search AND (whenever count > 0) the detail both succeed;
 * any shortfall returns `{ success:false, error }`.
 */
export async function scrapeViaAzure(
  params: ScrapeParams,
  opts: AzureScrapeOptions = {},
): Promise<Flow3Response> {
  const sourceUrl = buildYallaMotorSearchUrl(params);
  try {
    const search = await probe(sourceUrl, opts);
    if (!search.ok) {
      return { success: false, error: search.reason, url: search.url, statusCode: search.statusCode };
    }
    const searchResult = parseSearchJsonLd(extractJsonLdBlocks(search.html));
    if (searchResult.count <= 0) {
      return { success: false, error: 'Azure search returned no listings', url: sourceUrl };
    }
    if (!searchResult.firstListingUrl) {
      return { success: false, error: 'Azure search returned no listing URL', url: sourceUrl };
    }
    const detail = await probe(searchResult.firstListingUrl, opts);
    if (!detail.ok) {
      return { success: false, error: detail.reason, url: detail.url, statusCode: detail.statusCode };
    }
    const specs = parseDetailJsonLd(extractJsonLdBlocks(detail.html));
    const cylinders = extractCylinders(detail.html);
    return assembleAzureResult(searchResult, specs, cylinders, params);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'An unexpected error occurred';
    return { success: false, error: `Azure scrape failed: ${message}`, url: sourceUrl };
  }
}

export type TransportedResponse = Flow3Response & { transport: 'azure' | 'flow3' };

/**
 * Try Azure first; fall back to Power Automate Flow 3 on ANY Azure shortfall, so
 * no live scrape is ever lost. The `transport` marker lets the frontend show
 * which path produced the row.
 */
export async function scrapeWithFallback(
  params: ScrapeParams,
  opts: AzureScrapeOptions = {},
): Promise<TransportedResponse> {
  const azure = await scrapeViaAzure(params, opts);
  if (azure.success) {
    return { ...azure, transport: 'azure' };
  }
  const flow3 = await (opts.flow3 ?? scrapeViaFlow3)(params);
  return { ...flow3, transport: 'flow3' };
}