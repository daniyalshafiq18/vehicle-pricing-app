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
  missingVehicleScrapeStatusLabel,
  bodyTypeValue,
  powertrainValue,
  transmissionValue,
  driveTypeValue,
  categoryValue,
  DOORS,
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
  const categoryKey = `${MISSING_VEHICLE_REQUEST_FIELDS.CATEGORY}@OData.Community.Display.V1.FormattedValue`;
  const doorsKey = `${MISSING_VEHICLE_REQUEST_FIELDS.DOORS}@OData.Community.Display.V1.FormattedValue`;
  const seatsKey = `${MISSING_VEHICLE_REQUEST_FIELDS.SEATS}@OData.Community.Display.V1.FormattedValue`;

  // Extract expanded contact data if available
  const contactRaw = raw[MISSING_VEHICLE_REQUEST_FIELDS.CONTACT_LOOKUP] as Record<string, unknown> | undefined;

  return {
    id: (raw[MISSING_VEHICLE_REQUEST_FIELDS.ID] as string) ?? '',
    name: (raw[MISSING_VEHICLE_REQUEST_FIELDS.NAME] as string) ?? undefined,
    make: (raw[MISSING_VEHICLE_REQUEST_FIELDS.MAKE] as string) ?? '',
    model: (raw[MISSING_VEHICLE_REQUEST_FIELDS.MODEL] as string) ?? '',
    bodyType: (raw[bodyTypeKey] as string) ?? '',
    trim: (raw[MISSING_VEHICLE_REQUEST_FIELDS.TRIM] as string) ?? '',
    modelYear: (raw[MISSING_VEHICLE_REQUEST_FIELDS.MODEL_YEAR] as number) ?? 0,
    cylinders: missingVehicleCylindersLabel(raw[MISSING_VEHICLE_REQUEST_FIELDS.CYLINDERS]),
    fuelType: missingVehicleFuelTypeLabel(raw[MISSING_VEHICLE_REQUEST_FIELDS.FUEL_TYPE]),
    transmissionType: missingVehicleTransmissionTypeLabel(raw[MISSING_VEHICLE_REQUEST_FIELDS.TRANSMISSION_TYPE]),
    driveType: missingVehicleDriveTypeLabel(raw[MISSING_VEHICLE_REQUEST_FIELDS.DRIVE_TYPE]),
    engineSize: raw[MISSING_VEHICLE_REQUEST_FIELDS.ENGINE_SIZE] as number | undefined,
    doors: (raw[doorsKey] as string) ?? undefined,
    seats: (raw[seatsKey] as string) ?? undefined,
    category: (raw[categoryKey] as string) ?? undefined,
    // Keep the raw option-set integer too — the label may differ in casing/separators
    // from the CATEGORY map keys, so round-tripping the label is fragile (see approve).
    categoryValue: (() => {
      const v = raw[MISSING_VEHICLE_REQUEST_FIELDS.CATEGORY];
      const n = typeof v === 'string' ? Number(v) : v;
      return typeof n === 'number' && !isNaN(n) ? n : undefined;
    })(),
    status: missingVehicleStatusLabel(raw[MISSING_VEHICLE_REQUEST_FIELDS.STATUS]),
    minPrice: raw[MISSING_VEHICLE_REQUEST_FIELDS.MIN_PRICE] as number | undefined,
    maxPrice: raw[MISSING_VEHICLE_REQUEST_FIELDS.MAX_PRICE] as number | undefined,
    mileage: raw[MISSING_VEHICLE_REQUEST_FIELDS.MILEAGE] as number | undefined,
    createdOn: raw[MISSING_VEHICLE_REQUEST_FIELDS.CREATED_ON]
      ? new Date(raw[MISSING_VEHICLE_REQUEST_FIELDS.CREATED_ON] as string)
      : undefined,
    contactName: contactRaw
      ? `${(contactRaw.firstname as string) ?? ''} ${(contactRaw.lastname as string) ?? ''}`.trim()
      : undefined,
    contactEmail: (contactRaw?.emailaddress1 as string) ?? undefined,
    // Scrape result fields
    scrapeStatus: missingVehicleScrapeStatusLabel(raw[MISSING_VEHICLE_REQUEST_FIELDS.SCRAPE_STATUS]),
    scrapeStatusValue: raw[MISSING_VEHICLE_REQUEST_FIELDS.SCRAPE_STATUS] as number | undefined,
    scrapedListings: raw[MISSING_VEHICLE_REQUEST_FIELDS.SCRAPED_LISTINGS] as string | undefined,
    scrapedMinPrice: raw[MISSING_VEHICLE_REQUEST_FIELDS.SCRAPED_MIN_PRICE] as number | undefined,
    scrapedMaxPrice: raw[MISSING_VEHICLE_REQUEST_FIELDS.SCRAPED_MAX_PRICE] as number | undefined,
    scrapedSources: raw[MISSING_VEHICLE_REQUEST_FIELDS.SCRAPED_SOURCES] as string | undefined,
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
  minPrice?: number;
  maxPrice?: number;
  // Scrape result fields (from Flow 3)
  scrapedMinPrice?: number;
  scrapedMaxPrice?: number;
  scrapedListings?: string;
  scrapedSources?: string;
  scrapeStatusValue?: number;
}): Promise<string> {
  const baseUrl = `${API_BASE}/${ENTITIES.MISSING_VEHICLE_REQUEST}`;

  // vpi_name is the table's Primary Name — set a composite title so the record
  // is identifiable in Dataverse views / lookups / Power Automate, not just in the app.
  // "Make Model Trim" (no Year) matches the established Vehicle Data Name convention.
  const record: Record<string, unknown> = {
    [MISSING_VEHICLE_REQUEST_FIELDS.NAME]: [payload.make, payload.model, payload.trim]
      .filter(Boolean)
      .join(' '),
    [MISSING_VEHICLE_REQUEST_FIELDS.MAKE]: payload.make,
    [MISSING_VEHICLE_REQUEST_FIELDS.MODEL]: payload.model,
    [MISSING_VEHICLE_REQUEST_FIELDS.TRIM]: payload.trim,
    [MISSING_VEHICLE_REQUEST_FIELDS.MODEL_YEAR]: payload.modelYear,
  };

  // Price fields
  if (payload.minPrice !== undefined) {
    record[MISSING_VEHICLE_REQUEST_FIELDS.MIN_PRICE] = payload.minPrice;
  }
  if (payload.maxPrice !== undefined) {
    record[MISSING_VEHICLE_REQUEST_FIELDS.MAX_PRICE] = payload.maxPrice;
  }

  // Scrape result fields (from Flow 3)
  if (payload.scrapedMinPrice !== undefined) {
    record[MISSING_VEHICLE_REQUEST_FIELDS.SCRAPED_MIN_PRICE] = payload.scrapedMinPrice;
  }
  if (payload.scrapedMaxPrice !== undefined) {
    record[MISSING_VEHICLE_REQUEST_FIELDS.SCRAPED_MAX_PRICE] = payload.scrapedMaxPrice;
  }
  if (payload.scrapedListings !== undefined) {
    record[MISSING_VEHICLE_REQUEST_FIELDS.SCRAPED_LISTINGS] = payload.scrapedListings;
  }
  if (payload.scrapedSources !== undefined) {
    record[MISSING_VEHICLE_REQUEST_FIELDS.SCRAPED_SOURCES] = payload.scrapedSources;
  }
  if (payload.scrapeStatusValue !== undefined) {
    record[MISSING_VEHICLE_REQUEST_FIELDS.SCRAPE_STATUS] = payload.scrapeStatusValue;
  }

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

  const select = [
    MISSING_VEHICLE_REQUEST_FIELDS.ID,
    MISSING_VEHICLE_REQUEST_FIELDS.NAME,
    MISSING_VEHICLE_REQUEST_FIELDS.MAKE,
    MISSING_VEHICLE_REQUEST_FIELDS.MODEL,
    MISSING_VEHICLE_REQUEST_FIELDS.TRIM,
    MISSING_VEHICLE_REQUEST_FIELDS.MODEL_YEAR,
    MISSING_VEHICLE_REQUEST_FIELDS.BODY_TYPE,
    MISSING_VEHICLE_REQUEST_FIELDS.CYLINDERS,
    MISSING_VEHICLE_REQUEST_FIELDS.FUEL_TYPE,
    MISSING_VEHICLE_REQUEST_FIELDS.TRANSMISSION_TYPE,
    MISSING_VEHICLE_REQUEST_FIELDS.DRIVE_TYPE,
    MISSING_VEHICLE_REQUEST_FIELDS.ENGINE_SIZE,
    MISSING_VEHICLE_REQUEST_FIELDS.DOORS,
    MISSING_VEHICLE_REQUEST_FIELDS.SEATS,
    MISSING_VEHICLE_REQUEST_FIELDS.CATEGORY,
    MISSING_VEHICLE_REQUEST_FIELDS.STATUS,
    MISSING_VEHICLE_REQUEST_FIELDS.MIN_PRICE,
    MISSING_VEHICLE_REQUEST_FIELDS.MAX_PRICE,
    MISSING_VEHICLE_REQUEST_FIELDS.MILEAGE,
    MISSING_VEHICLE_REQUEST_FIELDS.CREATED_ON,
    MISSING_VEHICLE_REQUEST_FIELDS.SCRAPE_STATUS,
    MISSING_VEHICLE_REQUEST_FIELDS.SCRAPED_LISTINGS,
    MISSING_VEHICLE_REQUEST_FIELDS.SCRAPED_MIN_PRICE,
    MISSING_VEHICLE_REQUEST_FIELDS.SCRAPED_MAX_PRICE,
    MISSING_VEHICLE_REQUEST_FIELDS.SCRAPED_SOURCES,
  ].join(',');

  const resp: ODataResponse = await safeFetchWithMeta<ODataResponse>({
    url: `${baseUrl}?$select=${select}&$expand=vpi_Contact($select=firstname,lastname,emailaddress1)&$orderby=createdon desc`,
    headers: { Prefer: 'odata.include-annotations=*' },
  }).then((r) => r.data);

  return (resp.value ?? []).map(parseRawRecord);
}

/**
 * Fetch a single missing vehicle request by ID.
 * Returns null if not found or on error (caller should handle gracefully).
 */
export async function fetchMissingVehicleRequestById(id: string): Promise<MissingVehicleRequest | null> {
  const baseUrl = `${API_BASE}/${ENTITIES.MISSING_VEHICLE_REQUEST}`;

  const select = [
    MISSING_VEHICLE_REQUEST_FIELDS.ID,
    MISSING_VEHICLE_REQUEST_FIELDS.NAME,
    MISSING_VEHICLE_REQUEST_FIELDS.MAKE,
    MISSING_VEHICLE_REQUEST_FIELDS.MODEL,
    MISSING_VEHICLE_REQUEST_FIELDS.TRIM,
    MISSING_VEHICLE_REQUEST_FIELDS.MODEL_YEAR,
    MISSING_VEHICLE_REQUEST_FIELDS.BODY_TYPE,
    MISSING_VEHICLE_REQUEST_FIELDS.CYLINDERS,
    MISSING_VEHICLE_REQUEST_FIELDS.FUEL_TYPE,
    MISSING_VEHICLE_REQUEST_FIELDS.TRANSMISSION_TYPE,
    MISSING_VEHICLE_REQUEST_FIELDS.DRIVE_TYPE,
    MISSING_VEHICLE_REQUEST_FIELDS.ENGINE_SIZE,
    MISSING_VEHICLE_REQUEST_FIELDS.DOORS,
    MISSING_VEHICLE_REQUEST_FIELDS.SEATS,
    MISSING_VEHICLE_REQUEST_FIELDS.CATEGORY,
    MISSING_VEHICLE_REQUEST_FIELDS.STATUS,
    MISSING_VEHICLE_REQUEST_FIELDS.MIN_PRICE,
    MISSING_VEHICLE_REQUEST_FIELDS.MAX_PRICE,
    MISSING_VEHICLE_REQUEST_FIELDS.MILEAGE,
    MISSING_VEHICLE_REQUEST_FIELDS.CREATED_ON,
    MISSING_VEHICLE_REQUEST_FIELDS.SCRAPE_STATUS,
    MISSING_VEHICLE_REQUEST_FIELDS.SCRAPED_LISTINGS,
    MISSING_VEHICLE_REQUEST_FIELDS.SCRAPED_MIN_PRICE,
    MISSING_VEHICLE_REQUEST_FIELDS.SCRAPED_MAX_PRICE,
    MISSING_VEHICLE_REQUEST_FIELDS.SCRAPED_SOURCES,
  ].join(',');

  try {
    const raw = await safeFetchWithMeta<Record<string, unknown>>({
      url: `${baseUrl}(${id})?$select=${select}&$expand=vpi_Contact($select=firstname,lastname,emailaddress1)`,
      headers: { Prefer: 'odata.include-annotations=*' },
    }).then((r) => r.data);

    if (!raw || !raw[MISSING_VEHICLE_REQUEST_FIELDS.ID]) return null;
    return parseRawRecord(raw);
  } catch {
    return null;
  }
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
 * Update an existing missing vehicle request (PATCH).
 * Used to save scraped or user-corrected prices after creation.
 */
export async function updateMissingVehicleRequest(
  id: string,
  fields: { minPrice?: number; maxPrice?: number },
): Promise<void> {
  const baseUrl = `${API_BASE}/${ENTITIES.MISSING_VEHICLE_REQUEST}`;

  const body: Record<string, unknown> = {};
  if (fields.minPrice !== undefined) {
    body[MISSING_VEHICLE_REQUEST_FIELDS.MIN_PRICE] = fields.minPrice;
  }
  if (fields.maxPrice !== undefined) {
    body[MISSING_VEHICLE_REQUEST_FIELDS.MAX_PRICE] = fields.maxPrice;
  }

  if (Object.keys(body).length === 0) return;

  await safeFetch<void>({
    url: `${baseUrl}(${id})`,
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'If-Match': '*',
    },
    body: JSON.stringify(body),
  });
}

/**
 * Update the scrape results on an existing missing vehicle request (PATCH).
 * Called by the hook after triggering a Flow 3 scrape.
 * Accepts optional deep-scrape spec fields from the listing detail page.
 */
export async function updateMissingVehicleScrapeResult(
  id: string,
  fields: {
    scrapedMinPrice: number;
    scrapedMaxPrice: number;
    scrapedListings: string;
    scrapedSources: string;
    scrapeStatusValue: number;
    // Optional deep-scrape spec fields (pre-mapped to Dataverse values)
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
  },
): Promise<void> {
  const baseUrl = `${API_BASE}/${ENTITIES.MISSING_VEHICLE_REQUEST}`;

  const body: Record<string, unknown> = {
    [MISSING_VEHICLE_REQUEST_FIELDS.SCRAPED_MIN_PRICE]: fields.scrapedMinPrice,
    [MISSING_VEHICLE_REQUEST_FIELDS.SCRAPED_MAX_PRICE]: fields.scrapedMaxPrice,
    [MISSING_VEHICLE_REQUEST_FIELDS.SCRAPED_LISTINGS]: fields.scrapedListings,
    [MISSING_VEHICLE_REQUEST_FIELDS.SCRAPED_SOURCES]: fields.scrapedSources,
    [MISSING_VEHICLE_REQUEST_FIELDS.SCRAPE_STATUS]: fields.scrapeStatusValue,
  };

  // Write spec fields when the flow returned them
  if (fields.bodyTypeValue !== undefined) body[MISSING_VEHICLE_REQUEST_FIELDS.BODY_TYPE] = fields.bodyTypeValue;
  if (fields.fuelTypeValue !== undefined) body[MISSING_VEHICLE_REQUEST_FIELDS.FUEL_TYPE] = fields.fuelTypeValue;
  if (fields.transmissionValue !== undefined) body[MISSING_VEHICLE_REQUEST_FIELDS.TRANSMISSION_TYPE] = fields.transmissionValue;
  if (fields.driveTypeValue !== undefined) body[MISSING_VEHICLE_REQUEST_FIELDS.DRIVE_TYPE] = fields.driveTypeValue;
  if (fields.cylindersValue !== undefined) body[MISSING_VEHICLE_REQUEST_FIELDS.CYLINDERS] = fields.cylindersValue;
  if (fields.engineSizeValue !== undefined) body[MISSING_VEHICLE_REQUEST_FIELDS.ENGINE_SIZE] = fields.engineSizeValue;
  if (fields.doorsValue !== undefined) body[MISSING_VEHICLE_REQUEST_FIELDS.DOORS] = fields.doorsValue;
  if (fields.seatsValue !== undefined) body[MISSING_VEHICLE_REQUEST_FIELDS.SEATS] = fields.seatsValue;
  if (fields.categoryValue !== undefined) body[MISSING_VEHICLE_REQUEST_FIELDS.CATEGORY] = fields.categoryValue;
  if (fields.mileageValue !== undefined) body[MISSING_VEHICLE_REQUEST_FIELDS.MILEAGE] = fields.mileageValue;

  await safeFetch<void>({
    url: `${baseUrl}(${id})`,
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'If-Match': '*',
    },
    body: JSON.stringify(body),
  });
}

/**
 * Map an MVR fuel-type label to the Vehicle Data Powertrain label.
 * Petrol and Diesel both collapse to "Petrol/Diesel" (the one non-EV/HEV bucket in
 * the powertrain option set — there is no exact "Petrol" label there).
 */
function mvrFuelToPowertrainLabel(fuelType: string): string | undefined {
  const f = fuelType.toLowerCase();
  if (f === 'petrol' || f === 'diesel') return 'Petrol/Diesel';
  if (f === 'hybrid') return 'Hybrid';
  if (f === 'electric' || f === 'electrical') return 'Electric';
  return undefined;
}

/**
 * Approve a missing vehicle request: create a Vehicle Data record and update status to Approved.
 *
 * Field mapping (MVR → Vehicle Data):
 *   Make → Make, Model → Model, Model Year → Year, Trim → Spec,
 *   Body Type → Body Type, Cylinders → Cylinders, Fuel Type → Powertrain Type,
 *   Transmission Type → Transmission, Drive Type → Drive Type,
 *   Engine Size → Engine Size, Doors → Doors, Category → Category,
 *   Scraped Min/Max Price → Min/Max Price (market range from Flow 3).
 *   Name → composite "Make Model Trim" (no Year — matches existing Vehicle Data records and MVR vpi_name).
 */
export async function approveAndCreateVehicle(mvr: MissingVehicleRequest): Promise<void> {
  const vehicleEntity = `${API_BASE}/${ENTITIES.VEHICLE}`;
  const mvrEntity = `${API_BASE}/${ENTITIES.MISSING_VEHICLE_REQUEST}`;

  // Build vehicle data record using label-based optionset conversion
  const vehicle: Record<string, unknown> = {
    [VEHICLE_FIELDS.NAME]: [mvr.make, mvr.model, mvr.trim].filter(Boolean).join(' '),
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
    // MVR fuel label → Vehicle powertrain label: Petrol/Diesel both → Petrol/Diesel
    const ptLabel = mvrFuelToPowertrainLabel(mvr.fuelType);
    const pt = ptLabel ? powertrainValue(ptLabel) : null;
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
  if (mvr.engineSize) {
    // Plain decimal — no optionset conversion needed
    vehicle[VEHICLE_FIELDS.ENGINE_SIZE] = mvr.engineSize;
  }
  if (mvr.doors) {
    const d = DOORS[mvr.doors];
    if (d !== undefined) vehicle[VEHICLE_FIELDS.DOORS] = d;
  }
  // Prefer the raw option-set integer captured at read time — round-tripping the
  // label is fragile because MVR labels ("Non-GCC", "Other/Standard") can differ in
  // casing/separators from the CATEGORY map keys ("NON-GCC", "OTHER/STANDARD").
  if (mvr.categoryValue !== undefined) {
    vehicle[VEHICLE_FIELDS.CATEGORY] = mvr.categoryValue;
  } else if (mvr.category) {
    const cat = categoryValue(mvr.category);
    if (cat !== null) vehicle[VEHICLE_FIELDS.CATEGORY] = cat;
  }
  // Market price range from the Flow 3 scrape (only when the scrape returned prices)
  if (mvr.scrapedMinPrice) {
    vehicle[VEHICLE_FIELDS.MIN_PRICE] = mvr.scrapedMinPrice;
  }
  if (mvr.scrapedMaxPrice) {
    vehicle[VEHICLE_FIELDS.MAX_PRICE] = mvr.scrapedMaxPrice;
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
