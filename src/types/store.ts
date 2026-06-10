import type { Vehicle, VehicleFilters, VehicleSortOption, ValuationResult } from './vehicle';
import type { InquiryFormData, VehicleSelectionData, Inquiry } from './inquiry';
import type { AnalyticsData } from './analytics';

export type ThemeMode = 'light' | 'dark' | 'system';

export interface ThemeState {
  mode: ThemeMode;
  isDark: boolean;
  setMode: (mode: ThemeMode) => void;
  toggle: () => void;
}

export interface ModalState {
  activeModal: string | null;
  modalData: Record<string, unknown>;
  openModal: (name: string, data?: Record<string, unknown>) => void;
  closeModal: () => void;
  isOpen: (name: string) => boolean;
}

export interface VehicleState {
  vehicles: Vehicle[];
  selectedVehicle: Vehicle | null;
  valuationResult: ValuationResult | null;
  filters: VehicleFilters;
  sort: VehicleSortOption;
  page: number;
  pageSize: number;
  total: number;
  isLoading: boolean;
  error: string | null;
  setVehicles: (vehicles: Vehicle[]) => void;
  setSelectedVehicle: (vehicle: Vehicle | null) => void;
  setValuationResult: (result: ValuationResult | null) => void;
  setFilters: (filters: Partial<VehicleFilters>) => void;
  resetFilters: () => void;
  setSort: (sort: VehicleSortOption) => void;
  setPage: (page: number) => void;
  setPageSize: (pageSize: number) => void;
  setTotal: (total: number) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
}

export interface InquiryState {
  currentStep: number;
  personalInfo: InquiryFormData;
  vehicleSelection: VehicleSelectionData;
  inquiries: Inquiry[];
  selectedInquiry: Inquiry | null;
  isLoading: boolean;
  setStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  setPersonalInfo: (data: Partial<InquiryFormData>) => void;
  setVehicleSelection: (data: Partial<VehicleSelectionData>) => void;
  reset: () => void;
  setInquiries: (inquiries: Inquiry[]) => void;
  setSelectedInquiry: (inquiry: Inquiry | null) => void;
  setLoading: (loading: boolean) => void;
}

export interface AdminState {
  analytics: AnalyticsData | null;
  isSidebarCollapsed: boolean;
  activeSection: string;
  isLoading: boolean;
  error: string | null;
  setAnalytics: (analytics: AnalyticsData) => void;
  toggleSidebar: () => void;
  setActiveSection: (section: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}
