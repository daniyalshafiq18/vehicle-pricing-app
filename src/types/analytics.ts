import type { BodyType, DriveType, PowertrainType, TransmissionType, VehicleCategory } from './vehicle';

export interface AnalyticsOverview {
  totalVehicles: number;
  totalMakes: number;
  totalModels: number;
  averageMarketPrice: number;
  highestVehicleValue: number;
  lowestVehicleValue: number;
  priceRangeSpread: number;
  lastUpdated: Date;
}

export interface VehicleCountByMake {
  make: string;
  count: number;
  averagePrice: number;
  percentage: number;
}

export interface VehicleCountByModel {
  make: string;
  model: string;
  count: number;
  averagePrice: number;
}

export interface PriceDistribution {
  range: string;
  min: number;
  max: number;
  count: number;
  percentage: number;
}

export interface PriceByYear {
  year: number;
  averagePrice: number;
  medianPrice: number;
  minimumPrice: number;
  maximumPrice: number;
  count: number;
}

export interface PriceByCategory {
  category: VehicleCategory;
  averagePrice: number;
  medianPrice: number;
  count: number;
}

export interface TransmissionAnalysis {
  transmission: TransmissionType;
  count: number;
  averagePrice: number;
  percentage: number;
}

export interface DriveTypeAnalysis {
  driveType: DriveType;
  count: number;
  averagePrice: number;
  percentage: number;
}

export interface PowertrainAnalysis {
  powertrain: PowertrainType;
  count: number;
  averagePrice: number;
  percentage: number;
}

export interface BodyTypeAnalysis {
  bodyType: BodyType;
  count: number;
  averagePrice: number;
  percentage: number;
}

export interface AnalyticsData {
  overview: AnalyticsOverview;
  countByMake: VehicleCountByMake[];
  countByModel: VehicleCountByModel[];
  priceDistribution: PriceDistribution[];
  priceByYear: PriceByYear[];
  priceByCategory: PriceByCategory[];
  transmissionAnalysis: TransmissionAnalysis[];
  driveTypeAnalysis: DriveTypeAnalysis[];
  powertrainAnalysis: PowertrainAnalysis[];
  bodyTypeAnalysis: BodyTypeAnalysis[];
}

// ─── Scatter Plot (Performance vs Value) ──────────────
export interface ScatterDataPoint {
  horsepower: number;
  averagePrice: number;
  make: string;
  model: string;
  spec: string;
  vehicleId: string;
  year: number;
}

// ─── Box Plot (Price Volatility) ─────────────────────
export interface BoxPlotData {
  category: string;
  min: number;
  q1: number;
  median: number;
  q3: number;
  max: number;
  count: number;
  outliers: { vehicleId: string; price: number }[];
}

// ─── Age Distribution ────────────────────────────────
export interface AgeDistribution {
  year: number;
  count: number;
  percentage: number;
}

// ─── Top Vehicles (Leaderboard) ──────────────────────
export interface TopVehicle {
  rank: number;
  year: number;
  make: string;
  model: string;
  spec: string;
  minPrice: number;
  averagePrice: number;
  maxPrice: number;
  vehicleId: string;
}

// ─── Dashboard Global Filters ────────────────────────
export interface DashboardFilters {
  year?: number;
  make?: string;
  model?: string;
  spec?: string;
  bodyType?: string;
  transmission?: string;
  driveType?: string;
  powertrain?: string;
  category?: string;
  vehicleType?: string;
  minPrice?: number;
  maxPrice?: number;
  minHorsepower?: number;
  maxHorsepower?: number;
  engineSize?: number;
}

export type FilterKey = keyof DashboardFilters;

export interface DashboardAnalytics {
  overview: AnalyticsOverview;
  topMakes: VehicleCountByMake[];
  priceDistribution: PriceDistribution[];
  valueTrend: PriceByYear[];
  powertrainComposition: PowertrainAnalysis[];
  scatterData: ScatterDataPoint[];
  bodyTypeDistribution: BodyTypeAnalysis[];
  ageDistribution: AgeDistribution[];
  boxPlot: BoxPlotData[];
  topModels: VehicleCountByModel[];
  premiumLeaderboard: TopVehicle[];
  totalFiltered: number;
  totalUnfiltered: number;
}

export interface DashboardFilterState {
  filters: DashboardFilters;
  selectedVehicleId: string | null;
  isModalOpen: boolean;
  setFilter: (key: FilterKey, value: any) => void;
  setFilters: (filters: Partial<DashboardFilters>) => void;
  clearFilters: () => void;
  selectVehicle: (vehicleId: string | null) => void;
  openModal: (vehicleId: string) => void;
  closeModal: () => void;
}

export interface ChartConfig {
  height: number;
  width?: number;
  margin?: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  showGrid?: boolean;
  showLegend?: boolean;
  showTooltip?: boolean;
  animate?: boolean;
}
