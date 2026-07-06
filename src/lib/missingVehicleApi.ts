/**
 * Power Pages Web API — Missing Vehicle Request CRUD
 *
 * Simple create via the Dataverse Web API. Each user submission creates a
 * new record — no dedup or counter logic.
 *
 * @see ../data/dataverseConfig.ts for field logical names
 * @see ../data/dataverseOptionSets.ts for choice field mappings
 */

import { API_BASE, ENTITIES, VEHICLE_FIELDS, MISSING_VEHICLE_REQUEST_FIELDS } from '@data/dataverseConfig';
import {
  missingVehicleBodyTypeValue,
  missingVehicleCylindersValue,
  missingVehicleFuelTypeValue,
  missingVehicleTransmissionTypeValue,
  missingVehicleDriveTypeValue,
  missingVehicleStatusValue,
  missingVehicleCylindersLabel,
  missingVehicleFuelTypeLabel,
  missingVehicleTransmissionTypeLabel,
  missingVehicleDriveTypeLabel,
  missingVehicleStatusLabel,
  bodyTypeValue,
  powertrainValue,
  transmissionValue,
  driveTypeValue,
} from '@data/dataverseOptionSets';
import type { MissingVehicleRequest } from '@types';
import { safeFetch, safeFetchWithMeta } from './safeAjax';
import { createContact } from './contactApi';

interface ODataResponse {
  value: Record<string, unknown>[];
}

/** Look up a contact by email and return its GUID, or null if not found. */
async function findContactIdByEmail(email: string): Promise<string | null> {
  const url = `${API_BASE}/contacts?$select=contactid&$filter=emailaddress1 eq '${email.replace(/'/g, "''")}'`;
  try {
    const resp: ODataResponse = await safeFetchWithMeta<ODataResponse>({ url }).then((r) => r.data);
    return (resp.value[0]?.contactid as string) ?? null;
  } catch {
    return null;
  }
}

function parseRawRecord(raw: Record<string, unknown>): MissingVehicleRequest {
  const bodyTypeKey = `${MISSING_VEHICLE_REQUEST_FIELDS.BODY_TYPE}@OData.Community.Display.V1.FormattedValue`;

  // Extract expanded contact data if available
  const contactRaw = raw[MISSING_VEHICLE_REQUEST_FIELDS.CONTACT_LOOKUP] as Record<string, unknown> | undefined;

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
    driveType: missingVehicleDriveTypeLabel(raw[MISSING_VEHICLE_REQUEST_FIELDS.DRIVE_TYPE]),
    status: missingVehicleStatusLabel(raw[MISSING_VEHICLE_REQUEST_FIELDS.STATUS]),
    minMileage: raw[MISSING_VEHICLE_REQUEST_FIELDS.MIN_MILEAGE] as number | undefined,
    maxMileage: raw[MISSING_VEHICLE_REQUEST_FIELDS.MAX_MILEAGE] as number | undefined,
    createdOn: raw[MISSING_VEHICLE_REQUEST_FIELDS.CREATED_ON]
      ? new Date(raw[MISSING_VEHICLE_REQUEST_FIELDS.CREATED_ON] as string)
      : undefined,
    contactName: contactRaw
      ? `${(contactRaw.firstname as string) ?? ''} ${(contactRaw.lastname as string) ?? ''}`.trim()
      : undefined,
    contactEmail: (contactRaw?.emailaddress1 as string) ?? undefined,
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
  driveType?: string;
  contactEmail?: string;
  contactName?: string;
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

  const driveTypeInt = payload.driveType
    ? missingVehicleDriveTypeValue(payload.driveType)
    : null;
  if (driveTypeInt !== null) {
    record[MISSING_VEHICLE_REQUEST_FIELDS.DRIVE_TYPE] = driveTypeInt;
  }

  // Contact lookup — resolve email to GUID, create if not found
  if (payload.contactEmail) {
    let contactId = await findContactIdByEmail(payload.contactEmail);
    if (!contactId) {
      // No existing contact — create one
      try {
        const [firstName = '', ...rest] = (payload.contactName ?? '').split(' ');
        const lastName = rest.join(' ');
        contactId = await createContact({
          firstname: firstName || null,
          lastname: lastName || null,
          emailaddress1: payload.contactEmail,
        });
      } catch {
        // Contact creation failed — proceed without linking
      }
    }
    if (contactId) {
      record[`${MISSING_VEHICLE_REQUEST_FIELDS.CONTACT_LOOKUP}@odata.bind`] = `/contacts(${contactId})`;
    }
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
    url: `${baseUrl}?$expand=vpi_Contact($select=firstname,lastname,emailaddress1)&$orderby=createdon desc`,
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

/**
 * Approve a missing vehicle request: create a Vehicle Data record and update status to Approved.
 *
 * Field mapping (MVR → Vehicle Data):
 *   Make → Make, Model → Model, Model Year → Year, Trim → Spec,
 *   Body Type → Body Type, Cylinders → Cylinders, Fuel Type → Powertrain Type,
 *   Transmission Type → Transmission, Drive Type → Drive Type
 */
export async function approveAndCreateVehicle(mvr: MissingVehicleRequest): Promise<void> {
  const vehicleEntity = `${API_BASE}/${ENTITIES.VEHICLE}`;
  const mvrEntity = `${API_BASE}/${ENTITIES.MISSING_VEHICLE_REQUEST}`;

  // Build vehicle data record using label-based optionset conversion
  const vehicle: Record<string, unknown> = {
    [VEHICLE_FIELDS.NAME]: `MVR-${mvr.make}-${mvr.model}-${mvr.modelYear}`,
    [VEHICLE_FIELDS.MAKE]: mvr.make,
    [VEHICLE_FIELDS.MODEL]: mvr.model,
    [VEHICLE_FIELDS.YEAR]: String(mvr.modelYear),
    [VEHICLE_FIELDS.SPEC]: mvr.trim,
  };

  if (mvr.bodyType) {
    const bt = bodyTypeValue(mvr.bodyType);
    if (bt !== null) vehicle[VEHICLE_FIELDS.BODY_TYPE] = bt;
  }
  if (mvr.cylinders) {
    const cyl = parseInt(mvr.cylinders, 10);
    if (!isNaN(cyl)) vehicle[VEHICLE_FIELDS.CYLINDERS] = cyl;
  }
  if (mvr.fuelType) {
    const pt = powertrainValue(mvr.fuelType);
    if (pt !== null) vehicle[VEHICLE_FIELDS.POWERTRAIN_TYPE] = pt;
  }
  if (mvr.transmissionType) {
    const trans = transmissionValue(mvr.transmissionType);
    if (trans !== null) vehicle[VEHICLE_FIELDS.TRANSMISSION] = trans;
  }
  if (mvr.driveType) {
    const dt = driveTypeValue(mvr.driveType);
    if (dt !== null) vehicle[VEHICLE_FIELDS.DRIVE_TYPE] = dt;
  }

  // Step 1: Create the vehicle data record
  const { meta } = await safeFetchWithMeta<Record<string, unknown>>({
    url: vehicleEntity,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(vehicle),
  });

  const vehicleId =
    meta.getHeader('entityid')
    ?? meta.getHeader('OData-EntityId')?.match(/\(([^)]+)\)/)?.[1];

  if (!vehicleId) {
    throw new Error('Vehicle created but no entity ID returned');
  }

  // Step 2: Update MVR status to Approved and link to the new vehicle
  const statusValue = missingVehicleStatusValue('Approved');
  const patchBody: Record<string, unknown> = {};
  if (statusValue !== null) {
    patchBody[MISSING_VEHICLE_REQUEST_FIELDS.STATUS] = statusValue;
  }
  patchBody[`${MISSING_VEHICLE_REQUEST_FIELDS.MISSING_VEHICLE_LOOKUP}@odata.bind`] =
    `/vpi_vehicledatas(${vehicleId})`;

  await safeFetch<void>({
    url: `${mvrEntity}(${mvr.id})`,
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'If-Match': '*',
    },
    body: JSON.stringify(patchBody),
  });
}
