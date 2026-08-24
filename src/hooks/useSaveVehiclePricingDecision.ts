import { useMutation, useQueryClient } from '@tanstack/react-query';
import { missingVehicleRepository } from '@repositories';
import type { SaveMissingVehiclePricingDecisionInput } from '@types';
import toast from 'react-hot-toast';

interface SaveDecisionVariables {
  requestId: string;
  input: SaveMissingVehiclePricingDecisionInput;
}

export function useSaveVehiclePricingDecision() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, SaveDecisionVariables>({
    mutationFn: ({ requestId, input }) =>
      missingVehicleRepository.savePricingDecision(requestId, input),
    onSuccess: (_, variables) => {
      toast.success('Pricing decision saved');
      queryClient.invalidateQueries({ queryKey: ['missing-vehicle-requests'] });
      queryClient.invalidateQueries({
        queryKey: ['missing-vehicle-request', variables.requestId],
      });
    },
    onError: (error) => toast.error(error.message || 'Pricing decision could not be saved'),
  });
}
