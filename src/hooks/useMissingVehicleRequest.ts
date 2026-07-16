import { useQuery } from '@tanstack/react-query';
import { missingVehicleRepository } from '@repositories';
import type { MissingVehicleRequest } from '@types';

/**
 * Fetch + poll a single missing vehicle request by ID.
 *
 * Automatically polls every 15 seconds while the scrape status is
 * non-terminal (Pending / Testing / In Progress) and stops once the
 * scrape settles (Scraped / Failed / Unreachable).
 *
 * Pass `null` to disable (e.g. before the MVR has been created).
 */
export function useMissingVehicleRequest(id: string | null) {
  return useQuery<MissingVehicleRequest | null>({
    queryKey: ['missing-vehicle-request', id],
    queryFn: () => missingVehicleRepository.getById(id!),
    enabled: !!id,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return 15_000;
      const terminalStatuses: string[] = ['Scraped', 'Failed', 'Unreachable'];
      return terminalStatuses.includes(data.scrapeStatus ?? '') ? false : 15_000;
    },
    staleTime: 0,
    retry: false,
  });
}
