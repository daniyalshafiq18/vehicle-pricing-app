import { useQuery } from '@tanstack/react-query';
import { vehicleScrapeRepository } from '@repositories';
import type { VehicleScrapeRun, VehicleScrapeSourceResult } from '@types';

export interface VehicleScrapeEvidence {
  run: VehicleScrapeRun;
  results: VehicleScrapeSourceResult[];
}

export function useVehicleScrapeEvidence(missingVehicleRequestId: string | null) {
  return useQuery<VehicleScrapeEvidence | null>({
    queryKey: ['vehicle-scrape-evidence', missingVehicleRequestId],
    queryFn: async () => {
      const runs = await vehicleScrapeRepository.getRuns(missingVehicleRequestId!);
      const run = runs[0];
      if (!run) {
        return null;
      }
      const results = await vehicleScrapeRepository.getSourceResults(run.id);
      return {
        run,
        results: [...results].sort(
          (left, right) => left.sourceValue - right.sourceValue || right.attemptNumber - left.attemptNumber,
        ),
      };
    },
    enabled: !!missingVehicleRequestId,
    staleTime: 10_000,
    refetchInterval: (query) => {
      const status = query.state.data?.run.overallStatus;
      return status === 'Queued' || status === 'Running' ? 10_000 : false;
    },
  });
}
