import { missingVehicleScrapeStatusValue } from '@data/dataverseOptionSets';
import {
  extractDriveArabiaPriceRows,
  extractDriveArabiaSpecsForTrim,
  extractDriveArabiaTrimPrices,
  normalizeToDataverse,
  resolveDriveArabiaTrimPrice,
} from '@parsers';
import { missingVehicleRepository } from '@repositories';
import type { MissingVehicleRequest } from '@types';
import {
  persistDriveArabiaEvidence,
  persistDriveArabiaEvidenceIntoPreparedTarget,
  type DriveArabiaPreparedTargetContext,
  type DriveArabiaEvidenceInput,
} from './driveArabiaDualWrite';
import {
  cleanDriveArabiaSourceUrl,
  parseDriveArabiaPadCorrelation,
  type DriveArabiaPadCorrelation,
} from './driveArabiaUrl';
import { resolvePreparedDriveArabiaTarget } from './multiSourceOrchestrator';

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
  /** Process one exact relay item returned by an automated desktop flow. */
  inboxId?: string;
  functionBaseUrl?: string;
  fetchFn?: typeof fetch;
  maxItems?: number;
  updateScrapeResult?: (id: string, fields: ScrapeResultUpdate) => Promise<void>;
  persistEvidence?: (input: DriveArabiaEvidenceInput) => Promise<string | undefined>;
  resolvePreparedTarget?: (
    request: MissingVehicleRequest,
    correlation: DriveArabiaPadCorrelation,
  ) => Promise<DriveArabiaPreparedTargetContext | null>;
  persistPreparedEvidence?: (
    input: DriveArabiaEvidenceInput,
    target: DriveArabiaPreparedTargetContext,
  ) => Promise<string | undefined>;
}

export interface InboxEvidenceWarning {
  requestId: string;
  error: string;
}

export interface InboxItemResult {
  inboxId?: string;
  status: 'empty' | 'complete' | 'error' | 'waiting';
  updatedRequestIds: string[];
  evidenceWarnings: InboxEvidenceWarning[];
  error?: string;
}

export interface InboxProcessSummary {
  processedItems: number;
  completedItems: number;
  failedItems: number;
  waitingItems: number;
  updatedRequestIds: string[];
  failures: Array<{ inboxId?: string; error: string }>;
  evidenceWarnings: InboxEvidenceWarning[];
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
  inboxId?: string,
): Promise<ScrapeInboxItem | null> {
  const url = new URL(endpoint(baseUrl, 'next_pending'));
  if (inboxId) {
    url.searchParams.set('inboxId', inboxId);
  }
  const response = await fetchFn(url.toString());
  const body = await readJson(response);
  if (
    response.status === 404 &&
    (body.error === 'no_pending' || (inboxId && body.error === 'not_found'))
  ) {
    return null;
  }
  if (!response.ok) {
    throw new Error(String(body.error ?? `Inbox request failed (${response.status})`));
  }
  return validateItem(body);
}

/** Find the exact pending PAD item for one prepared Run/source attempt. */
export async function findScrapeInboxItemByCorrelation(
  correlation: DriveArabiaPadCorrelation,
  options: {
    functionBaseUrl?: string;
    fetchFn?: typeof fetch;
  } = {},
): Promise<ScrapeInboxItem | null> {
  const runCorrelationId = correlation.runCorrelationId.trim();
  if (
    !runCorrelationId ||
    !Number.isInteger(correlation.attemptNumber) ||
    correlation.attemptNumber < 1
  ) {
    throw new Error('A Run correlation ID and positive attempt number are required');
  }

  const fetchFn = options.fetchFn ?? fetch;
  const url = new URL(endpoint(options.functionBaseUrl ?? AZURE_FUNCTION_URL, 'next_pending'));
  url.searchParams.set('runCorrelationId', runCorrelationId);
  url.searchParams.set('attemptNumber', String(correlation.attemptNumber));
  const response = await fetchFn(url.toString());
  const body = await readJson(response);
  if (response.status === 404 && body.error === 'not_found') {
    return null;
  }
  if (!response.ok) {
    throw new Error(String(body.error ?? `Inbox correlation lookup failed (${response.status})`));
  }

  const item = validateItem(body);
  const actual = parseDriveArabiaPadCorrelation(item.url);
  if (
    !actual ||
    actual.runCorrelationId !== runCorrelationId ||
    actual.attemptNumber !== correlation.attemptNumber
  ) {
    throw new Error('Inbox response correlation does not match the prepared DriveArabia target');
  }
  return item;
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

function hasPadCorrelationMarker(urlValue: string): boolean {
  try {
    const fragment = new URLSearchParams(new URL(urlValue).hash.replace(/^#/, ''));
    return fragment.has('vpiRun') || fragment.has('vpiAttempt');
  } catch {
    return false;
  }
}

function matchingRequests(
  item: ScrapeInboxItem,
  requests: MissingVehicleRequest[],
): Array<{
  request: MissingVehicleRequest;
  sourceTrim: string;
  minPrice: number;
  maxPrice: number;
}> {
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

  const matches: Array<{
    request: MissingVehicleRequest;
    sourceTrim: string;
    minPrice: number;
    maxPrice: number;
  }> = [];
  for (const request of requests) {
    const requestModel = comparable(request.model);
    const modelMatches =
      requestModel === vehicle.model || requestModel === `${vehicle.make}${vehicle.model}`;
    if (comparable(request.make) !== vehicle.make || !modelMatches) {
      continue;
    }
    const row = resolveDriveArabiaTrimPrice(rows, request.trim, request.modelYear);
    if (row) {
      matches.push({
        request,
        sourceTrim: row.trim,
        minPrice: row.minPrice,
        maxPrice: row.maxPrice,
      });
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
  const persistEvidence = options.persistEvidence ?? persistDriveArabiaEvidence;
  const resolvePreparedTarget =
    options.resolvePreparedTarget ??
    ((request: MissingVehicleRequest, correlation: DriveArabiaPadCorrelation) =>
      resolvePreparedDriveArabiaTarget(request.id, correlation));
  const persistPreparedEvidence =
    options.persistPreparedEvidence ?? persistDriveArabiaEvidenceIntoPreparedTarget;

  const pending = await fetchPendingItem(fetchFn, baseUrl, options.inboxId);
  if (!pending) {
    return { status: 'empty', updatedRequestIds: [], evidenceWarnings: [] };
  }

  let item: ScrapeInboxItem;
  try {
    item = pending.html ? pending : await fetchInboxHtml(fetchFn, baseUrl, pending.inboxId);
    const matches = matchingRequests(item, options.requests);
    if (matches.length === 0) {
      throw new NoMatchingRequestError(
        'No matching missing-vehicle request found for the captured make/model/year/trim',
      );
    }

    const scrapedValue = missingVehicleScrapeStatusValue('Scraped') ?? 4;
    const sourceUrl = cleanDriveArabiaSourceUrl(item.url);
    const correlation = parseDriveArabiaPadCorrelation(item.url);
    const hasCorrelationMarker = hasPadCorrelationMarker(item.url);
    const updatedRequestIds: string[] = [];
    const evidenceWarnings: InboxEvidenceWarning[] = [];
    let correlatedTargetFound = false;
    for (const match of matches) {
      // Resolve one unique engine-signature match from PAD-captured accordion
      // bodies. Without that evidence, only the exact JSON-LD-selected trim is
      // eligible, preserving the previous no-cross-trim-contamination rule.
      const specs = extractDriveArabiaSpecsForTrim(item.html!, match.sourceTrim);
      const specsMatch =
        specs.trim !== undefined &&
        comparable(specs.trim) === comparable(match.sourceTrim) &&
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
          url: sourceUrl,
          transport: 'pad',
          inboxId: item.inboxId,
          trim: match.sourceTrim,
          ...(comparable(match.sourceTrim) !== comparable(match.request.trim) && {
            requestedTrim: match.request.trim,
          }),
          year: match.request.modelYear,
          ...(specsMatch && { specs }),
        }),
        scrapedSources: sourceUrl,
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
      try {
        const evidenceInput: DriveArabiaEvidenceInput = {
          request: match.request,
          sourceTrim: match.sourceTrim,
          inboxId: item.inboxId,
          sourceUrl,
          minimumPrice: match.minPrice,
          maximumPrice: match.maxPrice,
          ...(specsMatch && { specs }),
        };
        let warning: string | undefined;
        if (correlation) {
          const target = await resolvePreparedTarget(match.request, correlation);
          if (target) {
            correlatedTargetFound = true;
            warning = await persistPreparedEvidence(evidenceInput, target);
          }
        } else if (hasCorrelationMarker) {
          warning = 'DriveArabia PAD correlation is malformed';
        } else {
          warning = await persistEvidence(evidenceInput);
        }
        if (warning) {
          evidenceWarnings.push({ requestId: match.request.id, error: warning });
        }
      } catch (error) {
        evidenceWarnings.push({
          requestId: match.request.id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
      updatedRequestIds.push(match.request.id);
    }
    if (correlation && !correlatedTargetFound && evidenceWarnings.length === 0) {
      evidenceWarnings.push({
        requestId: matches[0]!.request.id,
        error: `No prepared DriveArabia target matches Run correlation ${correlation.runCorrelationId}`,
      });
    }
    if (correlation && evidenceWarnings.length > 0) {
      return {
        inboxId: item.inboxId,
        status: 'waiting',
        updatedRequestIds,
        evidenceWarnings,
        error: evidenceWarnings[0]!.error,
      };
    }
    await acknowledge(fetchFn, baseUrl, item.inboxId, 'Complete');
    return {
      inboxId: item.inboxId,
      status: 'complete',
      updatedRequestIds,
      evidenceWarnings,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown inbox processing error';
    if (error instanceof NoMatchingRequestError) {
      return {
        inboxId: pending.inboxId,
        status: 'waiting',
        updatedRequestIds: [],
        evidenceWarnings: [],
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
        evidenceWarnings: [],
        error: `${message}; failed to mark Error: ${ackMessage}`,
      };
    }
    return {
      inboxId: pending.inboxId,
      status: 'error',
      updatedRequestIds: [],
      evidenceWarnings: [],
      error: message,
    };
  }
}

/** Drain pending PAD items up to a safety cap; each item is acknowledged exactly once. */
export async function processScrapeInbox(
  options: ProcessScrapeInboxOptions,
): Promise<InboxProcessSummary> {
  const maxItems = options.inboxId
    ? 1
    : Math.max(1, Math.min(options.maxItems ?? DEFAULT_MAX_ITEMS, 100));
  const summary: InboxProcessSummary = {
    processedItems: 0,
    completedItems: 0,
    failedItems: 0,
    waitingItems: 0,
    updatedRequestIds: [],
    failures: [],
    evidenceWarnings: [],
  };

  for (let index = 0; index < maxItems; index += 1) {
    const result = await processNextScrapeInboxItem(options);
    if (result.status === 'empty') {
      break;
    }
    if (result.status === 'waiting') {
      summary.waitingItems += 1;
      summary.updatedRequestIds.push(...result.updatedRequestIds);
      summary.evidenceWarnings.push(...result.evidenceWarnings);
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
      summary.evidenceWarnings.push(...result.evidenceWarnings);
    } else {
      summary.failedItems += 1;
      summary.failures.push({ inboxId: result.inboxId, error: result.error ?? 'Unknown error' });
    }
  }
  summary.updatedRequestIds = [...new Set(summary.updatedRequestIds)];
  return summary;
}
