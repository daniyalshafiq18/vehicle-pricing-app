export interface Vehicle {
  id: string;
  year: number;
  make: string;
  model: string;
  spec: string;
  trim?: string;
  engineSize: number;
  horsepower: number;
  cylinders: number;
  doors: number;
  seats: number;
  transmission: TransmissionType;
  bodyType: BodyType;
  driveType: DriveType;
  vehicleType: VehicleType;
  category: VehicleCategory;
  powertrain: PowertrainType;
  description: string;
  imageUrl?: string;
  features?: string[];
}

export type TransmissionType =
  | 'Automatic'
  | 'Manual'
  | 'CVT'
  | 'DCT'
  | 'Semi-Automatic'
  | 'Dual Clutch'
  | 'Direct Drive'
  | 'Selespeed'
  | 'Multimode'
  | 'Touchtronic'
  | 'S-Tronic'
  | 'Multitronic'
  | 'R-Tronic'
  | 'Cvt'
  | 'Pdk'
  | 'E-Cvt'
  | 'Powershift'
  | 'Sequential'
  | 'Geartronic'
  | 'Active Select'
  | 'E-Gear'
  | 'Quickshift'
  | 'Sport Mode';
export type BodyType =
  | 'SUV'
  | 'Sedan'
  | 'Coupe'
  | 'Convertible'
  | 'Hatchback'
  | 'Wagon'
  | 'Pickup'
  | 'Van'
  | 'Crossover'
  | 'Supercar'
  | 'Coupe/Cabriolet'
  | 'Suv'
  | 'Estate'
  | 'Sportback'
  | 'Suv Coupe'
  | 'Suv- Crossover'
  | 'Pick Up Double Cab'
  | 'Mpv'
  | 'Pick Up'
  | 'Targa'
  | 'Crew Cab'
  | 'Suv- Compact'
  | 'Minivan'
  | 'Cargo Van'
  | 'Soft Top'
  | 'Hard Top'
  | 'Station'
  | 'Minibus'
  | 'Limousine';
export type DriveType = 'AWD' | '4WD' | 'FWD' | 'RWD' | 'Unknown';
export type VehicleType = 'Car' | 'Light Commercial Vehicle' | 'Heavy Commercial Vehicle';
export type VehicleCategory = 'OTHER/STANDARD' | 'NON-GCC' | 'GCC';
export type PowertrainType = 'Petrol/Diesel' | 'Hybrid' | 'Electric';

export interface VehiclePricing {
  vehicleId: string;
  averagePrice: number;
  minimumPrice: number;
  maximumPrice: number;
  medianPrice: number;
  standardDeviation: number;
  sampleSize: number;
  priceRange: PriceRange;
  confidenceScore: number;
  marketTrend: MarketTrend;
  lastUpdated: Date;
}

export interface PriceRange {
  min: number;
  max: number;
  average: number;
  median: number;
  p10: number;
  p25: number;
  p75: number;
  p90: number;
}

export interface MarketTrend {
  direction: 'up' | 'down' | 'stable';
  percentage: number;
  periodMonths: number;
  volatility: 'low' | 'medium' | 'high';
}

export interface ComparableVehicle {
  vehicle: Vehicle;
  pricing: VehiclePricing;
  similarityScore: number;
  priceDifference: number;
  priceDifferencePercentage: number;
}

export interface ValuationResult {
  vehicle: Vehicle;
  pricing: VehiclePricing;
  comparables: ComparableVehicle[];
  marketInsights: MarketInsight[];
  confidenceIndicator: ConfidenceLevel;
}

export type ConfidenceLevel = 'very-high' | 'high' | 'moderate' | 'low' | 'very-low';

export interface MarketInsight {
  type: 'price-trend' | 'supply-demand' | 'seasonal' | 'regional' | 'segment';
  title: string;
  description: string;
  severity: 'positive' | 'negative' | 'neutral';
  value?: string;
}

export interface VehicleHierarchy {
  years: number[];
  makes: Record<number, string[]>;
  models: Record<string, string[]>;
  specs: Record<string, string[]>;
  bodyTypes: Record<string, string[]>;
  transmissions: Record<string, string[]>;
  driveTypes: Record<string, string[]>;
  categories: Record<string, string[]>;
  powertrains: Record<string, string[]>;
  vehicleTypes: Record<string, string[]>;
}

export interface VehicleFilters {
  year?: number;
  make?: string;
  model?: string;
  spec?: string;
  bodyType?: BodyType;
  transmission?: TransmissionType;
  driveType?: DriveType;
  powertrain?: PowertrainType;
  vehicleType?: VehicleType;
  category?: VehicleCategory;
  minPrice?: number;
  maxPrice?: number;
  minYear?: number;
  maxYear?: number;
  search?: string;
}

export interface VehicleSortOption {
  field: VehicleSortField;
  direction: 'asc' | 'desc';
}

export type VehicleSortField =
  | 'year'
  | 'make'
  | 'model'
  | 'price'
  | 'horsepower'
  | 'engineSize'
  | 'mileage';
