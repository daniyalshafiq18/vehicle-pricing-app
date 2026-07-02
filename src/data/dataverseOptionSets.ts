/**
 * Bidirectional Dataverse option-set mappings.
 *
 * Each map converts between the integer values stored in Dataverse
 * and the string labels used throughout the application.
 *
 * @see ../docs/dataverse-schema.md for the source-of-truth schema.
 */

// ─── Helpers ──────────────────────────────────────────────

/** Reverse a `label → value` map into `value → label`. */
function reverse<K extends string | number, V extends string | number>(
  map: Record<K, V>,
): Record<V, K> {
  return Object.fromEntries(
    Object.entries(map).map(([k, v]) => [v, k]),
  ) as unknown as Record<V, K>;
}

/** Convert a raw API value (int or string) into the application label. */
function toLabel(map: Record<string, number>, value: unknown, fallback: string): string {
  if (typeof value === 'string') {
    // Already a label — pass through (defensive)
    return value;
  }
  if (typeof value === 'number') {
    return reverse(map)[value] ?? fallback;
  }
  return fallback;
}

/** Convert an application label into the Dataverse integer value. */
function toValue(map: Record<string, number>, label: string): number | null {
  return map[label] ?? null;
}

// ─── Body Type ────────────────────────────────────────────

export const BODY_TYPE: Record<string, number> = {
  Bus: 1,
  Cargo: 2,
  'Cargo Van': 3,
  'Cargo Van High Roof': 4,
  'Compact/Mini MPV': 5,
  Convertible: 6,
  Coupe: 7,
  'Coupe/Cabriolet': 8,
  'Crew Cab': 9,
  Crossbow: 10,
  'Crossover Fastback': 11,
  Estate: 12,
  'Half Panel Van': 13,
  'Hard Top': 14,
  Hatchback: 15,
  Landaulet: 16,
  'Long Cargo': 17,
  'Long Van': 18,
  'LWB HR Van': 19,
  'LWB Low Roof Van': 20,
  'LWB Van': 21,
  'Mini Bus': 22,
  'Mini Bus High Roof': 23,
  'Mini Bus LWB': 24,
  'Mini Bus LWB Wide Body HR': 25,
  'Mini Bus Semi High Roof': 26,
  'Mini Van': 27,
  Minivan: 28,
  MPV: 29,
  'Open Top': 30,
  'Panel Van': 31,
  'Panel Van High Roof': 32,
  'Panelvan Wide Body High Roof': 33,
  'Pick Up': 34,
  'Pick Up Double Cab': 35,
  'Pick Up Double Cab Long Box': 36,
  'Pick Up Ext Cab': 37,
  'Pick Up Ext Cab Long Box': 38,
  'Pick Up Long Box': 39,
  'Pick Up Lwb': 40,
  'Pick Up Single Cab': 41,
  'Pickup Truck': 42,
  'Regular Cab': 43,
  'Regular Cab Chassis': 44,
  'Retractable Hard Top': 45,
  Sedan: 46,
  'Short Van': 47,
  'Single Cabin Long Cargo': 48,
  'Single Cabin Long Chassis': 49,
  'Single Cabin Std Cargo': 50,
  'Single Cabin Std Chassis': 51,
  'Soft Top': 52,
  Sportback: 53,
  Station: 54,
  SUV: 55,
  'SUV - Compact': 56,
  'SUV Convertible': 57,
  'SUV Coupe': 58,
  'SUV - Crossover': 59,
  'SWB Van': 60,
  Targa: 61,
  Truck: 62,
  Van: 63,
  'Van 3.5 Ton': 64,
  'Van 4.5 Ton': 65,
  Wagon: 66,
  'Wide Body Mini Bus': 67,
  'Wide Body Van': 68,
  'Window Van': 69,
};
export const bodyTypeLabel = (v: unknown, fallback = 'SUV'): string =>
  toLabel(BODY_TYPE, v, fallback);
export const bodyTypeValue = (label: string): number | null =>
  toValue(BODY_TYPE, label);

// ─── Missing Vehicle Body Type (dedicated optionset) ───────

export const MISSING_VEHICLE_BODY_TYPE: Record<string, number> = {
  Bus: 1,
  Cargo: 2,
  'Cargo Van': 3,
  'Cargo Van High Roof': 4,
  'Compact Mini Mpv': 5,
  Convertable: 6,
  Coupe: 7,
  'Coupe Cabriolet': 8,
  'Crew Cab': 9,
  Crossbow: 10,
  'Crossover Fastback': 11,
  Estate: 12,
  'Half Panel Van': 13,
  'Hard Top': 14,
  Hatchback: 15,
  Limousine: 16,
  'Long Cargor': 17,
  'long Van': 18,
  'Lwb Hr Van': 19,
  'Lwb Low Roof Van': 20,
  'Lwb Van': 21,
  'Mini Bus': 22,
  'Mini Bus High Roof': 23,
  'Mini Bus High Lwb': 24,
  'Mini Bus High Lwb wide body Hr': 25,
  'Mini Bus Semi High Roof': 26,
  'Mini Van': 27,
  'Open Top': 28,
  'Panel Van': 29,
  'Panel Van High Roof': 30,
  'Panel Van Wide Body High Roof': 31,
  'Pick Up Double Cab': 32,
  'Pick Up Double Cab Long Box': 33,
  'Pick Up Ext Cab': 34,
  'Pick Up Ext Cab Long Box': 35,
  'Pick Up Long Box': 36,
  'Pick Up Lwb': 37,
  'Pick Up Single Cab': 38,
  'Pick Up Truck': 39,
  'Pick Up Regular Cab': 40,
  'Regular Cab Chassis': 41,
  Sedan: 42,
  'Short Cabin Long Cargo': 43,
  'Single Cabin Long Cargo': 44,
  'Single Cabin Long Chassis': 45,
  'Soft Top': 46,
  Suv: 47,
  SportBack: 48,
  Station: 49,
  'Suv - Conertible': 50,
  'Suv - Coupe': 51,
  'Suv - Crossover': 52,
  'Swb Van': 53,
  Targah: 54,
  Truck: 55,
  Van: 56,
  'Van 3.5 Ton': 57,
  'Van 4.5 Ton': 58,
  Wagon: 59,
  'Wide Body Minus Bus': 60,
  'Wide Body Van': 61,
  'Window Van': 62,
};
export const missingVehicleBodyTypeValue = (label: string): number | null =>
  toValue(MISSING_VEHICLE_BODY_TYPE, label);

// ─── Category ─────────────────────────────────────────────

export const CATEGORY: Record<string, number> = {
  GCC: 1,
  'NON-GCC': 2,
  'OTHER/STANDARD': 3,
};
export const categoryLabel = (v: unknown, fallback = 'OTHER/STANDARD'): string =>
  toLabel(CATEGORY, v, fallback);
export const categoryValue = (label: string): number | null =>
  toValue(CATEGORY, label);

// ─── Transmission ─────────────────────────────────────────

export const TRANSMISSION: Record<string, number> = {
  '9G-Tronic': 1,
  'Active Select': 2,
  Automatic: 3,
  CVT: 4,
  'CVT + Manual Mode': 5,
  DHT: 6,
  'Direct Drive': 7,
  Drivelogic: 8,
  'Dual Clutch': 9,
  'E-CVT': 10,
  'E-Gear': 11,
  F1: 12,
  'F1 DC': 13,
  F1A: 14,
  Geartronic: 15,
  Hydramatic: 16,
  Manual: 17,
  Multimode: 18,
  Multitronic: 19,
  PDK: 20,
  PHEV: 21,
  Powershift: 22,
  Quickshift: 23,
  'R-Tronic': 24,
  Selespeed: 25,
  Sentronic: 26,
  Sequential: 27,
  SMG: 28,
  'Sport Mode': 29,
  'S-Tronic': 30,
  Touchtronic: 31,
};
export const transmissionLabel = (v: unknown, fallback = 'Automatic'): string =>
  toLabel(TRANSMISSION, v, fallback);
export const transmissionValue = (label: string): number | null =>
  toValue(TRANSMISSION, label);

// ─── Doors ────────────────────────────────────────────────

export const DOORS: Record<string, number> = {
  '0': 1,
  '2': 2,
  '3': 3,
  '4': 4,
  '5': 5,
  '6': 6,
  '1 DOOR': 7,
};
export const doorsLabel = (v: unknown, fallback = '4'): string =>
  toLabel(DOORS, v, fallback);

// ─── Seats ────────────────────────────────────────────────

export const SEATS: Record<string, number> = {
  '2': 1,
  '3': 2,
  '4': 3,
  '5': 4,
  '6': 5,
  '7': 6,
  '8': 7,
  '9': 8,
  '10': 9,
  '11': 10,
  '12': 11,
  '13': 12,
  '14': 13,
  '15': 14,
  '16': 15,
  '17': 16,
  '18': 17,
  '19': 18,
  '20': 19,
  '21': 20,
  '22': 21,
  '23': 22,
  '24': 23,
  '26': 24,
  '30': 25,
  '34': 26,
  '37': 27,
  '1 SEAT': 28,
  'N/A': 29,
};
export const seatsLabel = (v: unknown, fallback = '5'): string =>
  toLabel(SEATS, v, fallback);

// ─── Drive Type ───────────────────────────────────────────

export const DRIVE_TYPE: Record<string, number> = {
  '4X4': 1,
  AWD: 2,
  FWD: 3,
  RWD: 4,
  Unknown: 5,
};
export const driveTypeLabel = (v: unknown, fallback = 'Unknown'): string =>
  toLabel(DRIVE_TYPE, v, fallback);
export const driveTypeValue = (label: string): number | null =>
  toValue(DRIVE_TYPE, label);

// ─── Powertrain Type ──────────────────────────────────────

export const POWERTRAIN: Record<string, number> = {
  Electric: 1,
  Hybrid: 2,
  'Petrol/Diesel': 3,
};
export const powertrainLabel = (v: unknown, fallback = 'Petrol/Diesel'): string =>
  toLabel(POWERTRAIN, v, fallback);
export const powertrainValue = (label: string): number | null =>
  toValue(POWERTRAIN, label);

// ─── Vehicle Type ─────────────────────────────────────────

export const VEHICLE_TYPE: Record<string, number> = {
  Car: 1,
  'Heavy Commercial Vehicle': 2,
  'Light Commercial Vehicle': 3,
};
export const vehicleTypeLabel = (v: unknown, fallback = 'Car'): string =>
  toLabel(VEHICLE_TYPE, v, fallback);
export const vehicleTypeValue = (label: string): number | null =>
  toValue(VEHICLE_TYPE, label);

// ─── Inquiry Status ───────────────────────────────────────

export const INQUIRY_STATUS: Record<string, number> = {
  pending: 1,
  reviewed: 2,
  contacted: 3,
  closed: 4,
};
export const inquiryStatusLabel = (v: unknown, fallback: string): string =>
  toLabel(INQUIRY_STATUS, v, fallback);
export const inquiryStatusValue = (label: string): number | null =>
  toValue(INQUIRY_STATUS, label);

// ─── City (Contact) ───────────────────────────────────────

export const CITY: Record<string, number> = {
  Dubai: 1,
  'Abu Dhabi': 2,
  Sharjah: 3,
  Ajman: 4,
  'Ras Al Khaimah': 5,
  Fujairah: 6,
  'Umm Al Quwain': 7,
  'Al Ain': 8,
  'Khor Fakkan': 9,
  'Dibba Al Fujairah': 10,
  Kalba: 11,
  'Madinat Zayed': 12,
  Ruwais: 13,
  'Jebel Ali': 14,
};
export const cityLabel = (v: unknown, fallback = 'Dubai'): string =>
  toLabel(CITY, v, fallback);
export const cityValue = (label: string): number | null =>
  toValue(CITY, label);

// ─── Missing Vehicle Cylinders ──────────────────────────────

export const MISSING_VEHICLE_CYLINDERS: Record<string, number> = {
  '3': 1,
  '4': 2,
  '5': 3,
  '6': 4,
  '8': 5,
  '10': 6,
  '12': 7,
  '16': 8,
};
export const missingVehicleCylindersValue = (label: string): number | null =>
  toValue(MISSING_VEHICLE_CYLINDERS, label);
export const missingVehicleCylindersLabel = (v: unknown, fallback = '4'): string =>
  toLabel(MISSING_VEHICLE_CYLINDERS, v, fallback);

// ─── Missing Vehicle Fuel Type ─────────────────────────────

export const MISSING_VEHICLE_FUEL_TYPE: Record<string, number> = {
  Petrol: 1,
  Diesel: 2,
  Hybrid: 3,
  Electrical: 4,
};
export const missingVehicleFuelTypeValue = (label: string): number | null =>
  toValue(MISSING_VEHICLE_FUEL_TYPE, label);
export const missingVehicleFuelTypeLabel = (v: unknown, fallback = 'Petrol'): string =>
  toLabel(MISSING_VEHICLE_FUEL_TYPE, v, fallback);

// ─── Missing Vehicle Transmission Type ─────────────────────

export const MISSING_VEHICLE_TRANSMISSION_TYPE: Record<string, number> = {
  Automatic: 1,
  Manual: 2,
  CVT: 3,
};
export const missingVehicleTransmissionTypeValue = (label: string): number | null =>
  toValue(MISSING_VEHICLE_TRANSMISSION_TYPE, label);
export const missingVehicleTransmissionTypeLabel = (v: unknown, fallback = 'Automatic'): string =>
  toLabel(MISSING_VEHICLE_TRANSMISSION_TYPE, v, fallback);

// ─── Missing Vehicle Status (vpi_status) ───────────────────

export const MISSING_VEHICLE_STATUS: Record<string, number> = {
  Pending: 1,
  Approved: 2,
  'In Progress': 3,
  Reject: 4,
};
export const missingVehicleStatusValue = (label: string): number | null =>
  toValue(MISSING_VEHICLE_STATUS, label);
export const missingVehicleStatusLabel = (v: unknown, fallback = 'Pending'): string =>
  toLabel(MISSING_VEHICLE_STATUS, v, fallback);
