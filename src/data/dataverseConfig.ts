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
  VEHICLE_SCRAPE_RUN: 'vpi_vehiclescraperuns',
  VEHICLE_SCRAPE_SOURCE_RESULT: 'vpi_vehiclescrapesourceresults',
  PRICE_SUGGESTION: 'vpi_pricesuggestionses',
} as const;

/** Entity logical names for use with EntityDefinitions metadata API. */
export const ENTITY_LOGICAL_NAMES = {
  MISSING_VEHICLE_REQUEST: 'vpi_missingvehiclerequests',
  VEHICLE_SCRAPE_RUN: 'vpi_vehiclescraperun',
  VEHICLE_SCRAPE_SOURCE_RESULT: 'vpi_vehiclescrapesourceresult',
  PRICE_SUGGESTION: 'vpi_pricesuggestions',
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
  NAME: 'vpi_name',
  MAKE: 'vpi_make',
  MODEL: 'vpi_model',
  TRIM: 'vpi_trim',
  MODEL_YEAR: 'vpi_modelyear',
  BODY_TYPE: 'vpi_bodytype',
  CYLINDERS: 'vpi_cylinders',
  FUEL_TYPE: 'vpi_fueltype',
  TRANSMISSION_TYPE: 'vpi_transmissiontype',
  DRIVE_TYPE: 'vpi_drivetype',
  CONTACT_LOOKUP: 'vpi_Contact',
  MISSING_VEHICLE_LOOKUP: 'vpi_MissingVehicle',
  STATUS: 'vpi_status',
  MIN_PRICE: 'vpi_minprice',
  MAX_PRICE: 'vpi_maxprice',
  MILEAGE: 'vpi_mileage',
  CREATED_ON: 'createdon',
  // Spec fields (user-submitted or deep-scraped)
  ENGINE_SIZE: 'vpi_enginesize',
  HORSEPOWER: 'vpi_horsepower',
  DOORS: 'vpi_doors',
  SEATS: 'vpi_seats',
  CATEGORY: 'vpi_category',
  // Scrape result fields
  SCRAPE_STATUS: 'vpi_scrapestatus',
  SCRAPED_LISTINGS: 'vpi_scraped_listings',
  SCRAPED_MIN_PRICE: 'vpi_scraped_minprice',
  SCRAPED_MAX_PRICE: 'vpi_scraped_maxprice',
  SCRAPED_SOURCES: 'vpi_scraped_sources',
} as const;

export const MISSING_VEHICLE_REQUEST_SELECT_FIELDS = Object.values(
  MISSING_VEHICLE_REQUEST_FIELDS,
).join(',');

/**
 * Admin-owned multi-source pricing decision fields.
 *
 * Kept outside MISSING_VEHICLE_REQUEST_FIELDS until the corresponding Power
 * Pages Web API site setting allow-list has been enabled. This prevents the
 * existing MVR query from requesting fields the portal may not expose yet.
 */
export const MISSING_VEHICLE_DECISION_FIELDS = {
  APPROVED_MIN_PRICE: 'vpi_approvedminprice',
  APPROVED_MAX_PRICE: 'vpi_approvedmaxprice',
  PRICING_DECISION_STATUS: 'vpi_pricingdecisionstatus',
  PRICING_DECISION_METHOD: 'vpi_pricingmethod',
  REVIEWED_SCRAPE_RUN_LOOKUP: 'vpi_ReviewedScrapeRun',
  REVIEWED_SCRAPE_RUN_LOOKUP_REF: '_vpi_reviewedscraperun_value',
  PRIMARY_PRICE_RESULT_LOOKUP: 'vpi_PrimaryPriceResult',
  PRIMARY_PRICE_RESULT_LOOKUP_REF: '_vpi_primarypriceresult_value',
  SELECTED_SPECIFICATION_RESULT_LOOKUP: 'vpi_SelectedSpecificationResult',
  SELECTED_SPECIFICATION_RESULT_LOOKUP_REF: '_vpi_selectedspecificationresult_value',
  DECISION_NOTES: 'vpi_decisionnotes',
  DECIDED_BY_CONTACT_LOOKUP: 'vpi_DecidedByContact',
  DECIDED_BY_CONTACT_LOOKUP_REF: '_vpi_decidedbycontact_value',
  DECIDED_ON: 'vpi_decidedon',
} as const;

// Vehicle Scrape Run field logical/schema names.
export const VEHICLE_SCRAPE_RUN_FIELDS = {
  ID: 'vpi_vehiclescraperunid',
  NAME: 'vpi_name',
  CORRELATION_ID: 'vpi_correlationkey',
  OVERALL_STATUS: 'vpi_overallstatus',
  STARTED_ON: 'vpi_startedon',
  COMPLETED_ON: 'vpi_completedon',
  REQUESTED_SOURCE_COUNT: 'vpi_requestedsourcecount',
  SUCCESSFUL_SOURCE_COUNT: 'vpi_successfulsourcecount',
  FAILED_SOURCE_COUNT: 'vpi_failedsourcecount',
  TRIGGER_TYPE: 'vpi_triggertype',
  BATCH_CORRELATION_KEY: 'vpi_batchcorrelationkey',
  ERROR_SUMMARY: 'vpi_errorsummary',
  MISSING_VEHICLE_REQUEST_LOOKUP: 'vpi_MissingVehicleRequest',
  MISSING_VEHICLE_REQUEST_LOOKUP_REF: '_vpi_missingvehiclerequest_value',
  REQUESTED_BY_CONTACT_LOOKUP: 'vpi_RequestedByContact',
  REQUESTED_BY_CONTACT_LOOKUP_REF: '_vpi_requestedbycontact_value',
} as const;

// Vehicle Scrape Source Result field logical/schema names.
export const VEHICLE_SCRAPE_SOURCE_RESULT_FIELDS = {
  ID: 'vpi_vehiclescrapesourceresultid',
  NAME: 'vpi_name',
  RESULT_CORRELATION_ID: 'vpi_resultcorrelationkey',
  SCRAPE_RUN_LOOKUP: 'vpi_ScrapeRun',
  SCRAPE_RUN_LOOKUP_REF: '_vpi_scraperun_value',
  ATTEMPT_NUMBER: 'vpi_attemptnumber',
  SOURCE: 'vpi_source',
  TRANSPORT: 'vpi_transport',
  PROCESSING_STATUS: 'vpi_processingstatus',
  PRICE_TYPE: 'vpi_pricetype',
  LISTING_COUNT: 'vpi_listingcount',
  MINIMUM_PRICE: 'vpi_minprice',
  MAXIMUM_PRICE: 'vpi_maxprice',
  TRIM: 'vpi_trim',
  MODEL_YEAR: 'vpi_modelyear',
  BODY_TYPE: 'vpi_bodytype',
  ENGINE_SIZE: 'vpi_enginesize',
  CYLINDERS: 'vpi_cylinders',
  FUEL_TYPE: 'vpi_fueltype',
  TRANSMISSION_TYPE: 'vpi_transmissiontype',
  DRIVE_TYPE: 'vpi_drivetype',
  HORSEPOWER: 'vpi_horsepower',
  DOORS: 'vpi_doors',
  SEATS: 'vpi_seats',
  MILEAGE: 'vpi_mileage',
  CATEGORY: 'vpi_category',
  COUNTRY_OF_ORIGIN: 'vpi_countryoforigin',
  TORQUE_NM: 'vpi_torquenm',
  SOURCE_URL: 'vpi_sourceurl',
  INBOX_ID: 'vpi_inboxkey',
  EXTERNAL_JOB_ID: 'vpi_externaljobkey',
  HTTP_STATUS_CODE: 'vpi_httpstatuscode',
  STARTED_ON: 'vpi_startedon',
  COMPLETED_ON: 'vpi_completedon',
  CAPTURED_ON: 'vpi_capturedon',
  PROCESSED_ON: 'vpi_processedon',
  NORMALIZED_DETAILS_JSON: 'vpi_normalizeddetailsjson',
  RAW_RESULT_JSON: 'vpi_rawresultjson',
  EVIDENCE_STORAGE_REFERENCE: 'vpi_evidencestoragereference',
  CONTENT_HASH: 'vpi_contenthash',
  ERROR_CODE: 'vpi_errorcode',
  ERROR_MESSAGE: 'vpi_errormessage',
} as const;

// ─── Price Suggestion Field Logical Names ────────────────────
export const PRICE_SUGGESTION_FIELDS = {
  ID: 'vpi_pricesuggestionsid',
  COMMENT: 'vpi_comment',
  MIN_PRICE: 'vpi_minprice',
  MAX_PRICE: 'vpi_maxprice',
  SOURCE_URL: 'vpi_sourceurl',
  SUBMITTED_BY: 'vpi_submittedby',
  VEHICLE_LOOKUP: 'vpi_Vehicle',
  VEHICLE_LOOKUP_REF: '_vpi_vehicle_value',
  STATUS: 'vpi_status',
  CREATED_ON: 'createdon',
} as const;

export const PRICE_SUGGESTION_SELECT_FIELDS = Object.values(PRICE_SUGGESTION_FIELDS).join(',');
