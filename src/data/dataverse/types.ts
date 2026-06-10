/**
 * Raw Dataverse API response types — the shape of what comes back from the OData endpoint.
 * These are mapped to application models in dataverseMapper.ts.
 */

/** Raw vehicle row from vpi_vehicledatas endpoint */
export interface DataverseVehicleRow {
  vpi_vehicledataid: string;
  vpi_make: string;
  vpi_model: string;
  vpi_spec: string;
  vpi_year: string;
  vpi_avgprice: number;
  vpi_minprice: number;
  vpi_maxprice: number;
  vpi_enginesize: number;
  vpi_horsepower: number;
  vpi_cylinders: number;
  vpi_doors: number;
  vpi_seats: number;
  vpi_transmissiontronic: number;
  vpi_bodytype: number;
  vpi_drivetype: number;
  vpi_vehicletype: number;
  vpi_category: number;
  vpi_powertraintype: number;
  vpi_description: string;
  vpi_pricespreadpct: number;
  exchangerate: number;

  // Formatted values (returned with Prefer: odata.include-annotations=*)
  'vpi_bodytype@OData.Community.Display.V1.FormattedValue'?: string;
  'vpi_category@OData.Community.Display.V1.FormattedValue'?: string;
  'vpi_cylinders@OData.Community.Display.V1.FormattedValue'?: string;
  'vpi_doors@OData.Community.Display.V1.FormattedValue'?: string;
  'vpi_drivetype@OData.Community.Display.V1.FormattedValue'?: string;
  'vpi_enginesize@OData.Community.Display.V1.FormattedValue'?: string;
  'vpi_horsepower@OData.Community.Display.V1.FormattedValue'?: string;
  'vpi_powertraintype@OData.Community.Display.V1.FormattedValue'?: string;
  'vpi_seats@OData.Community.Display.V1.FormattedValue'?: string;
  'vpi_transmissiontronic@OData.Community.Display.V1.FormattedValue'?: string;
  'vpi_vehicletype@OData.Community.Display.V1.FormattedValue'?: string;
}

/** Raw inquiry row from vpi_vehicleinquiries endpoint */
export interface DataverseInquiryRow {
  vpi_vehicleinquiryid: string;
  _vpi_contact_value: string;
  '_vpi_contact_value@OData.Community.Display.V1.FormattedValue'?: string;
  vpi_status: number;
  'vpi_status@OData.Community.Display.V1.FormattedValue'?: string;
  _vpi_vehicle_value: string;
  '_vpi_vehicle_value@OData.Community.Display.V1.FormattedValue'?: string;
}

/** Raw contact row from contacts endpoint */
export interface DataverseContactRow {
  contactid: string;
  firstname: string;
  lastname: string;
  emailaddress1: string;
  vpi_city: number;
  vpi_country: string;
  'vpi_city@OData.Community.Display.V1.FormattedValue'?: string;
}

/** OData response wrapper */
export interface ODataResponse<T> {
  value: T[];
  '@odata.nextLink'?: string;
}

/** Contact creation payload */
export interface ContactCreatePayload {
  firstname: string;
  lastname: string;
  emailaddress1: string;
  vpi_city: number;
  vpi_country: string;
}

/** Inquiry creation payload */
export interface InquiryCreatePayload {
  'vpi_Contact@odata.bind': string;
  'vpi_Vehicle@odata.bind': string;
  vpi_status: number;
}

/** Vehicle select fields constant — used in all vehicle GET requests */
export const VEHICLE_SELECT_FIELDS = [
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
  'vpi_make',
  'vpi_maxprice',
  'vpi_minprice',
  'vpi_model',
  'vpi_powertraintype',
  'vpi_pricespreadpct',
  'vpi_seats',
  'vpi_spec',
  'vpi_transmissiontronic',
  'vpi_vehicletype',
  'vpi_year',
  'exchangerate',
].join(',');

/** Minimal vehicle select fields for hierarchy/listing queries */
export const VEHICLE_MINIMAL_FIELDS = [
  'vpi_vehicledataid',
  'vpi_make',
  'vpi_model',
  'vpi_spec',
  'vpi_year',
  'vpi_bodytype',
  'vpi_avgprice',
  'vpi_minprice',
  'vpi_maxprice',
].join(',');

/** Inquiry select fields */
export const INQUIRY_SELECT_FIELDS = [
  'vpi_vehicleinquiryid',
  '_vpi_contact_value',
  'vpi_status',
  '_vpi_vehicle_value',
].join(',');

/** Contact select fields */
export const CONTACT_SELECT_FIELDS = [
  'contactid',
  'firstname',
  'lastname',
  'emailaddress1',
  'vpi_city',
  'vpi_country',
].join(',');
