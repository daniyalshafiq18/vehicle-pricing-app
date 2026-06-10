/**
 * Converts raw Dataverse API response rows into application-level domain
 * models (Vehicle, VehiclePricing, Inquiry, etc.).
 *
 * All option-set integer codes are resolved to string labels via the
 * centralized mappings in ./mappings.ts. Formatted values from the API
 * (returned via "Prefer: odata.include-annotations=*") are preferred
 * when available for display purposes.
 */

import type {
  Vehicle,
  VehiclePricing,
  PriceRange,
  VehicleHierarchy,
  Inquiry,
} from '@types';
import {
  bodyTypeMapping,
  categoryMapping,
  cityMapping,
  doorsMapping,
  drivetrainMapping,
  fuelTypeMapping,
  inquiryStatusMapping,
  transmissionMapping,
  vehicleTypeMapping,
} from './mappings';
import type {
  DataverseVehicleRow,
  DataverseInquiryRow,
  DataverseContactRow,
} from './types';
import { DataverseMappingError } from './errors';

// ─── Vehicle Mapper ──────────────────────────────────────────────────

/**
 * Convert a raw Dataverse vehicle row to an application Vehicle model.
 * Uses the formatted value annotations when available (preferred), falls
 * back to mapping integer codes via the option-set mappings.
 */
export function mapVehicleRow(row: DataverseVehicleRow): Vehicle {
  const formatted = (field: string): string | undefined =>
    (row as unknown as Record<string, string | undefined>)[`${field}@OData.Community.Display.V1.FormattedValue`];

  return {
    id: row.vpi_vehicledataid,
    year: parseYear(row.vpi_year),
    make: row.vpi_make,
    model: row.vpi_model,
    spec: row.vpi_spec,
    trim: row.vpi_spec,
    engineSize: row.vpi_enginesize,
    horsepower: row.vpi_horsepower,
    cylinders: row.vpi_cylinders,
    doors: mapDoors(row.vpi_doors, formatted('vpi_doors')),
    seats: row.vpi_seats,
    transmission: mapTransmission(row.vpi_transmissiontronic, formatted('vpi_transmissiontronic')),
    bodyType: mapBodyType(row.vpi_bodytype, formatted('vpi_bodytype')),
    driveType: mapDriveType(row.vpi_drivetype, formatted('vpi_drivetype')),
    vehicleType: mapVehicleType(row.vpi_vehicletype, formatted('vpi_vehicletype')),
    category: mapCategory(row.vpi_category, formatted('vpi_category')),
    powertrain: mapPowertrain(row.vpi_powertraintype, formatted('vpi_powertraintype')),
    description: row.vpi_description ?? '',
  };
}

/**
 * Convert a vehicle row into a Vehicle + VehiclePricing pair.
 * The pricing comes from the row's min/avg/max price columns directly.
 */
export function mapVehicleWithPricing(row: DataverseVehicleRow): {
  vehicle: Vehicle;
  pricing: VehiclePricing;
} {
  const vehicle = mapVehicleRow(row);
  const pricing = buildPricing(vehicle.id, row);
  return { vehicle, pricing };
}

/**
 * Build a VehiclePricing object from a raw vehicle row.
 */
export function buildPricing(vehicleId: string, row: DataverseVehicleRow): VehiclePricing {
  const avg = row.vpi_avgprice ?? 0;
  const min = row.vpi_minprice ?? 0;
  const max = row.vpi_maxprice ?? 0;
  const spread = row.vpi_pricespreadpct ?? 0;
  const exchangeRate = row.exchangerate ?? 1;

  return {
    vehicleId,
    averagePrice: avg * exchangeRate,
    minimumPrice: min * exchangeRate,
    maximumPrice: max * exchangeRate,
    medianPrice: computeMedian(avg, min, max),
    standardDeviation: computeStdDev(spread, avg),
    sampleSize: 1, // Each row is one vehicle record
    priceRange: buildPriceRange(avg, min, max, spread, exchangeRate),
    confidenceScore: computeConfidenceScore(spread),
    marketTrend: { direction: 'stable', percentage: 0, periodMonths: 3, volatility: 'low' },
    lastUpdated: new Date(),
  };
}

// ─── Contact Mapper ──────────────────────────────────────────────────

/**
 * Convert a raw Dataverse contact row to the shape needed for an Inquiry.
 * Returns the contact fields merged with the row's formatted city value.
 */
export function mapContactRow(row: DataverseContactRow): {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  city: string;
  country: string;
} {
  const formattedCity =
    (row as unknown as Record<string, string | undefined>)['vpi_city@OData.Community.Display.V1.FormattedValue'];

  return {
    id: row.contactid,
    firstName: row.firstname ?? '',
    lastName: row.lastname ?? '',
    email: row.emailaddress1 ?? '',
    city: formattedCity ?? cityMapping.label(row.vpi_city) ?? String(row.vpi_city),
    country: row.vpi_country ?? '',
  };
}

// ─── Inquiry Mapper ──────────────────────────────────────────────────

/**
 * Convert a raw Dataverse inquiry row + optional vehicle/contact data to an
 * application Inquiry model.
 */
export function mapInquiryRow(
  inquiryRow: DataverseInquiryRow,
  vehicle?: Vehicle,
  contact?: { firstName: string; lastName: string; email: string; city: string; country: string },
  valuationPricing?: VehiclePricing,
): Inquiry {
  const statusLabel =
    inquiryRow['vpi_status@OData.Community.Display.V1.FormattedValue']
      ?? inquiryStatusMapping.label(inquiryRow.vpi_status)
      ?? 'pending';

  return {
    id: inquiryRow.vpi_vehicleinquiryid,
    firstName: contact?.firstName ?? '',
    lastName: contact?.lastName ?? '',
    email: contact?.email ?? '',
    phone: '',
    city: contact?.city ?? '',
    country: contact?.country ?? '',
    consent: true, // Consent implied by submitting the form
    selectedVehicle: vehicle
      ? {
          year: vehicle.year,
          make: vehicle.make,
          model: vehicle.model,
          spec: vehicle.spec,
          bodyType: vehicle.bodyType,
        }
      : { year: 0, make: '', model: '', spec: '', bodyType: '' },
    valuationResult: vehicle && valuationPricing
      ? {
          vehicle,
          pricing: valuationPricing,
          comparables: [],
          marketInsights: [],
          confidenceIndicator: 'moderate',
        }
      : undefined,
    createdAt: new Date(),
    status: normalizeStatus(statusLabel),
  };
}

// ─── Pricing Helpers ────────────────────────────────────────────────

function buildPriceRange(
  avg: number,
  min: number,
  max: number,
  spread: number,
  exchangeRate: number,
): PriceRange {
  const stdDev = computeStdDev(spread, avg);
  return {
    min: min * exchangeRate,
    max: max * exchangeRate,
    average: avg * exchangeRate,
    median: computeMedian(avg, min, max),
    p10: Math.max(0, avg - stdDev * 1.28) * exchangeRate,
    p25: Math.max(0, avg - stdDev * 0.67) * exchangeRate,
    p75: (avg + stdDev * 0.67) * exchangeRate,
    p90: (avg + stdDev * 1.28) * exchangeRate,
  };
}

function computeMedian(avg: number, min: number, max: number): number {
  // Estimate median from average, min, max assuming slight skew
  return (min + avg * 2 + max) / 4;
}

function computeStdDev(spreadPercent: number, avg: number): number {
  // Estimate standard deviation from price spread percentage
  return (avg * (spreadPercent / 100)) / 2;
}

function computeConfidenceScore(spreadPercent: number): number {
  // Higher spread → lower confidence
  const score = Math.max(50, 100 - spreadPercent);
  return Math.min(99, Math.round(score));
}

// ─── Option-Set Mapping Helpers ─────────────────────────────────────

function mapBodyType(code: number, formatted?: string): Vehicle['bodyType'] {
  if (formatted) return formatted as Vehicle['bodyType'];
  const label = bodyTypeMapping.label(code);
  if (!label) throw new DataverseMappingError(`Unknown body type code: ${code}`);
  return label as Vehicle['bodyType'];
}

function mapTransmission(code: number, formatted?: string): Vehicle['transmission'] {
  if (formatted) return formatted as Vehicle['transmission'];
  const label = transmissionMapping.label(code);
  if (!label) throw new DataverseMappingError(`Unknown transmission code: ${code}`);
  return label as Vehicle['transmission'];
}

function mapDriveType(code: number, formatted?: string): Vehicle['driveType'] {
  if (formatted) return formatted as Vehicle['driveType'];
  const label = drivetrainMapping.label(code);
  if (!label) throw new DataverseMappingError(`Unknown drive type code: ${code}`);
  return label as Vehicle['driveType'];
}

function mapVehicleType(code: number, formatted?: string): Vehicle['vehicleType'] {
  if (formatted) return formatted as Vehicle['vehicleType'];
  const label = vehicleTypeMapping.label(code);
  if (!label) throw new DataverseMappingError(`Unknown vehicle type code: ${code}`);
  return label as Vehicle['vehicleType'];
}

function mapCategory(code: number, formatted?: string): Vehicle['category'] {
  if (formatted) return formatted as Vehicle['category'];
  const label = categoryMapping.label(code);
  if (!label) throw new DataverseMappingError(`Unknown category code: ${code}`);
  return label as Vehicle['category'];
}

function mapPowertrain(code: number, formatted?: string): Vehicle['powertrain'] {
  if (formatted) return formatted as Vehicle['powertrain'];
  const label = fuelTypeMapping.label(code);
  if (!label) throw new DataverseMappingError(`Unknown powertrain code: ${code}`);
  return label as Vehicle['powertrain'];
}

function mapDoors(code: number, formatted?: string): number {
  if (formatted) {
    const parsed = parseInt(formatted, 10);
    if (!isNaN(parsed)) return parsed;
  }
  const label = doorsMapping.label(code);
  if (!label) throw new DataverseMappingError(`Unknown doors code: ${code}`);
  const parsed = parseInt(label, 10);
  return isNaN(parsed) ? 0 : parsed;
}

function parseYear(yearStr: string): number {
  const year = parseInt(yearStr, 10);
  return isNaN(year) ? 0 : year;
}

function normalizeStatus(label: string): Inquiry['status'] {
  const lower = label.toLowerCase() as Inquiry['status'];
  if (['pending', 'reviewed', 'contacted', 'closed'].includes(lower)) {
    return lower;
  }
  return 'pending';
}

// ─── Hierarchy Builder ──────────────────────────────────────────────

/**
 * Build a VehicleHierarchy from an array of mapped vehicles.
 * This mirrors the ExcelDataSource.buildHierarchy() logic.
 */
export function buildHierarchy(vehicles: Vehicle[]): VehicleHierarchy {
  const years = new Set<number>();
  const makes: Record<number, string[]> = {};
  const models: Record<string, string[]> = {};
  const specs: Record<string, string[]> = {};
  const bodyTypes: Record<string, string[]> = {};
  const transmissions: Record<string, string[]> = {};
  const driveTypes: Record<string, string[]> = {};
  const categories: Record<string, string[]> = {};
  const powertrains: Record<string, string[]> = {};
  const vehicleTypes: Record<string, string[]> = {};

  for (const v of vehicles) {
    years.add(v.year);
    if (!makes[v.year]) makes[v.year] = [];
    if (!makes[v.year]!.includes(v.make)) makes[v.year]!.push(v.make);

    const modelKey = `${v.year}-${v.make.toLowerCase()}`;
    if (!models[modelKey]) models[modelKey] = [];
    if (!models[modelKey]!.includes(v.model)) models[modelKey]!.push(v.model);

    const specKey = `${v.year}-${v.make.toLowerCase()}-${v.model.toLowerCase()}`;
    if (!specs[specKey]) specs[specKey] = [];
    if (!specs[specKey]!.includes(v.spec)) specs[specKey]!.push(v.spec);

    if (v.bodyType) {
      const btKey = `${v.year}-${v.make.toLowerCase()}-${v.model.toLowerCase()}-${v.spec.toLowerCase()}`;
      if (!bodyTypes[btKey]) bodyTypes[btKey] = [];
      if (!bodyTypes[btKey]!.includes(v.bodyType)) bodyTypes[btKey]!.push(v.bodyType);
    }

    const propKey = `${v.year}-${v.make.toLowerCase()}-${v.model.toLowerCase()}`;
    if (v.transmission) {
      if (!transmissions[propKey]) transmissions[propKey] = [];
      if (!transmissions[propKey]!.includes(v.transmission)) transmissions[propKey]!.push(v.transmission);
    }
    if (v.driveType) {
      if (!driveTypes[propKey]) driveTypes[propKey] = [];
      if (!driveTypes[propKey]!.includes(v.driveType)) driveTypes[propKey]!.push(v.driveType);
    }
    if (v.category) {
      if (!categories[propKey]) categories[propKey] = [];
      if (!categories[propKey]!.includes(v.category)) categories[propKey]!.push(v.category);
    }
    if (v.powertrain) {
      if (!powertrains[propKey]) powertrains[propKey] = [];
      if (!powertrains[propKey]!.includes(v.powertrain)) powertrains[propKey]!.push(v.powertrain);
    }
    if (v.vehicleType) {
      if (!vehicleTypes[propKey]) vehicleTypes[propKey] = [];
      if (!vehicleTypes[propKey]!.includes(v.vehicleType)) vehicleTypes[propKey]!.push(v.vehicleType);
    }
  }

  const sortedYears = [...years].sort((a, b) => b - a);
  for (const y of sortedYears) {
    makes[y]?.sort();
  }
  Object.values(models).forEach((arr) => arr.sort());
  Object.values(specs).forEach((arr) => arr.sort());
  Object.values(bodyTypes).forEach((arr) => arr.sort());
  Object.values(transmissions).forEach((arr) => arr.sort());
  Object.values(driveTypes).forEach((arr) => arr.sort());
  Object.values(categories).forEach((arr) => arr.sort());
  Object.values(powertrains).forEach((arr) => arr.sort());
  Object.values(vehicleTypes).forEach((arr) => arr.sort());

  return {
    years: sortedYears,
    makes,
    models,
    specs,
    bodyTypes,
    transmissions,
    driveTypes,
    categories,
    powertrains,
    vehicleTypes,
  };
}
