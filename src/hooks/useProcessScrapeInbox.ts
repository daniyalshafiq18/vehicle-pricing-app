import { useMutation, useQueryClient } from '@tanstack/react-query';
import { processScrapeInbox } from '@lib/multiSourceScraper';
import type { MissingVehicleRequest } from '@types';
import toast from 'react-hot-toast';

const MISSING_VEHICLE_REQUESTS_KEY = 'missing-vehicle-requests';

export function useProcessScrapeInbox() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (requests: MissingVehicleRequest[]) => processScrapeInbox({ requests }),
    onSuccess: (summary) => {
      if (summary.waitingItems > 0) {
        toast.error('Pending PAD capture has no exact matching vehicle request yet');
        return;
      }
      if (summary.processedItems === 0) {
        toast('No pending PAD captures');
        return;
      }
      if (summary.failedItems > 0) {
        const firstFailure = summary.failures[0];
        const failureDetail = firstFailure ? `: ${firstFailure.error}` : '';
        toast.error(
          `PAD inbox: ${summary.completedItems} completed, ${summary.failedItems} failed${failureDetail}`,
        );
      } else if (summary.evidenceWarnings.length > 0) {
        toast.error(
          `PAD processing completed, but evidence storage needs attention: ${summary.evidenceWarnings[0]!.error}`,
        );
      } else {
        toast.success(
          `Processed ${summary.completedItems} PAD capture${summary.completedItems === 1 ? '' : 's'} · ${summary.updatedRequestIds.length} request${summary.updatedRequestIds.length === 1 ? '' : 's'} updated`,
        );
      }
      queryClient.invalidateQueries({ queryKey: [MISSING_VEHICLE_REQUESTS_KEY] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'PAD inbox processing failed');
    },
  });
}
