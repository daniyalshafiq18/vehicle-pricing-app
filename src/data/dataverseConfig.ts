/**
 * Dataverse / Power Pages Web API configuration.
 *
 * All entity logical names and field mappings live here so that
 * renaming a column in Dataverse only changes this one file.
 *
 * @see ../docs/dataverse-schema.md for the full schema reference.
 */

// ─── API ─────────────────────────────────────────────────
/** Base path for the Power Pages Web API (no trailing slash). */
export const API_BASE = '/_api';

/** Max records per page when iterating large entity collections. */
export const MAX_PAGE_SIZE = 5000;

/** How many ms to wait before considering an API call stalled. */
export const REQUEST_TIMEOUT_MS = 30_000;

// ─── Entity Logical Names ────────────────────────────────
export const ENTITIES = {
  VEHICLE: 'vpi_vehicledatas',
  CONTACT: 'contacts',
  INQUIRY: 'vpi_vehicleinquiries',
  MISSING_VEHICLE_REQUEST: 'vpi_missingvehiclerequestses',
} as const;

// ─── Vehicle Data Field Logical Names ─────────────────────
export const VEHICLE_FIELDS = {
  ID: 'vpi_vehicledataid',
  NAME: 'vpi_name',
  BUSINESS_ID: 'vpi_id',
  MAKE: 'vpi_make',
  MAKE_CODE: 'vpi_makecode',
  MODEL: 'vpi_model',
  MODEL_CODE: 'vpi_modelcode',
  SPEC: 'vpi_spec',
  YEAR: 'vpi_year',
  YEAR_CODE: 'vpi_yearcode',
  DESCRIPTION: 'vpi_description',
  ENGINE_SIZE: 'vpi_enginesize',
  HORSEPOWER: 'vpi_horsepower',
  CYLINDERS: 'vpi_cylinders',
  MIN_PRICE: 'vpi_minprice',
  AVG_PRICE: 'vpi_avgprice',
  MAX_PRICE: 'vpi_maxprice',
  PRICE_SPREAD_PCT: 'vpi_pricespreadpct',
  BODY_TYPE: 'vpi_bodytype',
  CATEGORY: 'vpi_category',
  TRANSMISSION: 'vpi_transmissiontronic',
  DOORS: 'vpi_doors',
  SEATS: 'vpi_seats',
  DRIVE_TYPE: 'vpi_drivetype',
  POWERTRAIN_TYPE: 'vpi_powertraintype',
  VEHICLE_TYPE: 'vpi_vehicletype',
} as const;

// ─── Contact Field Logical Names ──────────────────────────
export const CONTACT_FIELDS = {
  ID: 'contactid',
  FIRST_NAME: 'firstname',
  LAST_NAME: 'lastname',
  EMAIL: 'emailaddress1',
  PHONE: 'telephone1',
  CITY: 'vpi_city',
  COUNTRY: 'vpi_country',
} as const;

// ─── Inquiry Field Logical Names ──────────────────────────
export const INQUIRY_FIELDS = {
  ID: 'vpi_vehicleinquiryid',
  NAME: 'vpi_name',
  CONTACT_LOOKUP: 'vpi_Contact',
  VEHICLE_LOOKUP: 'vpi_Vehicle',
  STATUS: 'vpi_status',
  CREATED_ON: 'createdon',
} as const;

/** The fields we $select when fetching vehicles (avoids pulling blob columns). */
export const VEHICLE_SELECT_FIELDS = Object.values(VEHICLE_FIELDS).join(',');

/** The $select string for contact queries. */
export const CONTACT_SELECT_FIELDS = Object.values(CONTACT_FIELDS).join(',');

/** The $select string for inquiry queries. */
export const INQUIRY_SELECT_FIELDS = Object.values(INQUIRY_FIELDS).join(',');

// ─── Missing Vehicle Request Field Logical Names ─────────────
export const MISSING_VEHICLE_REQUEST_FIELDS = {
  ID: 'vpi_missingvehiclerequestsid',
  MAKE: 'vpi_make',
  MODEL: 'vpi_model',
  TRIM: 'vpi_trim',
  MODEL_YEAR: 'vpi_modelyear',
  BODY_TYPE: 'vpi_bodytype',
  CYLINDERS: 'vpi_cylinders',
  FUEL_TYPE: 'vpi_fueltype',
  TRANSMISSION_TYPE: 'vpi_transmissiontype',
  STATUS: 'vpi_status',
  MIN_MILEAGE: 'vpi_minmilage',
  MAX_MILEAGE: 'vpi_maxmilage',
  CREATED_ON: 'createdon',
} as const;

export const MISSING_VEHICLE_REQUEST_SELECT_FIELDS = Object.values(MISSING_VEHICLE_REQUEST_FIELDS).join(',');

// ─── Price Suggestion Field Logical Names ────────────────────
export const PRICE_SUGGESTION_FIELDS = {
  ID: 'vpi_pricesuggestionid',
  COMMENT: 'vpi_comment',
  MIN_PRICE: 'vpi_minprice',
  MAX_PRICE: 'vpi_maxprice',
  SOURCE_URL: 'vpi_sourceurl',
  SUBMITTED_BY: 'vpi_submittedby',
  VEHICLE_LOOKUP: 'vpi_Vehicle',
  CREATED_ON: 'createdon',
} as const;
