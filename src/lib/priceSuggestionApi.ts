/**
 * Power Pages Web API — Price Suggestion CRUD
 *
 * Users suggest pricing corrections/updates for existing vehicles.
 * Creates, reads, and updates price suggestion records via the Web API.
 *
 * @see ../data/dataverseConfig.ts for field logical names
 * @see ../data/dataverseOptionSets.ts for choice field mappings
 */

import { API_BASE, ENTITIES, PRICE_SUGGESTION_FIELDS } from '@data/dataverseConfig';
import { priceSuggestionStatusLabel } from '@data/dataverseOptionSets';
import type { PriceSuggestion } from '@types';
import { safeFetch, safeFetchWithMeta } from './safeAjax';

interface ODataResponse {
  value: Record<string, unknown>[];
}

/**
 * Create a price suggestion record.
 *
 * Uses safeFetchWithMeta which handles both webapi.safeAjax (primary)
 * and shell.getTokenDeferred() + native fetch (fallback).
 */
export async function upsertPriceSuggestion(payload: {
  comment?: string;
  minPrice?: number;
  maxPrice?: number;
  sourceUrl?: string;
  submittedBy?: string;
  vehicleId: string;
}): Promise<string> {
  const baseUrl = `${API_BASE}/${ENTITIES.PRICE_SUGGESTION}`;

  const record: Record<string, unknown> = {};

  // Set all fields explicitly — matching the Dataverse entity schema
  record['vpi_Vehicle@odata.bind'] = payload.vehicleId
    ? `/${ENTITIES.VEHICLE}(${payload.vehicleId})`
    : null;
  record.vpi_minprice = payload.minPrice ?? null;
  record.vpi_maxprice = payload.maxPrice ?? null;
  record.vpi_sourceurl = payload.sourceUrl ?? null;
  record.vpi_comment = payload.comment ?? null;
  record.vpi_submittedby = payload.submittedBy ?? null;
  record.vpi_name = payload.submittedBy
    ? `Suggestion from ${payload.submittedBy}`
    : 'Price suggestion';

  const { meta } = await safeFetchWithMeta<Record<string, unknown>>({
    url: baseUrl,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(record),
  });

  const entityId =
    meta.getHeader('entityid')
    ?? meta.getHeader('OData-EntityId')?.match(/\(([^)]+)\)/)?.[1];

  if (entityId) return entityId;
  throw new Error('Price suggestion created but no entity ID returned');
}

/**
 * Fetch all price suggestions.
 */
export async function fetchPriceSuggestions(): Promise<PriceSuggestion[]> {
  const baseUrl = `${API_BASE}/${ENTITIES.PRICE_SUGGESTION}`;

  const resp: ODataResponse = await safeFetchWithMeta<ODataResponse>({
    url: `${baseUrl}?$orderby=createdon desc`,
    headers: { Prefer: 'odata.include-annotations=*' },
  }).then((r) => r.data);

  return (resp.value ?? []).map((raw) => ({
    id: (raw[PRICE_SUGGESTION_FIELDS.ID] as string) ?? '',
    comment: (raw[PRICE_SUGGESTION_FIELDS.COMMENT] as string) ?? undefined,
    minPrice: raw[PRICE_SUGGESTION_FIELDS.MIN_PRICE] as number | undefined,
    maxPrice: raw[PRICE_SUGGESTION_FIELDS.MAX_PRICE] as number | undefined,
    sourceUrl: (raw[PRICE_SUGGESTION_FIELDS.SOURCE_URL] as string) ?? undefined,
    submittedBy: (raw[PRICE_SUGGESTION_FIELDS.SUBMITTED_BY] as string) ?? undefined,
    status: (raw[`${PRICE_SUGGESTION_FIELDS.STATUS}@OData.Community.Display.V1.FormattedValue`] as string | undefined) ?? priceSuggestionStatusLabel(raw[PRICE_SUGGESTION_FIELDS.STATUS]),
    statusValue: (raw[PRICE_SUGGESTION_FIELDS.STATUS] as number | null) ?? undefined,
    createdOn: raw[PRICE_SUGGESTION_FIELDS.CREATED_ON]
      ? new Date(raw[PRICE_SUGGESTION_FIELDS.CREATED_ON] as string)
      : undefined,
  }));
}

/**
 * Update the status of a price suggestion.
 *
 * @param id          - Record GUID
 * @param statusValue - Raw optionset integer value from Dataverse
 */
export async function updatePriceSuggestionStatus(
  id: string,
  statusValue: number,
): Promise<void> {
  const baseUrl = `${API_BASE}/${ENTITIES.PRICE_SUGGESTION}`;

  await safeFetch<void>({
    url: `${baseUrl}(${id})`,
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'If-Match': '*',
    },
    body: JSON.stringify({ [PRICE_SUGGESTION_FIELDS.STATUS]: statusValue }),
  });
}
