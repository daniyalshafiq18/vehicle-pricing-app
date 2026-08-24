import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  executeMultiSourceScrape,
  type ExecuteMultiSourceScrapeInput,
  type MultiSourceScrapeExecutionResult,
} from '@lib/multiSourceScrapeExecution';
import toast from 'react-hot-toast';

const MISSING_VEHICLE_REQUESTS_KEY = 'missing-vehicle-requests';

/** Prepare and dispatch one per-request shared multi-source scrape. */
export function useTriggerMultiSourceScrape() {
  const queryClient = useQueryClient();

  return useMutation<MultiSourceScrapeExecutionResult, Error, ExecuteMultiSourceScrapeInput>({
    mutationFn: (input) => executeMultiSourceScrape(input),
    onSuccess: (result) => {
      if (result.yallaMotorResult) {
        toast.success(
          `YallaMotor: ${result.yallaMotorResult.count} listings · AED ${result.yallaMotorResult.minPrice.toLocaleString()} – ${result.yallaMotorResult.maxPrice.toLocaleString()}`,
        );
        if (result.yallaMotorResult.evidenceWarning) {
          toast.error(
            `YallaMotor evidence needs attention: ${result.yallaMotorResult.evidenceWarning}`,
          );
        }
      }
      for (const failure of result.sourceErrors) {
        toast.error(`${failure.source}: ${failure.error}`);
      }
      if (result.driveArabiaPadUrl) {
        toast('DriveArabia is prepared. Copy its correlated PAD URL to continue.');
      }
      queryClient.invalidateQueries({ queryKey: [MISSING_VEHICLE_REQUESTS_KEY] });
    },
    onError: (error) => {
      toast.error(error.message || 'Unable to prepare scrape');
      queryClient.invalidateQueries({ queryKey: [MISSING_VEHICLE_REQUESTS_KEY] });
    },
  });
}
