import { useQuery } from '@tanstack/react-query';
import { fetchPicklistOptions, type PicklistOption } from '@lib/optionSetApi';
import { ENTITY_LOGICAL_NAMES, PRICE_SUGGESTION_FIELDS } from '@data/dataverseConfig';
import { PRICE_SUGGESTION_STATUS } from '@data/dataverseOptionSets';

/** Hard-coded fallback in case the metadata endpoint is unavailable. */
const FALLBACK: PicklistOption[] = Object.entries(PRICE_SUGGESTION_STATUS).map(
  ([label, value]) => ({ label, value }),
);

/**
 * Fetch the available status options for price suggestions directly from
 * Dataverse metadata. Falls back to hard-coded values if the metadata
 * endpoint is not available.
 *
 * The data is cached for 5 minutes since option sets rarely change.
 */
export function usePriceSuggestionStatusOptions() {
  return useQuery({
    queryKey: ['price-suggestion-statuses', 'options'],
    queryFn: async (): Promise<PicklistOption[]> => {
      const fromApi = await fetchPicklistOptions(
        ENTITY_LOGICAL_NAMES.PRICE_SUGGESTION,
        PRICE_SUGGESTION_FIELDS.STATUS,
      );
      return fromApi.length > 0 ? fromApi : FALLBACK;
    },
    staleTime: 5 * 60 * 1000, // 5 min — optionsets rarely change
    retry: false, // Don't retry metadata endpoint failures
  });
}
