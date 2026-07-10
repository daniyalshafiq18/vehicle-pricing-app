import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { priceSuggestionRepository } from '@repositories';
import toast from 'react-hot-toast';

const PRICE_SUGGESTIONS_KEY = 'price-suggestions';

export function usePriceSuggestions() {
  return useQuery({
    queryKey: [PRICE_SUGGESTIONS_KEY],
    queryFn: () => priceSuggestionRepository.getAll(),
    staleTime: 30_000,
  });
}

export function useUpsertPriceSuggestion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: {
      comment?: string;
      minPrice?: number;
      maxPrice?: number;
      sourceUrl?: string;
      submittedBy?: string;
      vehicleId: string;
    }) => priceSuggestionRepository.upsert(payload),
    onSuccess: () => {
      toast.success('Price suggestion submitted!');
      queryClient.invalidateQueries({ queryKey: [PRICE_SUGGESTIONS_KEY] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to submit price suggestion');
    },
  });
}

export function useUpdatePriceSuggestion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, minPrice, maxPrice }: { id: string; minPrice: number | null; maxPrice: number | null }) =>
      priceSuggestionRepository.update(id, minPrice, maxPrice),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [PRICE_SUGGESTIONS_KEY] });
      toast.success('Price suggestion updated');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update price suggestion');
    },
  });
}

export function useUpdatePriceSuggestionStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, statusValue }: { id: string; statusValue: number }) =>
      priceSuggestionRepository.updateStatus(id, statusValue),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [PRICE_SUGGESTIONS_KEY] });
      toast.success('Status updated');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update status');
    },
  });
}
