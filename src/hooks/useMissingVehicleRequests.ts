import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { missingVehicleRepository } from '@repositories';
import toast from 'react-hot-toast';

const MISSING_VEHICLE_REQUESTS_KEY = 'missing-vehicle-requests';

export function useMissingVehicleRequests() {
  return useQuery({
    queryKey: [MISSING_VEHICLE_REQUESTS_KEY],
    queryFn: () => missingVehicleRepository.getAll(),
    staleTime: 30_000,
  });
}

export function useUpsertMissingVehicleRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: {
      make: string;
      model: string;
      bodyType: string;
      trim: string;
      modelYear: number;
    }) => missingVehicleRepository.upsert(payload),
    onSuccess: () => {
      toast.success('Vehicle request submitted!');
      queryClient.invalidateQueries({ queryKey: [MISSING_VEHICLE_REQUESTS_KEY] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to submit vehicle request');
    },
  });
}
