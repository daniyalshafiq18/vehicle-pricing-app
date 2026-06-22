import type {
  Vehicle,
  VehiclePricing,
  VehicleHierarchy,
  VehicleFilters,
  VehicleSortOption,
  ValuationResult,
  ComparableVehicle,
} from './vehicle';
import type { AnalyticsData, DashboardAnalytics, DashboardFilters } from './analytics';
import type { Inquiry } from './inquiry';

/**
 * IDataSource — abstract data access layer.
 *
 * The entire application talks to data through this interface.
 * Implement this interface in a new class and swap it at the
 * provider level to change backends. No UI components change.
 */
export interface IDataSource {
  // ─── Lifecycle ────────────────────────────────────────
  initialize(): Promise<void>;
  isInitialized(): boolean;

  // ─── Vehicles ─────────────────────────────────────────
  getVehicles(filters?: VehicleFilters, sort?: VehicleSortOption, page?: number, pageSize?: number): Promise<{ vehicles: Vehicle[]; total: number }>;
  getVehicleById(id: string): Promise<Vehicle | null>;
  getVehicleHierarchy(): Promise<VehicleHierarchy>;
  getVehicleSpecs(year: number, make: string, model: string): Promise<Vehicle[]>;
  searchVehicles(query: string, limit?: number): Promise<Vehicle[]>;

  // ─── Pricing ──────────────────────────────────────────
  getPricing(vehicleId: string): Promise<VehiclePricing | null>;
  getPricingByCriteria(year: number, make: string, model: string, spec: string): Promise<VehiclePricing | null>;
  getComparableVehicles(vehicleId: string, limit?: number): Promise<ComparableVehicle[]>;
  getValuation(year: number, make: string, model: string, spec: string, bodyType?: string): Promise<ValuationResult | null>;
  getPriceRange(filters?: VehicleFilters): Promise<{ min: number; max: number; average: number }>;

  // ─── Analytics ────────────────────────────────────────
  getAnalytics(): Promise<AnalyticsData>;
  getDashboardAnalytics(filters?: DashboardFilters): Promise<DashboardAnalytics>;
  getAllVehiclesWithPricing(filters?: VehicleFilters): Promise<{ vehicle: Vehicle; pricing: VehiclePricing }[]>;

  // ─── Makes / Models / Years (lookups) ────────────────
  getYears(): Promise<number[]>;
  getMakes(year: number): Promise<string[]>;
  getModels(year: number, make: string): Promise<string[]>;
  getSpecs(year: number, make: string, model: string): Promise<string[]>;

  // ─── Inquiries ────────────────────────────────────────
  saveInquiry(inquiry: Inquiry): Promise<void>;
  getInquiries(): Promise<Inquiry[]>;
  getInquiryById(id: string): Promise<Inquiry | null>;
  updateInquiryStatus(id: string, status: Inquiry['status']): Promise<void>;
}
