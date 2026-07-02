/**
 * Power Pages Web API — Missing Vehicle Request CRUD
 *
 * Simple create via the Dataverse Web API. Each user submission creates a
 * new record — no dedup or counter logic.
 *
 * @see ../data/dataverseConfig.ts for field logical names
 * @see ../data/dataverseOptionSets.ts for choice field mappings
 */

import { API_BASE, ENTITIES, MISSING_VEHICLE_REQUEST_FIELDS } from '@data/dataverseConfig';
import {
  missingVehicleBodyTypeValue,
  missingVehicleCylindersValue,
  missingVehicleFuelTypeValue,
  missingVehicleTransmissionTypeValue,
  missingVehicleStatusValue,
  missingVehicleCylindersLabel,
  missingVehicleFuelTypeLabel,
  missingVehicleTransmissionTypeLabel,
  missingVehicleStatusLabel,
} from '@data/dataverseOptionSets';
import type { MissingVehicleRequest } from '@types';
import { safeFetch, safeFetchWithMeta } from './safeAjax';

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
    cylinders: missingVehicleCylindersLabel(raw[MISSING_VEHICLE_REQUEST_FIELDS.CYLINDERS]),
    fuelType: missingVehicleFuelTypeLabel(raw[MISSING_VEHICLE_REQUEST_FIELDS.FUEL_TYPE]),
    transmissionType: missingVehicleTransmissionTypeLabel(raw[MISSING_VEHICLE_REQUEST_FIELDS.TRANSMISSION_TYPE]),
    status: missingVehicleStatusLabel(raw[MISSING_VEHICLE_REQUEST_FIELDS.STATUS]),
    minMileage: raw[MISSING_VEHICLE_REQUEST_FIELDS.MIN_MILEAGE] as number | undefined,
    maxMileage: raw[MISSING_VEHICLE_REQUEST_FIELDS.MAX_MILEAGE] as number | undefined,
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
  bodyType?: string;
  trim: string;
  modelYear: number;
  cylinders?: string;
  fuelType?: string;
  transmissionType?: string;
  minMileage?: number;
  maxMileage?: number;
}): Promise<string> {
  const baseUrl = `${API_BASE}/${ENTITIES.MISSING_VEHICLE_REQUEST}`;

  const record: Record<string, unknown> = {
    [MISSING_VEHICLE_REQUEST_FIELDS.MAKE]: payload.make,
    [MISSING_VEHICLE_REQUEST_FIELDS.MODEL]: payload.model,
    [MISSING_VEHICLE_REQUEST_FIELDS.TRIM]: payload.trim,
    [MISSING_VEHICLE_REQUEST_FIELDS.MODEL_YEAR]: payload.modelYear,
  };

  // Optional choice fields — only send if provided
  const bodyTypeInt = payload.bodyType
    ? missingVehicleBodyTypeValue(payload.bodyType)
    : null;
  if (bodyTypeInt !== null) {
    record[MISSING_VEHICLE_REQUEST_FIELDS.BODY_TYPE] = bodyTypeInt;
  }

  const cylindersInt = payload.cylinders
    ? missingVehicleCylindersValue(payload.cylinders)
    : null;
  if (cylindersInt !== null) {
    record[MISSING_VEHICLE_REQUEST_FIELDS.CYLINDERS] = cylindersInt;
  }

  const fuelTypeInt = payload.fuelType
    ? missingVehicleFuelTypeValue(payload.fuelType)
    : null;
  if (fuelTypeInt !== null) {
    record[MISSING_VEHICLE_REQUEST_FIELDS.FUEL_TYPE] = fuelTypeInt;
  }

  const transmissionInt = payload.transmissionType
    ? missingVehicleTransmissionTypeValue(payload.transmissionType)
    : null;
  if (transmissionInt !== null) {
    record[MISSING_VEHICLE_REQUEST_FIELDS.TRANSMISSION_TYPE] = transmissionInt;
  }

  if (payload.minMileage !== undefined) {
    record[MISSING_VEHICLE_REQUEST_FIELDS.MIN_MILEAGE] = payload.minMileage;
  }

  if (payload.maxMileage !== undefined) {
    record[MISSING_VEHICLE_REQUEST_FIELDS.MAX_MILEAGE] = payload.maxMileage;
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

/**
 * Update the status of a missing vehicle request.
 */
export async function updateMissingVehicleRequestStatus(
  id: string,
  statusLabel: string,
): Promise<void> {
  const statusValue = missingVehicleStatusValue(statusLabel);
  if (statusValue === null) return;

  const baseUrl = `${API_BASE}/${ENTITIES.MISSING_VEHICLE_REQUEST}`;

  await safeFetch<void>({
    url: `${baseUrl}(${id})`,
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'If-Match': '*',
    },
    body: JSON.stringify({ [MISSING_VEHICLE_REQUEST_FIELDS.STATUS]: statusValue }),
  });
}
