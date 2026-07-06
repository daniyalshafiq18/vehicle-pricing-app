/**
 * Dataverse Option Set Metadata API
 *
 * Fetches picklist (optionset) options directly from the Dataverse metadata
 * endpoint so the app uses the live labels and values from Dataverse rather
 * than a hard-coded copy in TypeScript.
 *
 * Falls back to an empty array when the metadata endpoint is unavailable
 * (local dev, restricted portal permissions), so callers always supply a
 * hard-coded fallback.
 *
 * @see ../data/dataverseOptionSets.ts for the hard-coded fallback values
 */

import { safeFetch } from './safeAjax';

// ─── Types ────────────────────────────────────────────

export interface PicklistOption {
  value: number;
  label: string;
}

interface RawOption {
  Value: number;
  Label: {
    UserLocalizedLabel?: {
      Label?: string;
    };
  };
}

interface PicklistAttributeResponse {
  LogicalName?: string;
  OptionSet?: {
    Options?: RawOption[];
  };
}

// ─── Fetcher ───────────────────────────────────────────

/**
 * Fetch the full list of options for a picklist (optionset) field directly
 * from the Dataverse EntityDefinitions metadata API.
 *
 * @param entityName - Logical name of the entity (e.g. "vpi_pricesuggestions")
 * @param fieldName  - Logical name of the picklist attribute (e.g. "vpi_status")
 * @returns Array of { value, label } options, or empty array on failure.
 */
export async function fetchPicklistOptions(
  entityName: string,
  fieldName: string,
): Promise<PicklistOption[]> {
  const url =
    `/_api/EntityDefinitions(LogicalName='${entityName}')` +
    `/Attributes(LogicalName='${fieldName}')` +
    `/Microsoft.Dynamics.CRM.PicklistAttributeMetadata` +
    `?$select=LogicalName&$expand=OptionSet($select=Options)`;

  try {
    const raw = await safeFetch<PicklistAttributeResponse>({ url });
    const options = raw?.OptionSet?.Options ?? [];

    return options
      .filter((opt) => typeof opt.Value === 'number')
      .map((opt) => ({
        value: opt.Value,
        label:
          opt.Label?.UserLocalizedLabel?.Label ?? String(opt.Value),
      }));
  } catch {
    // Metadata endpoint unavailable (local dev / restricted permissions)
    return [];
  }
}
