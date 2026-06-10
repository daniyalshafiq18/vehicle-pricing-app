import { create } from 'zustand';
import type { DashboardFilters, DashboardFilterState, FilterKey } from '@types';

const initialFilters: DashboardFilters = {
  year: undefined,
  make: undefined,
  model: undefined,
  spec: undefined,
  bodyType: undefined,
  transmission: undefined,
  driveType: undefined,
  powertrain: undefined,
  category: undefined,
  vehicleType: undefined,
  minPrice: undefined,
  maxPrice: undefined,
  minHorsepower: undefined,
  maxHorsepower: undefined,
  engineSize: undefined,
};

export const useDashboardStore = create<DashboardFilterState>()((set) => ({
  filters: { ...initialFilters },
  selectedVehicleId: null,
  isModalOpen: false,

  setFilter: (key: FilterKey, value: any) =>
    set((state) => ({
      filters: { ...state.filters, [key]: value || undefined },
    })),

  setFilters: (filters: Partial<DashboardFilters>) =>
    set((state) => ({
      filters: { ...state.filters, ...filters },
    })),

  clearFilters: () => set({ filters: { ...initialFilters } }),

  selectVehicle: (vehicleId: string | null) => set({ selectedVehicleId: vehicleId }),

  openModal: (vehicleId: string) => set({ selectedVehicleId: vehicleId, isModalOpen: true }),

  closeModal: () => set({ isModalOpen: false }),
}));
