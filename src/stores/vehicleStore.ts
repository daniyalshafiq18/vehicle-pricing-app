import { create } from 'zustand';
import type { VehicleState } from '@types';
import type { VehicleFilters, VehicleSortOption, Vehicle } from '@types';
import type { ValuationResult } from '@types';

const defaultFilters: VehicleFilters = {};
const defaultSort: VehicleSortOption = { field: 'year', direction: 'desc' };

export const useVehicleStore = create<VehicleState>()((set) => ({
  vehicles: [],
  selectedVehicle: null,
  valuationResult: null,
  filters: defaultFilters,
  sort: defaultSort,
  page: 1,
  pageSize: 20,
  total: 0,
  isLoading: false,
  error: null,

  setVehicles: (vehicles: Vehicle[]) => set({ vehicles }),
  setSelectedVehicle: (vehicle: Vehicle | null) => set({ selectedVehicle: vehicle }),
  setValuationResult: (result: ValuationResult | null) => set({ valuationResult: result }),

  setFilters: (filters: Partial<VehicleFilters>) =>
    set((state) => ({ filters: { ...state.filters, ...filters }, page: 1 })),

  resetFilters: () => set({ filters: defaultFilters, page: 1 }),

  setSort: (sort: VehicleSortOption) => set({ sort }),
  setPage: (page: number) => set({ page }),
  setPageSize: (pageSize: number) => set({ pageSize, page: 1 }),
  setTotal: (total: number) => set({ total }),
  setLoading: (isLoading: boolean) => set({ isLoading }),
  setError: (error: string | null) => set({ error }),
}));
