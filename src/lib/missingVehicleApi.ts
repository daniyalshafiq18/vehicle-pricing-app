/**
 * Power Pages Web API — Missing Vehicle Request CRUD
 *
 * Simple create via the Dataverse Web API. Each user submission creates a
 * new record — no dedup or counter logic.
 */

import { API_BASE, ENTITIES, MISSING_VEHICLE_REQUEST_FIELDS } from '@data/dataverseConfig';
import { missingVehicleBodyTypeValue } from '@data/dataverseOptionSets';
import type { MissingVehicleRequest } from '@types';
import { safeFetchWithMeta } from './safeAjax';

interface ODataResponse {
  value: Record<string, unknown>[];
}

function parseRawRecord(raw: Record<string, unknown>): MissingVehicleRequest {
  const bodyTypeKey = `${MISSING_VEHICLE_REQUEST_FIELDS.BODY_TYPE}@OData.Community.Display.V1.FormattedValue`;

  return {
    id: (raw[MISSING_VEHICLE_REQUEST_FIELDS.ID] as string) ?? '',
    make: (raw[MISSING_VEHICLE_REQUEST_FIELDS.MAKE] as string) ?? '',
    model: (raw[MISSING_VEHICLE_REQUEST_FIELDS.MODEL] as string) ?? '',
    bodyType: (raw[bodyTypeKey] as string) ?? '',
    trim: (raw[MISSING_VEHICLE_REQUEST_FIELDS.TRIM] as string) ?? '',
    modelYear: (raw[MISSING_VEHICLE_REQUEST_FIELDS.MODEL_YEAR] as number) ?? 0,
    minPrice: raw[MISSING_VEHICLE_REQUEST_FIELDS.MIN_PRICE] as number | undefined,
    maxPrice: raw[MISSING_VEHICLE_REQUEST_FIELDS.MAX_PRICE] as number | undefined,
    minMileage: raw[MISSING_VEHICLE_REQUEST_FIELDS.MIN_MILEAGE] as number | undefined,
    maxMileage: raw[MISSING_VEHICLE_REQUEST_FIELDS.MAX_MILEAGE] as number | undefined,
    name: raw[MISSING_VEHICLE_REQUEST_FIELDS.NAME] as string | undefined,
    createdOn: raw[MISSING_VEHICLE_REQUEST_FIELDS.CREATED_ON]
      ? new Date(raw[MISSING_VEHICLE_REQUEST_FIELDS.CREATED_ON] as string)
      : undefined,
  };
}

/**
 * Create a missing vehicle request record.
 */
export async function upsertMissingVehicleRequest(payload: {
  make: string;
  model: string;
  bodyType: string;
  trim: string;
  modelYear: number;
}): Promise<string> {
  const baseUrl = `${API_BASE}/${ENTITIES.MISSING_VEHICLE_REQUEST}`;
  const bodyTypeInt = payload.bodyType
    ? missingVehicleBodyTypeValue(payload.bodyType)
    : null;

  const record: Record<string, unknown> = {
    [MISSING_VEHICLE_REQUEST_FIELDS.NAME]:
      `${payload.modelYear} ${payload.make} ${payload.model}`.trim(),
    [MISSING_VEHICLE_REQUEST_FIELDS.MAKE]: payload.make,
    [MISSING_VEHICLE_REQUEST_FIELDS.MODEL]: payload.model,
    [MISSING_VEHICLE_REQUEST_FIELDS.TRIM]: payload.trim,
    [MISSING_VEHICLE_REQUEST_FIELDS.MODEL_YEAR]: payload.modelYear,
  };

  if (bodyTypeInt !== null) {
    record[MISSING_VEHICLE_REQUEST_FIELDS.BODY_TYPE] = bodyTypeInt;
  }

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
  throw new Error('Missing vehicle request created but no entity ID returned');
}

/**
 * Fetch all missing vehicle requests.
 */
export async function fetchMissingVehicleRequests(): Promise<MissingVehicleRequest[]> {
  const baseUrl = `${API_BASE}/${ENTITIES.MISSING_VEHICLE_REQUEST}`;

  const resp: ODataResponse = await safeFetchWithMeta<ODataResponse>({
    url: `${baseUrl}?$orderby=createdon desc`,
    headers: { Prefer: 'odata.include-annotations=*' },
  }).then((r) => r.data);

  return (resp.value ?? []).map(parseRawRecord);
}
