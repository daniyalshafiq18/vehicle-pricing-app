import { useQuery } from '@tanstack/react-query';
import { vehicleRepository } from '@repositories';
import { useVehicleStore } from '@stores';
import type { VehicleFilters, VehicleSortOption } from '@types';
import { useEffect } from 'react';

const VEHICLES_KEY = 'vehicles';
const VEHICLE_KEY = 'vehicle';
const HIERARCHY_KEY = 'vehicle-hierarchy';

export function useVehicles(filters?: VehicleFilters, sort?: VehicleSortOption, page = 1, pageSize = 20) {
  const setVehicles = useVehicleStore((s) => s.setVehicles);
  const setTotal = useVehicleStore((s) => s.setTotal);
  const setLoading = useVehicleStore((s) => s.setLoading);
  const setError = useVehicleStore((s) => s.setError);

  const query = useQuery({
    queryKey: [VEHICLES_KEY, { filters, sort, page, pageSize }],
    queryFn: () => vehicleRepository.getAll(filters, sort, page, pageSize),
  });

  useEffect(() => {
    if (query.data) {
      setVehicles(query.data.vehicles);
      setTotal(query.data.total);
    }
    setLoading(query.isLoading);
    if (query.error) setError(query.error.message);
  }, [query.data, query.isLoading, query.error, setVehicles, setTotal, setLoading, setError]);

  return query;
}

export function useVehicle(id: string | undefined) {
  return useQuery({
    queryKey: [VEHICLE_KEY, id],
    queryFn: () => (id ? vehicleRepository.getById(id) : null),
    enabled: !!id,
  });
}

export function useVehicleHierarchy() {
  return useQuery({
    queryKey: [HIERARCHY_KEY],
    queryFn: () => vehicleRepository.getHierarchy(),
    staleTime: Infinity,
  });
}

export function useVehicleMakes(year: number | null) {
  return useQuery({
    queryKey: ['vehicle-makes', year],
    queryFn: () => (year ? vehicleRepository.getMakes(year) : Promise.resolve([])),
    enabled: !!year,
  });
}

export function useVehicleModels(year: number | null, make: string) {
  return useQuery({
    queryKey: ['vehicle-models', year, make],
    queryFn: () => (year && make ? vehicleRepository.getModels(year, make) : Promise.resolve([])),
    enabled: !!year && !!make,
  });
}

export function useVehicleSpecs(year: number | null, make: string, model: string) {
  return useQuery({
    queryKey: ['vehicle-specs', year, make, model],
    queryFn: () => (year && make && model ? vehicleRepository.getSpecsList(year, make, model) : Promise.resolve([])),
    enabled: !!year && !!make && !!model,
  });
}

export function useVehicleSearch(query: string) {
  return useQuery({
    queryKey: ['vehicle-search', query],
    queryFn: () => vehicleRepository.search(query),
    enabled: query.length >= 2,
    staleTime: 30_000,
  });
}
