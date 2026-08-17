import { missingVehicleScrapeStatusValue } from '@data/dataverseOptionSets';
import {
  extractDriveArabiaPriceRows,
  extractDriveArabiaSpecs,
  extractDriveArabiaTrimPrices,
  normalizeToDataverse,
} from '@parsers';
import { missingVehicleRepository } from '@repositories';
import type { MissingVehicleRequest } from '@types';

const AZURE_FUNCTION_URL = (import.meta.env.VITE_AZURE_FUNCTION_URL as string | undefined) ?? '';
const DEFAULT_MAX_ITEMS = 25;

export type ScrapeInboxSource = 'drivearabia' | 'dubizzle';

export interface ScrapeInboxItem {
  inboxId: string;
  source: ScrapeInboxSource;
  url: string;
  searchUrl: string;
  kind: string;
  status: string;
  html?: string;
}

export interface ScrapeResultUpdate {
  scrapedMinPrice: number;
  scrapedMaxPrice: number;
  scrapedListings: string;
  scrapedSources: string;
  scrapeStatusValue: number;
  bodyTypeValue?: number;
  fuelTypeValue?: number;
  transmissionValue?: number;
  driveTypeValue?: number;
  cylindersValue?: number;
  engineSizeValue?: number;
  horsepowerValue?: number;
  doorsValue?: number;
  seatsValue?: number;
  categoryValue?: number;
  mileageValue?: number;
}

export interface ProcessScrapeInboxOptions {
  requests: MissingVehicleRequest[];
  functionBaseUrl?: string;
  fetchFn?: typeof fetch;
  maxItems?: number;
  updateScrapeResult?: (id: string, fields: ScrapeResultUpdate) => Promise<void>;
}

export interface InboxItemResult {
  inboxId?: string;
  status: 'empty' | 'complete' | 'error' | 'waiting';
  updatedRequestIds: string[];
  error?: string;
}

export interface InboxProcessSummary {
  processedItems: number;
  completedItems: number;
  failedItems: number;
  waitingItems: number;
  updatedRequestIds: string[];
  failures: Array<{ inboxId?: string; error: string }>;
}

class NoMatchingRequestError extends Error {}

function endpoint(functionBaseUrl: string, route: 'next_pending' | 'inbox_status'): string {
  const trimmed = functionBaseUrl.trim();
  if (!trimmed) {
    throw new Error('Azure function URL is not configured (set VITE_AZURE_FUNCTION_URL).');
  }

  const url = new URL(trimmed, window.location.origin);
  const path = url.pathname.replace(/\/+$/, '').replace(/\/probe_py$/i, '');
  url.pathname = `${path}/${route}`.replace(/\/{2,}/g, '/');
  url.search = '';
  url.hash = '';
  return url.toString();
}

async function readJson(response: Response): Promise<Record<string, unknown>> {
  try {
    return (await response.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

async function fetchPendingItem(
  fetchFn: typeof fetch,
  baseUrl: string,
): Promise<ScrapeInboxItem | null> {
  const response = await fetchFn(endpoint(baseUrl, 'next_pending'));
  const body = await readJson(response);
  if (response.status === 404 && body.error === 'no_pending') {
    return null;
  }
  if (!response.ok) {
    throw new Error(String(body.error ?? `Inbox request failed (${response.status})`));
  }
  return validateItem(body);
}

async function fetchInboxHtml(
  fetchFn: typeof fetch,
  baseUrl: string,
  inboxId: string,
): Promise<ScrapeInboxItem> {
  const url = new URL(endpoint(baseUrl, 'next_pending'));
  url.searchParams.set('inboxId', inboxId);
  const response = await fetchFn(url.toString());
  const body = await readJson(response);
  if (!response.ok) {
    throw new Error(String(body.error ?? `Inbox HTML request failed (${response.status})`));
  }
  const item = validateItem(body);
  if (typeof item.html !== 'string' || !item.html.trim()) {
    throw new Error(`Inbox item ${inboxId} has no HTML`);
  }
  return item;
}

function validateItem(body: Record<string, unknown>): ScrapeInboxItem {
  const source = body.source;
  if (
    typeof body.inboxId !== 'string' ||
    (source !== 'drivearabia' && source !== 'dubizzle') ||
    typeof body.url !== 'string'
  ) {
    throw new Error('Inbox response is missing required metadata');
  }
  return {
    inboxId: body.inboxId,
    source,
    url: body.url,
    searchUrl: typeof body.searchUrl === 'string' ? body.searchUrl : '',
    kind: typeof body.kind === 'string' ? body.kind : 'detail',
    status: typeof body.status === 'string' ? body.status : 'Pending',
    ...(typeof body.html === 'string' && { html: body.html }),
  };
}

async function acknowledge(
  fetchFn: typeof fetch,
  baseUrl: string,
  inboxId: string,
  status: 'Complete' | 'Error',
): Promise<void> {
  const response = await fetchFn(endpoint(baseUrl, 'inbox_status'), {
    method: 'POST',
    // Azure's platform-level CORS handler intercepts OPTIONS and can return 204
    // without allow headers. text/plain is safelisted, so this stays a simple
    // CORS request; the function parses JSON independently of content type.
    headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
    body: JSON.stringify({ inboxId, status }),
  });
  if (!response.ok) {
    const body = await readJson(response);
    throw new Error(String(body.error ?? `Inbox status update failed (${response.status})`));
  }
}

function comparable(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function driveArabiaVehicle(urlValue: string): { make: string; model: string } | null {
  try {
    const segments = new URL(urlValue).pathname.split('/').filter(Boolean);
    const uaeIndex = segments.findIndex((segment) => segment.toLowerCase() === 'uae');
    const make = segments[uaeIndex + 1];
    const modelSlug = segments[uaeIndex + 2];
    if (uaeIndex === -1 || !make || !modelSlug) {
      return null;
    }
    const makeKey = comparable(make);
    const modelKey = comparable(modelSlug);
    return {
      make: makeKey,
      model: modelKey.startsWith(makeKey) ? modelKey.slice(makeKey.length) : modelKey,
    };
  } catch {
    return null;
  }
}

function matchingRequests(
  item: ScrapeInboxItem,
  requests: MissingVehicleRequest[],
): Array<{ request: MissingVehicleRequest; minPrice: number; maxPrice: number }> {
  if (item.source !== 'drivearabia' || !item.html) {
    throw new Error(`Inbox source '${item.source}' is not implemented yet`);
  }
  const vehicle = driveArabiaVehicle(item.url);
  if (!vehicle) {
    throw new Error('DriveArabia URL does not identify a make and model');
  }

  const perYearRows = extractDriveArabiaTrimPrices(item.html);
  const rows = perYearRows.length > 0 ? perYearRows : extractDriveArabiaPriceRows(item.html);
  if (rows.length === 0) {
    throw new Error('DriveArabia capture produced no price rows');
  }

  const matches: Array<{ request: MissingVehicleRequest; minPrice: number; maxPrice: number }> = [];
  for (const request of requests) {
    const requestModel = comparable(request.model);
    const modelMatches =
      requestModel === vehicle.model || requestModel === `${vehicle.make}${vehicle.model}`;
    if (comparable(request.make) !== vehicle.make || !modelMatches) {
      continue;
    }
    const row = rows.find(
      (candidate) =>
        candidate.year === request.modelYear &&
        comparable(candidate.trim) === comparable(request.trim),
    );
    if (row) {
      matches.push({ request, minPrice: row.minPrice, maxPrice: row.maxPrice });
    }
  }
  return matches;
}

/** Process the oldest pending PAD item and acknowledge it as Complete/Error. */
export async function processNextScrapeInboxItem(
  options: ProcessScrapeInboxOptions,
): Promise<InboxItemResult> {
  const fetchFn = options.fetchFn ?? fetch;
  const baseUrl = options.functionBaseUrl ?? AZURE_FUNCTION_URL;
  const updateScrapeResult =
    options.updateScrapeResult ??
    ((id: string, fields: ScrapeResultUpdate) =>
      missingVehicleRepository.updateScrapeResult(id, fields));

  const pending = await fetchPendingItem(fetchFn, baseUrl);
  if (!pending) {
    return { status: 'empty', updatedRequestIds: [] };
  }

  let item: ScrapeInboxItem;
  try {
    item = await fetchInboxHtml(fetchFn, baseUrl, pending.inboxId);
    const matches = matchingRequests(item, options.requests);
    if (matches.length === 0) {
      throw new NoMatchingRequestError(
        'No matching missing-vehicle request found for the captured make/model/year/trim',
      );
    }

    const scrapedValue = missingVehicleScrapeStatusValue('Scraped') ?? 4;
    const specs = extractDriveArabiaSpecs(item.html!);
    const updatedRequestIds: string[] = [];
    for (const match of matches) {
      // A per-year page can list several trims while its Product/Vehicle block
      // describes only the selected/default trim. Never leak those specs into
      // another trim merely because its price row appears on the same page.
      const specsMatch =
        specs.trim !== undefined &&
        comparable(specs.trim) === comparable(match.request.trim) &&
        (specs.year === undefined || specs.year === match.request.modelYear);
      const mapped = specsMatch ? normalizeToDataverse(specs) : {};
      await updateScrapeResult(match.request.id, {
        scrapedMinPrice: match.minPrice,
        scrapedMaxPrice: match.maxPrice,
        scrapedListings: JSON.stringify({
          count: 1,
          minPrice: match.minPrice,
          maxPrice: match.maxPrice,
          source: 'DriveArabia',
          url: item.url,
          transport: 'pad',
          inboxId: item.inboxId,
          trim: match.request.trim,
          year: match.request.modelYear,
          ...(specsMatch && { specs }),
        }),
        scrapedSources: item.url,
        scrapeStatusValue: scrapedValue,
        ...(mapped.bodyTypeValue !== undefined && { bodyTypeValue: mapped.bodyTypeValue }),
        ...(mapped.fuelTypeValue !== undefined && { fuelTypeValue: mapped.fuelTypeValue }),
        ...(mapped.transmissionValue !== undefined && {
          transmissionValue: mapped.transmissionValue,
        }),
        ...(mapped.driveTypeValue !== undefined && { driveTypeValue: mapped.driveTypeValue }),
        ...(mapped.cylindersValue !== undefined && { cylindersValue: mapped.cylindersValue }),
        ...(mapped.engineSizeValue !== undefined && { engineSizeValue: mapped.engineSizeValue }),
        ...(specsMatch &&
          specs.horsepower !== undefined && {
            horsepowerValue: specs.horsepower,
          }),
        ...(mapped.doorsValue !== undefined && { doorsValue: mapped.doorsValue }),
      });
      updatedRequestIds.push(match.request.id);
    }
    await acknowledge(fetchFn, baseUrl, item.inboxId, 'Complete');
    return { inboxId: item.inboxId, status: 'complete', updatedRequestIds };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown inbox processing error';
    if (error instanceof NoMatchingRequestError) {
      return {
        inboxId: pending.inboxId,
        status: 'waiting',
        updatedRequestIds: [],
        error: message,
      };
    }
    try {
      await acknowledge(fetchFn, baseUrl, pending.inboxId, 'Error');
    } catch (ackError: unknown) {
      const ackMessage =
        ackError instanceof Error ? ackError.message : 'unknown acknowledgement error';
      return {
        inboxId: pending.inboxId,
        status: 'error',
        updatedRequestIds: [],
        error: `${message}; failed to mark Error: ${ackMessage}`,
      };
    }
    return { inboxId: pending.inboxId, status: 'error', updatedRequestIds: [], error: message };
  }
}

/** Drain pending PAD items up to a safety cap; each item is acknowledged exactly once. */
export async function processScrapeInbox(
  options: ProcessScrapeInboxOptions,
): Promise<InboxProcessSummary> {
  const maxItems = Math.max(1, Math.min(options.maxItems ?? DEFAULT_MAX_ITEMS, 100));
  const summary: InboxProcessSummary = {
    processedItems: 0,
    completedItems: 0,
    failedItems: 0,
    waitingItems: 0,
    updatedRequestIds: [],
    failures: [],
  };

  for (let index = 0; index < maxItems; index += 1) {
    const result = await processNextScrapeInboxItem(options);
    if (result.status === 'empty') {
      break;
    }
    if (result.status === 'waiting') {
      summary.waitingItems += 1;
      summary.failures.push({
        inboxId: result.inboxId,
        error: result.error ?? 'No matching request',
      });
      break;
    }
    summary.processedItems += 1;
    if (result.status === 'complete') {
      summary.completedItems += 1;
      summary.updatedRequestIds.push(...result.updatedRequestIds);
    } else {
      summary.failedItems += 1;
      summary.failures.push({ inboxId: result.inboxId, error: result.error ?? 'Unknown error' });
    }
  }
  summary.updatedRequestIds = [...new Set(summary.updatedRequestIds)];
  return summary;
}
