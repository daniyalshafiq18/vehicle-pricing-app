/**
 * Power Pages Web API — Vehicle Data
 *
 * Fetches ALL vehicle records from Dataverse via the portal `/_api/` using
 * keyset pagination (ordered by `vpi_vehicledataid`, filtered with `gt`).
 * Records are parsed into `RawVehicleRecord` objects with formatted-value
 * annotations for choice fields.
 */

import { API_BASE, MAX_PAGE_SIZE, VEHICLE_FIELDS } from '@data/dataverseConfig';
import { safeFetch } from '@lib/safeAjax';
import type { RawVehicleRecord } from '@data/dataverseDataSource';

/** The $select field list. */
const VEHICLE_SELECT = [
  'vpi_vehicledataid',
  'vpi_avgprice',
  'vpi_bodytype',
  'vpi_category',
  'vpi_cylinders',
  'vpi_description',
  'vpi_doors',
  'vpi_drivetype',
  'vpi_enginesize',
  'vpi_horsepower',
  'vpi_id',
  'vpi_make',
  'vpi_makecode',
  'vpi_maxprice',
  'vpi_minprice',
  'vpi_model',
  'vpi_modelcode',
  'vpi_name',
  'vpi_powertraintype',
  'vpi_pricespreadpct',
  'vpi_seats',
  'vpi_spec',
  'vpi_transmissiontronic',
  'vpi_vehicletype',
  'vpi_year',
  'vpi_yearcode',
].join(',');

function getField<T>(result: Record<string, unknown>, field: string): T | undefined {
  return result[field] as T | undefined;
}

function getFormatted(result: Record<string, unknown>, field: string): string | undefined {
  return result[`${field}@OData.Community.Display.V1.FormattedValue`] as string | undefined;
}

interface ODataResponse {
  value: Record<string, unknown>[];
  '@odata.nextLink'?: string;
}

/**
 * Parse a raw API response record into a `RawVehicleRecord`.
 */
function parseRawRecord(result: Record<string, unknown>): RawVehicleRecord {
  return {
    [VEHICLE_FIELDS.ID]: result['vpi_vehicledataid'] as string,
    [VEHICLE_FIELDS.NAME]: result['vpi_name'] as string | undefined,
    [VEHICLE_FIELDS.BUSINESS_ID]: result['vpi_id'] as string | undefined,
    [VEHICLE_FIELDS.MAKE]: getField<string>(result, 'vpi_make'),
    [VEHICLE_FIELDS.MAKE_CODE]: getField<string>(result, 'vpi_makecode'),
    [VEHICLE_FIELDS.MODEL]: getField<string>(result, 'vpi_model'),
    [VEHICLE_FIELDS.MODEL_CODE]: getField<string>(result, 'vpi_modelcode'),
    [VEHICLE_FIELDS.SPEC]: getField<string>(result, 'vpi_spec'),
    [VEHICLE_FIELDS.YEAR]: getField<string>(result, 'vpi_year'),
    [VEHICLE_FIELDS.YEAR_CODE]: getField<string>(result, 'vpi_yearcode'),
    [VEHICLE_FIELDS.DESCRIPTION]: getField<string>(result, 'vpi_description'),
    [VEHICLE_FIELDS.ENGINE_SIZE]: getField<number>(result, 'vpi_enginesize'),
    [VEHICLE_FIELDS.HORSEPOWER]: getField<number>(result, 'vpi_horsepower'),
    [VEHICLE_FIELDS.CYLINDERS]: getField<number>(result, 'vpi_cylinders'),
    [VEHICLE_FIELDS.MIN_PRICE]: getField<number>(result, 'vpi_minprice'),
    [VEHICLE_FIELDS.AVG_PRICE]: getField<number>(result, 'vpi_avgprice'),
    [VEHICLE_FIELDS.MAX_PRICE]: getField<number>(result, 'vpi_maxprice'),
    [VEHICLE_FIELDS.PRICE_SPREAD_PCT]: getField<number>(result, 'vpi_pricespreadpct'),
    [VEHICLE_FIELDS.BODY_TYPE]: getField<number>(result, 'vpi_bodytype'),
    [VEHICLE_FIELDS.BODY_TYPE + '_formatted']: getFormatted(result, 'vpi_bodytype'),
    [VEHICLE_FIELDS.CATEGORY]: getField<number>(result, 'vpi_category'),
    [VEHICLE_FIELDS.CATEGORY + '_formatted']: getFormatted(result, 'vpi_category'),
    [VEHICLE_FIELDS.TRANSMISSION]: getField<number>(result, 'vpi_transmissiontronic'),
    [VEHICLE_FIELDS.TRANSMISSION + '_formatted']: getFormatted(result, 'vpi_transmissiontronic'),
    [VEHICLE_FIELDS.DOORS]: getField<number>(result, 'vpi_doors'),
    [VEHICLE_FIELDS.DOORS + '_formatted']: getFormatted(result, 'vpi_doors'),
    [VEHICLE_FIELDS.SEATS]: getField<number>(result, 'vpi_seats'),
    [VEHICLE_FIELDS.SEATS + '_formatted']: getFormatted(result, 'vpi_seats'),
    [VEHICLE_FIELDS.DRIVE_TYPE]: getField<number>(result, 'vpi_drivetype'),
    [VEHICLE_FIELDS.DRIVE_TYPE + '_formatted']: getFormatted(result, 'vpi_drivetype'),
    [VEHICLE_FIELDS.POWERTRAIN_TYPE]: getField<number>(result, 'vpi_powertraintype'),
    [VEHICLE_FIELDS.POWERTRAIN_TYPE + '_formatted']: getFormatted(result, 'vpi_powertraintype'),
    [VEHICLE_FIELDS.VEHICLE_TYPE]: getField<number>(result, 'vpi_vehicletype'),
    [VEHICLE_FIELDS.VEHICLE_TYPE + '_formatted']: getFormatted(result, 'vpi_vehicletype'),
  };
}

/**
 * Fetch ALL vehicle records from Dataverse via the portal Web API.
 *
 * Uses keyset pagination (ordered filter/skip): each page orders records by
 * the primary key (`vpi_vehicledataid`) and filters for IDs greater than the
 * last record from the previous page. This avoids the portal API's lack of
 * `@odata.nextLink` and `$skip` support.
 */
export async function fetchAllVehicles(): Promise<RawVehicleRecord[]> {
  const all: RawVehicleRecord[] = [];
  const baseUrl = `${API_BASE}/vpi_vehicledatas` +
    `?$select=${VEHICLE_SELECT}` +
    `&$orderby=vpi_vehicledataid asc` +
    `&$top=${MAX_PAGE_SIZE}`;

  let lastId: string | null = null;

  while (true) {
    const filter = lastId ? `&$filter=vpi_vehicledataid gt '${lastId}'` : '';
    const resp: ODataResponse = await safeFetch<ODataResponse>({
      url: baseUrl + filter,
      headers: { Prefer: 'odata.include-annotations=*' },
    });

    const page = resp.value ?? [];
    if (!page.length) break;

    all.push(...page.map(parseRawRecord));
    console.log(`[fetchAllVehicles] Page fetched — ${all.length} total so far`);

    // If we got fewer records than the page size, we've reached the end
    if (page.length < MAX_PAGE_SIZE) break;

    lastId = page[page.length - 1]?.['vpi_vehicledataid'] as string;
    if (!lastId) break;
  }

  console.log(`[fetchAllVehicles] Done — fetched ${all.length} records`);
  return all;
}
