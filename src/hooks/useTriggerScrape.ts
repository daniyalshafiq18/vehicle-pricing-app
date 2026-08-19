import { useMutation, useQueryClient } from '@tanstack/react-query';
import { scrapeYallaMotorWithDualWrite } from '@lib/yallaMotorDualWrite';
import type {
  YallaMotorDualWriteResult,
  YallaMotorScrapeParams,
} from '@lib/yallaMotorDualWrite';
import toast from 'react-hot-toast';

const MISSING_VEHICLE_REQUESTS_KEY = 'missing-vehicle-requests';

/**
 * Trigger one YallaMotor scrape and persist it through the migration-safe
 * dual-write path: legacy MVR fields plus normalized Run/Source Result rows.
 */
export function useTriggerScrape() {
  const queryClient = useQueryClient();

  return useMutation<YallaMotorDualWriteResult, Error, YallaMotorScrapeParams>({
    mutationFn: (params) => scrapeYallaMotorWithDualWrite(params),
    onSuccess: (result) => {
      toast.success(
        `Scraped ${result.count} listings · AED ${result.minPrice.toLocaleString()} – ${result.maxPrice.toLocaleString()}`,
      );
      if (result.evidenceWarning) {
        toast.error(
          `Scrape completed, but evidence storage needs attention: ${result.evidenceWarning}`,
        );
      }
      queryClient.invalidateQueries({ queryKey: [MISSING_VEHICLE_REQUESTS_KEY] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Scrape failed');
      queryClient.invalidateQueries({ queryKey: [MISSING_VEHICLE_REQUESTS_KEY] });
    },
  });
}
