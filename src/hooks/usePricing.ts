import { useQuery } from '@tanstack/react-query';
import { pricingRepository } from '@repositories';

const PRICING_KEY = 'pricing';
const VALUATION_KEY = 'valuation';

export function usePricing(vehicleId: string | undefined) {
  return useQuery({
    queryKey: [PRICING_KEY, vehicleId],
    queryFn: () => (vehicleId ? pricingRepository.getByVehicleId(vehicleId) : null),
    enabled: !!vehicleId,
  });
}

export function useValuation(year: number | null, make: string, model: string, spec: string, bodyType?: string) {
  return useQuery({
    queryKey: [VALUATION_KEY, year, make, model, spec, bodyType],
    queryFn: () => (year && make && model && spec ? pricingRepository.getValuation(year, make, model, spec, bodyType) : null),
    enabled: !!year && !!make && !!model && !!spec,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}

export function useComparableVehicles(vehicleId: string | undefined, limit = 5) {
  return useQuery({
    queryKey: ['comparable-vehicles', vehicleId, limit],
    queryFn: () => (vehicleId ? pricingRepository.getComparables(vehicleId, limit) : Promise.resolve([])),
    enabled: !!vehicleId,
  });
}

export function usePriceRange() {
  return useQuery({
    queryKey: ['price-range'],
    queryFn: () => pricingRepository.getPriceRange(),
  });
}

/** Batch fetch pricing for multiple vehicle IDs — eliminates N+1 pricing queries on table pages */
export function useBatchPricing(vehicleIds: string[]) {
  return useQuery({
    queryKey: ['batch-pricing', vehicleIds],
    queryFn: () => pricingRepository.batchGetPricing(vehicleIds),
    enabled: vehicleIds.length > 0,
    staleTime: 5 * 60 * 1000,
  });
}
