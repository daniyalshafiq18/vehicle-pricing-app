/**
 * `normalizeToDataverse` — the single label→integer conversion boundary.
 *
 * Its job (guide §5.3): take a label-level `DetailSpecs` and produce the
 * Dataverse option-set integers written to the Missing Vehicle Request table.
 * Because this is the one place labels become integers, it is tested once and
 * permanently guards the 2026-08-03 label-round-trip bug (labels read back and
 * re-looked-up dropped fields on casing/separator mismatch — raw integer
 * threading for shared-value sets, label lookup only as a fallback).
 *
 * Mirrors the mapping previously inlined in `useTriggerScrape.ts` exactly —
 * behaviour-preserving extraction, now backed by tests.
 */

import {
  missingVehicleBodyTypeValue,
  missingVehicleFuelTypeValue,
  missingVehicleTransmissionTypeValue,
  missingVehicleDriveTypeValue,
  missingVehicleCylindersValue,
  CATEGORY,
} from '@data/dataverseOptionSets';

import type { DetailSpecs, NormalizedListing } from './types';
import { lookupDoorsValue, lookupSeatsValue, mapCategory, mapDriveType, mapFuelType } from './mappers';

/** Map a label-level `DetailSpecs` into the Dataverse option-set integers. */
export function normalizeToDataverse(specs: DetailSpecs): NormalizedListing {
  const bodyTypeValue = specs.bodyType ? missingVehicleBodyTypeValue(specs.bodyType) ?? undefined : undefined;
  const fuelTypeValue = specs.fuelType
    ? missingVehicleFuelTypeValue(mapFuelType(specs.fuelType) ?? specs.fuelType) ?? undefined
    : undefined;
  const transmissionValue = specs.transmission
    ? missingVehicleTransmissionTypeValue(specs.transmission) ?? undefined
    : undefined;
  const driveTypeLabel = specs.driveType ? mapDriveType(specs.driveType) : undefined;
  const driveTypeValue = driveTypeLabel ? missingVehicleDriveTypeValue(driveTypeLabel) ?? undefined : undefined;
  const cylindersValue = specs.cylinders ? missingVehicleCylindersValue(specs.cylinders) ?? undefined : undefined;
  const engineSizeValue = specs.engineSize ? Number(specs.engineSize) || undefined : undefined;
  const doorsValue = specs.doors ? lookupDoorsValue(specs.doors) : undefined;
  const seatsValue = specs.seats ? lookupSeatsValue(specs.seats) : undefined;
  const categoryLabel = specs.regionalSpecs ? mapCategory(specs.regionalSpecs) : undefined;
  const categoryValue = categoryLabel ? (CATEGORY[categoryLabel] ?? undefined) : undefined;
  const mileageValue =
    specs.mileage !== undefined && specs.mileage !== null && specs.mileage !== ''
      ? Number(specs.mileage) || undefined
      : undefined;

  return {
    bodyTypeValue,
    fuelTypeValue,
    transmissionValue,
    driveTypeValue,
    cylindersValue,
    engineSizeValue,
    doorsValue,
    seatsValue,
    categoryValue,
    mileageValue,
  };
}