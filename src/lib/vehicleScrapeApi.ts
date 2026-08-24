/**
 * Power Pages Web API operations for normalized multi-source scrape evidence.
 *
 * This module does not replace the legacy MVR scrape write path yet. It is the
 * persistence surface for the staged MVR -> Run -> Source Result migration.
 */

import {
  API_BASE,
  ENTITIES,
  VEHICLE_SCRAPE_RUN_FIELDS as RUN,
  VEHICLE_SCRAPE_SOURCE_RESULT_FIELDS as RESULT,
} from '@data/dataverseConfig';
import {
  VEHICLE_SCRAPE_PRICE_TYPE,
  VEHICLE_SCRAPE_PROCESSING_STATUS,
  VEHICLE_SCRAPE_RUN_STATUS,
  VEHICLE_SCRAPE_SOURCE,
  VEHICLE_SCRAPE_TRANSPORT,
  VEHICLE_SCRAPE_TRIGGER_TYPE,
} from '@data/dataverseOptionSets';
import type {
  CreateVehicleScrapeRunInput,
  CreateVehicleScrapeSourceResultInput,
  UpdateVehicleScrapeRunInput,
  UpdateVehicleScrapeSourceResultInput,
  VehicleScrapePriceType,
  VehicleScrapeProcessingStatus,
  VehicleScrapeRun,
  VehicleScrapeRunStatus,
  VehicleScrapeSource,
  VehicleScrapeSourceResult,
  VehicleScrapeTransport,
  VehicleScrapeTriggerType,
} from '@types';
import { safeFetch, safeFetchWithMeta } from './safeAjax';

interface ODataResponse {
  value: Record<string, unknown>[];
}

const FORMATTED_VALUE = '@OData.Community.Display.V1.FormattedValue';

function cleanGuid(value: string, label: string): string {
  const guid = value.trim().replace(/^\{?|\}?$/g, '');
  if (!/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(guid)) {
    throw new Error(`${label} must be a valid GUID`);
  }
  return guid;
}

function odataStringLiteral(value: string): string {
  return value.replace(/'/g, "''");
}

function entityIdFromHeaders(getHeader: (name: string) => string | null): string {
  const entityId =
    getHeader('entityid')
    ?? getHeader('OData-EntityId')?.match(/\(([^)]+)\)/)?.[1];
  if (!entityId) {
    throw new Error('Dataverse created the record but returned no entity ID');
  }
  return entityId;
}

function labelFromChoice<T extends string>(
  raw: Record<string, unknown>,
  field: string,
  choices: Record<string, number>,
  fallback: T,
): T {
  const formatted = raw[`${field}${FORMATTED_VALUE}`];
  if (typeof formatted === 'string') {
    return formatted as T;
  }
  const value = raw[field];
  const match = Object.entries(choices).find(([, option]) => option === value)?.[0];
  return (match ?? fallback) as T;
}

function optionalDate(raw: Record<string, unknown>, field: string): Date | undefined {
  const value = raw[field];
  return typeof value === 'string' ? new Date(value) : undefined;
}

function optionalNumber(raw: Record<string, unknown>, field: string): number | undefined {
  const value = raw[field];
  return typeof value === 'number' ? value : undefined;
}

function optionalString(raw: Record<string, unknown>, field: string): string | undefined {
  const value = raw[field];
  return typeof value === 'string' && value !== '' ? value : undefined;
}

function setOptional(
  record: Record<string, unknown>,
  field: string,
  value: unknown,
): void {
  if (value !== undefined) {
    record[field] = value instanceof Date ? value.toISOString() : value;
  }
}

function mapRun(raw: Record<string, unknown>): VehicleScrapeRun {
  return {
    id: (raw[RUN.ID] as string) ?? '',
    name: (raw[RUN.NAME] as string) ?? '',
    correlationId: (raw[RUN.CORRELATION_ID] as string) ?? '',
    overallStatus: labelFromChoice<VehicleScrapeRunStatus>(
      raw,
      RUN.OVERALL_STATUS,
      VEHICLE_SCRAPE_RUN_STATUS,
      'Queued',
    ),
    overallStatusValue: (raw[RUN.OVERALL_STATUS] as number) ?? 1,
    missingVehicleRequestId:
      (raw[RUN.MISSING_VEHICLE_REQUEST_LOOKUP_REF] as string) ?? '',
    triggerType: labelFromChoice<VehicleScrapeTriggerType>(
      raw,
      RUN.TRIGGER_TYPE,
      VEHICLE_SCRAPE_TRIGGER_TYPE,
      'Single Request',
    ),
    triggerTypeValue: (raw[RUN.TRIGGER_TYPE] as number) ?? 1,
    startedOn: optionalDate(raw, RUN.STARTED_ON),
    completedOn: optionalDate(raw, RUN.COMPLETED_ON),
    requestedSourceCount: optionalNumber(raw, RUN.REQUESTED_SOURCE_COUNT),
    successfulSourceCount: optionalNumber(raw, RUN.SUCCESSFUL_SOURCE_COUNT),
    failedSourceCount: optionalNumber(raw, RUN.FAILED_SOURCE_COUNT),
    batchCorrelationKey: optionalString(raw, RUN.BATCH_CORRELATION_KEY),
    errorSummary: optionalString(raw, RUN.ERROR_SUMMARY),
    requestedByContactId: optionalString(raw, RUN.REQUESTED_BY_CONTACT_LOOKUP_REF),
  };
}

function mapResult(raw: Record<string, unknown>): VehicleScrapeSourceResult {
  const priceTypeValue = optionalNumber(raw, RESULT.PRICE_TYPE);
  return {
    id: (raw[RESULT.ID] as string) ?? '',
    name: (raw[RESULT.NAME] as string) ?? '',
    resultCorrelationId: (raw[RESULT.RESULT_CORRELATION_ID] as string) ?? '',
    scrapeRunId: (raw[RESULT.SCRAPE_RUN_LOOKUP_REF] as string) ?? '',
    attemptNumber: (raw[RESULT.ATTEMPT_NUMBER] as number) ?? 1,
    source: labelFromChoice<VehicleScrapeSource>(
      raw,
      RESULT.SOURCE,
      VEHICLE_SCRAPE_SOURCE,
      'Other',
    ),
    sourceValue: (raw[RESULT.SOURCE] as number) ?? 4,
    transport: labelFromChoice<VehicleScrapeTransport>(
      raw,
      RESULT.TRANSPORT,
      VEHICLE_SCRAPE_TRANSPORT,
      'Other',
    ),
    transportValue: (raw[RESULT.TRANSPORT] as number) ?? 5,
    processingStatus: labelFromChoice<VehicleScrapeProcessingStatus>(
      raw,
      RESULT.PROCESSING_STATUS,
      VEHICLE_SCRAPE_PROCESSING_STATUS,
      'Queued',
    ),
    processingStatusValue: (raw[RESULT.PROCESSING_STATUS] as number) ?? 1,
    priceType: priceTypeValue === undefined
      ? undefined
      : labelFromChoice<VehicleScrapePriceType>(
          raw,
          RESULT.PRICE_TYPE,
          VEHICLE_SCRAPE_PRICE_TYPE,
          'Other or Unknown',
        ),
    priceTypeValue,
    listingCount: optionalNumber(raw, RESULT.LISTING_COUNT),
    minimumPrice: optionalNumber(raw, RESULT.MINIMUM_PRICE),
    maximumPrice: optionalNumber(raw, RESULT.MAXIMUM_PRICE),
    trim: optionalString(raw, RESULT.TRIM),
    modelYear: optionalNumber(raw, RESULT.MODEL_YEAR),
    bodyType: optionalString(raw, RESULT.BODY_TYPE),
    engineSize: optionalNumber(raw, RESULT.ENGINE_SIZE),
    cylinders: optionalNumber(raw, RESULT.CYLINDERS),
    fuelType: optionalString(raw, RESULT.FUEL_TYPE),
    transmissionType: optionalString(raw, RESULT.TRANSMISSION_TYPE),
    driveType: optionalString(raw, RESULT.DRIVE_TYPE),
    horsepower: optionalNumber(raw, RESULT.HORSEPOWER),
    doors: optionalNumber(raw, RESULT.DOORS),
    seats: optionalNumber(raw, RESULT.SEATS),
    mileage: optionalNumber(raw, RESULT.MILEAGE),
    category: optionalString(raw, RESULT.CATEGORY),
    countryOfOrigin: optionalString(raw, RESULT.COUNTRY_OF_ORIGIN),
    torqueNm: optionalNumber(raw, RESULT.TORQUE_NM),
    sourceUrl: optionalString(raw, RESULT.SOURCE_URL),
    inboxId: optionalString(raw, RESULT.INBOX_ID),
    externalJobId: optionalString(raw, RESULT.EXTERNAL_JOB_ID),
    httpStatusCode: optionalNumber(raw, RESULT.HTTP_STATUS_CODE),
    startedOn: optionalDate(raw, RESULT.STARTED_ON),
    completedOn: optionalDate(raw, RESULT.COMPLETED_ON),
    capturedOn: optionalDate(raw, RESULT.CAPTURED_ON),
    processedOn: optionalDate(raw, RESULT.PROCESSED_ON),
    normalizedDetailsJson: optionalString(raw, RESULT.NORMALIZED_DETAILS_JSON),
    rawResultJson: optionalString(raw, RESULT.RAW_RESULT_JSON),
    evidenceStorageReference: optionalString(raw, RESULT.EVIDENCE_STORAGE_REFERENCE),
    contentHash: optionalString(raw, RESULT.CONTENT_HASH),
    errorCode: optionalString(raw, RESULT.ERROR_CODE),
    errorMessage: optionalString(raw, RESULT.ERROR_MESSAGE),
  };
}

export async function createVehicleScrapeRun(
  input: CreateVehicleScrapeRunInput,
): Promise<string> {
  const missingVehicleRequestId = cleanGuid(
    input.missingVehicleRequestId,
    'Missing Vehicle Request ID',
  );
  const record: Record<string, unknown> = {
    [RUN.NAME]: input.name,
    [RUN.CORRELATION_ID]: input.correlationId,
    [RUN.OVERALL_STATUS]: input.overallStatusValue ?? 1,
    [RUN.TRIGGER_TYPE]: input.triggerTypeValue ?? 1,
    [`${RUN.MISSING_VEHICLE_REQUEST_LOOKUP}@odata.bind`]:
      `/${ENTITIES.MISSING_VEHICLE_REQUEST}(${missingVehicleRequestId})`,
  };
  setOptional(record, RUN.STARTED_ON, input.startedOn);
  setOptional(record, RUN.REQUESTED_SOURCE_COUNT, input.requestedSourceCount);
  setOptional(record, RUN.BATCH_CORRELATION_KEY, input.batchCorrelationKey);
  if (input.requestedByContactId) {
    record[`${RUN.REQUESTED_BY_CONTACT_LOOKUP}@odata.bind`] =
      `/${ENTITIES.CONTACT}(${cleanGuid(input.requestedByContactId, 'Requested By Contact ID')})`;
  }

  const { meta } = await safeFetchWithMeta({
    url: `${API_BASE}/${ENTITIES.VEHICLE_SCRAPE_RUN}`,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(record),
  });
  return entityIdFromHeaders(meta.getHeader);
}

export async function fetchVehicleScrapeRuns(
  missingVehicleRequestId: string,
): Promise<VehicleScrapeRun[]> {
  const id = cleanGuid(missingVehicleRequestId, 'Missing Vehicle Request ID');
  const select = [
    RUN.ID,
    RUN.NAME,
    RUN.CORRELATION_ID,
    RUN.OVERALL_STATUS,
    RUN.STARTED_ON,
    RUN.COMPLETED_ON,
    RUN.REQUESTED_SOURCE_COUNT,
    RUN.SUCCESSFUL_SOURCE_COUNT,
    RUN.FAILED_SOURCE_COUNT,
    RUN.TRIGGER_TYPE,
    RUN.BATCH_CORRELATION_KEY,
    RUN.ERROR_SUMMARY,
    RUN.MISSING_VEHICLE_REQUEST_LOOKUP_REF,
  ].join(',');
  const response = await safeFetch<ODataResponse>({
    url: `${API_BASE}/${ENTITIES.VEHICLE_SCRAPE_RUN}?$select=${select}&$filter=${RUN.MISSING_VEHICLE_REQUEST_LOOKUP_REF} eq ${id}&$orderby=${RUN.STARTED_ON} desc`,
    headers: { Prefer: 'odata.include-annotations=*' },
  });
  return (response.value ?? []).map(mapRun);
}

/**
 * Resolve one prepared Run by the correlation key carried in a PAD URL.
 * Keep this query deliberately small: optional Run columns must not be able to
 * break correlated evidence resolution in Power Pages.
 */
export async function fetchVehicleScrapeRunByCorrelationId(
  correlationId: string,
): Promise<VehicleScrapeRun | null> {
  const value = correlationId.trim();
  if (!value) {
    throw new Error('Scrape Run correlation ID is required');
  }
  const select = [
    RUN.ID,
    RUN.CORRELATION_ID,
    RUN.OVERALL_STATUS,
    RUN.MISSING_VEHICLE_REQUEST_LOOKUP_REF,
    RUN.REQUESTED_SOURCE_COUNT,
  ].join(',');
  const response = await safeFetch<ODataResponse>({
    url: `${API_BASE}/${ENTITIES.VEHICLE_SCRAPE_RUN}?$select=${select}&$filter=${RUN.CORRELATION_ID} eq '${odataStringLiteral(value)}'&$top=1`,
    headers: { Prefer: 'odata.include-annotations=*' },
  });
  const raw = response.value?.[0];
  return raw ? mapRun(raw) : null;
}

export async function updateVehicleScrapeRun(
  id: string,
  input: UpdateVehicleScrapeRunInput,
): Promise<void> {
  const record: Record<string, unknown> = {};
  setOptional(record, RUN.OVERALL_STATUS, input.overallStatusValue);
  setOptional(record, RUN.STARTED_ON, input.startedOn);
  setOptional(record, RUN.COMPLETED_ON, input.completedOn);
  setOptional(record, RUN.REQUESTED_SOURCE_COUNT, input.requestedSourceCount);
  setOptional(record, RUN.SUCCESSFUL_SOURCE_COUNT, input.successfulSourceCount);
  setOptional(record, RUN.FAILED_SOURCE_COUNT, input.failedSourceCount);
  setOptional(record, RUN.ERROR_SUMMARY, input.errorSummary);
  await safeFetch<void>({
    url: `${API_BASE}/${ENTITIES.VEHICLE_SCRAPE_RUN}(${cleanGuid(id, 'Scrape Run ID')})`,
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'If-Match': '*' },
    body: JSON.stringify(record),
  });
}

function sourceResultRecord(input: UpdateVehicleScrapeSourceResultInput): Record<string, unknown> {
  const record: Record<string, unknown> = {};
  const fields: Array<[string, unknown]> = [
    [RESULT.NAME, input.name],
    [RESULT.ATTEMPT_NUMBER, input.attemptNumber],
    [RESULT.SOURCE, input.sourceValue],
    [RESULT.TRANSPORT, input.transportValue],
    [RESULT.PROCESSING_STATUS, input.processingStatusValue],
    [RESULT.PRICE_TYPE, input.priceTypeValue],
    [RESULT.LISTING_COUNT, input.listingCount],
    [RESULT.MINIMUM_PRICE, input.minimumPrice],
    [RESULT.MAXIMUM_PRICE, input.maximumPrice],
    [RESULT.TRIM, input.trim],
    [RESULT.MODEL_YEAR, input.modelYear],
    [RESULT.BODY_TYPE, input.bodyType],
    [RESULT.ENGINE_SIZE, input.engineSize],
    [RESULT.CYLINDERS, input.cylinders],
    [RESULT.FUEL_TYPE, input.fuelType],
    [RESULT.TRANSMISSION_TYPE, input.transmissionType],
    [RESULT.DRIVE_TYPE, input.driveType],
    [RESULT.HORSEPOWER, input.horsepower],
    [RESULT.DOORS, input.doors],
    [RESULT.SEATS, input.seats],
    [RESULT.MILEAGE, input.mileage],
    [RESULT.CATEGORY, input.category],
    [RESULT.COUNTRY_OF_ORIGIN, input.countryOfOrigin],
    [RESULT.TORQUE_NM, input.torqueNm],
    [RESULT.SOURCE_URL, input.sourceUrl],
    [RESULT.INBOX_ID, input.inboxId],
    [RESULT.EXTERNAL_JOB_ID, input.externalJobId],
    [RESULT.HTTP_STATUS_CODE, input.httpStatusCode],
    [RESULT.STARTED_ON, input.startedOn],
    [RESULT.COMPLETED_ON, input.completedOn],
    [RESULT.CAPTURED_ON, input.capturedOn],
    [RESULT.PROCESSED_ON, input.processedOn],
    [RESULT.NORMALIZED_DETAILS_JSON, input.normalizedDetailsJson],
    [RESULT.RAW_RESULT_JSON, input.rawResultJson],
    [RESULT.EVIDENCE_STORAGE_REFERENCE, input.evidenceStorageReference],
    [RESULT.CONTENT_HASH, input.contentHash],
    [RESULT.ERROR_CODE, input.errorCode],
    [RESULT.ERROR_MESSAGE, input.errorMessage],
  ];
  fields.forEach(([field, value]) => setOptional(record, field, value));
  return record;
}

export async function createVehicleScrapeSourceResult(
  input: CreateVehicleScrapeSourceResultInput,
): Promise<string> {
  const record = sourceResultRecord({
    ...input,
    attemptNumber: input.attemptNumber ?? 1,
    processingStatusValue: input.processingStatusValue ?? 1,
  });
  record[RESULT.RESULT_CORRELATION_ID] = input.resultCorrelationId;
  record[`${RESULT.SCRAPE_RUN_LOOKUP}@odata.bind`] =
    `/${ENTITIES.VEHICLE_SCRAPE_RUN}(${cleanGuid(input.scrapeRunId, 'Scrape Run ID')})`;

  const { meta } = await safeFetchWithMeta({
    url: `${API_BASE}/${ENTITIES.VEHICLE_SCRAPE_SOURCE_RESULT}`,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(record),
  });
  return entityIdFromHeaders(meta.getHeader);
}

export async function fetchVehicleScrapeSourceResults(
  scrapeRunId: string,
): Promise<VehicleScrapeSourceResult[]> {
  const id = cleanGuid(scrapeRunId, 'Scrape Run ID');
  const select = Object.values(RESULT)
    .filter((field) => field !== RESULT.SCRAPE_RUN_LOOKUP)
    .join(',');
  const response = await safeFetch<ODataResponse>({
    url: `${API_BASE}/${ENTITIES.VEHICLE_SCRAPE_SOURCE_RESULT}?$select=${select}&$filter=${RESULT.SCRAPE_RUN_LOOKUP_REF} eq ${id}&$orderby=${RESULT.ATTEMPT_NUMBER} asc`,
    headers: { Prefer: 'odata.include-annotations=*' },
  });
  return (response.value ?? []).map(mapResult);
}

export async function updateVehicleScrapeSourceResult(
  id: string,
  input: UpdateVehicleScrapeSourceResultInput,
): Promise<void> {
  await safeFetch<void>({
    url: `${API_BASE}/${ENTITIES.VEHICLE_SCRAPE_SOURCE_RESULT}(${cleanGuid(id, 'Source Result ID')})`,
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'If-Match': '*' },
    body: JSON.stringify(sourceResultRecord(input)),
  });
}
