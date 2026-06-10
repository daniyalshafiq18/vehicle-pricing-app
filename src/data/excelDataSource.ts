import * as XLSX from 'xlsx';
import type {
  IDataSource,
  Vehicle,
  VehiclePricing,
  VehicleHierarchy,
  VehicleFilters,
  VehicleSortOption,
  ValuationResult,
  ComparableVehicle,
  MarketInsight,
  AnalyticsData,
  AnalyticsOverview,
  VehicleCountByMake,
  VehicleCountByModel,
  PriceDistribution,
  PriceByYear,
  PriceByCategory,
  TransmissionAnalysis,
  DriveTypeAnalysis,
  PowertrainAnalysis,
  BodyTypeAnalysis,
  DashboardAnalytics,
  DashboardFilters,
  ScatterDataPoint,
  BoxPlotData,
  AgeDistribution,
  TopVehicle,
  Inquiry,
} from '@types';
import { memoize } from '@utils';

interface RawVehicleRow {
  Year?: number;
  Make?: string;
  Model?: string;
  Spec?: string;
  'Engine Size'?: number;
  Horsepower?: number;
  Cylinders?: number;
  Doors?: number;
  Seats?: number;
  Transmission?: string;
  'Body Type'?: string;
  'Drive Type'?: string;
  'Vehicle Type'?: string;
  Category?: string;
  'Powertrain Type'?: string;
  'Min Price'?: number;
  'Avg Price'?: number;
  'Max Price'?: number;
  Description?: string;
}

const BODY_TYPES = ['SUV', 'Sedan', 'Coupe', 'Convertible', 'Hatchback', 'Wagon', 'Pickup', 'Van', 'Crossover', 'Supercar', 'Coupe/Cabriolet', 'Suv', 'Estate', 'Sportback', 'Suv Coupe', 'Suv- Crossover', 'Pick Up Double Cab', 'Mpv', 'Pick Up', 'Targa', 'Crew Cab', 'Suv- Compact', 'Minivan', 'Cargo Van', 'Soft Top', 'Hard Top', 'Station', 'Minibus', 'Limousine'] as const;
const DRIVE_TYPES = ['AWD', '4WD', 'FWD', 'RWD', 'Unknown'] as const;
const TRANSMISSIONS = ['Automatic', 'Manual', 'CVT', 'DCT', 'Semi-Automatic', 'Dual Clutch', 'Direct Drive', 'Selespeed', 'Multimode', 'Touchtronic', 'S-Tronic', 'Multitronic', 'R-Tronic', 'Cvt', 'Pdk', 'E-Cvt', 'Powershift', 'Sequential', 'Geartronic', 'Active Select', 'E-Gear', 'Quickshift', 'Sport Mode'] as const;
const VEHICLE_TYPES = ['Car', 'Light Commercial Vehicle', 'Heavy Commercial Vehicle'] as const;
const CATEGORIES = ['OTHER/STANDARD', 'NON-GCC', 'GCC'] as const;
const POWERTRAINS = ['Petrol/Diesel', 'Hybrid', 'Electric'] as const;

function normalizeValue<T extends readonly string[]>(value: unknown, validValues: T): string {
  if (!value || typeof value !== 'string') return '';
  const normalized = value.trim();
  const match = validValues.find((v) => v.toLowerCase() === normalized.toLowerCase());
  return (match as string) ?? normalized;
}

export class ExcelDataSource implements IDataSource {
  private initialized = false;
  private vehicles: Vehicle[] = [];
  private pricing: Map<string, VehiclePricing> = new Map();
  private hierarchy!: VehicleHierarchy;
  private inquiries: Inquiry[] = [];
  private filePath: string;
  /** Actual prices from the Excel Price column, keyed by vehicle ID */
  private rawPrices: Map<string, number> = new Map();
  /** Min price from the Excel Min Price column, keyed by vehicle ID */
  private rawMinPrices: Map<string, number> = new Map();
  /** Max price from the Excel Max Price column, keyed by vehicle ID */
  private rawMaxPrices: Map<string, number> = new Map();

  private memoizedGetHierarchy = memoize(() => this.buildHierarchy());
  private memoizedGetAnalytics = memoize(() => this.computeAnalytics());
  /** Cache for unfiltered dashboard analytics — computed once, reused on every no-filter dashboard visit */
  private dashboardCache: DashboardAnalytics | null = null;

  constructor(filePath?: string) {
    this.filePath = filePath ?? 'UAE_Vehicle_Data.xlsx';
  }

  async initialize(): Promise<void> {
    const response = await fetch(`/${this.filePath}`);
    const arrayBuffer = await response.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) throw new Error('No sheet found in Excel file');

    const sheet = workbook.Sheets[sheetName];
    if (!sheet) throw new Error(`Sheet "${sheetName}" not found`);
    const rawData = XLSX.utils.sheet_to_json<RawVehicleRow>(sheet);

    this.vehicles = rawData.map((row, index) => this.parseVehicle(row, index)).filter((v): v is Vehicle => v !== null);
    this.rawPrices = new Map();
    this.rawMinPrices = new Map();
    this.rawMaxPrices = new Map();
    this.buildRawPriceMaps(rawData);
    this.pricing = this.buildPricingIndex();
    this.hierarchy = this.buildHierarchy();
    this.initialized = true;
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  // ─── Inquiries ────────────────────────────────────

  async getVehicles(
    filters?: VehicleFilters,
    sort?: VehicleSortOption,
    page = 1,
    pageSize = 20,
  ): Promise<{ vehicles: Vehicle[]; total: number }> {
    let filtered = [...this.vehicles];

    if (filters) {
      filtered = this.applyFilters(filtered, filters);
    }

    if (sort) {
      filtered.sort((a, b) => this.sortVehicles(a, b, sort));
    }

    const total = filtered.length;
    const start = (page - 1) * pageSize;
    const vehicles = filtered.slice(start, start + pageSize);

    return { vehicles, total };
  }

  async getVehicleById(id: string): Promise<Vehicle | null> {
    return this.vehicles.find((v) => v.id === id) ?? null;
  }

  async getVehicleHierarchy(): Promise<VehicleHierarchy> {
    return this.memoizedGetHierarchy();
  }

  async getVehicleSpecs(year: number, make: string, model: string): Promise<Vehicle[]> {
    return this.vehicles.filter(
      (v) => v.year === year && v.make.toLowerCase() === make.toLowerCase() && v.model.toLowerCase() === model.toLowerCase(),
    );
  }

  async searchVehicles(query: string, limit = 20): Promise<Vehicle[]> {
    const lower = query.toLowerCase();
    return this.vehicles
      .filter(
        (v) =>
          v.make.toLowerCase().includes(lower) ||
          v.model.toLowerCase().includes(lower) ||
          v.spec.toLowerCase().includes(lower) ||
          `${v.year} ${v.make} ${v.model}`.toLowerCase().includes(lower),
      )
      .slice(0, limit);
  }

  // ─── Pricing ──────────────────────────────────────────

  async getPricing(vehicleId: string): Promise<VehiclePricing | null> {
    return this.pricing.get(vehicleId) ?? null;
  }

  async getPricingByCriteria(year: number, make: string, model: string, spec: string): Promise<VehiclePricing | null> {
    const vehicle = this.vehicles.find(
      (v) =>
        v.year === year &&
        v.make.toLowerCase() === make.toLowerCase() &&
        v.model.toLowerCase() === model.toLowerCase() &&
        v.spec.toLowerCase() === spec.toLowerCase(),
    );
    if (!vehicle) return null;
    return this.pricing.get(vehicle.id) ?? null;
  }

  async getComparableVehicles(vehicleId: string, limit = 5): Promise<ComparableVehicle[]> {
    const vehicle = this.vehicles.find((v) => v.id === vehicleId);
    if (!vehicle) return [];

    const candidates = this.vehicles.filter(
      (v) =>
        v.id !== vehicleId &&
        v.make === vehicle.make &&
        Math.abs(v.year - vehicle.year) <= 3,
    );

    const scored = candidates
      .map((candidate) => {
        const pricing = this.pricing.get(candidate.id);
        const score = this.computeSimilarity(vehicle, candidate);
        const diff = pricing ? pricing.averagePrice - (this.pricing.get(vehicleId)?.averagePrice ?? 0) : 0;
        const diffPct = this.pricing.get(vehicleId)?.averagePrice
          ? (diff / (this.pricing.get(vehicleId)?.averagePrice ?? 1)) * 100
          : 0;

        return {
          vehicle: candidate,
          pricing: pricing ?? this.createDefaultPricing(candidate),
          similarityScore: score,
          priceDifference: diff,
          priceDifferencePercentage: diffPct,
        };
      })
      .sort((a, b) => b.similarityScore - a.similarityScore)
      .slice(0, limit);

    return scored;
  }

  async getValuation(year: number, make: string, model: string, spec: string, bodyType?: string): Promise<ValuationResult | null> {
    // Find the primary vehicle for the exact selection
    const vehicle = this.vehicles.find(
      (v) =>
        v.year === year &&
        v.make.toLowerCase() === make.toLowerCase() &&
        v.model.toLowerCase() === model.toLowerCase() &&
        v.spec.toLowerCase() === spec.toLowerCase() &&
        (!bodyType || v.bodyType.toLowerCase() === bodyType.toLowerCase()),
    );
    if (!vehicle) return null;

    const basePricing = this.pricing.get(vehicle.id);

    // Collect Min Price and Max Price from the database for the exact vehicle selection
    const matchingVehicles = this.vehicles.filter(
      (v) =>
        v.year === year &&
        v.make.toLowerCase() === make.toLowerCase() &&
        v.model.toLowerCase() === model.toLowerCase() &&
        v.spec.toLowerCase() === spec.toLowerCase() &&
        (!bodyType || v.bodyType.toLowerCase() === bodyType.toLowerCase()),
    );

    const minPrices = matchingVehicles
      .map((v) => this.rawMinPrices.get(v.id))
      .filter((p): p is number => p !== undefined && p > 0);
    const maxPrices = matchingVehicles
      .map((v) => this.rawMaxPrices.get(v.id))
      .filter((p): p is number => p !== undefined && p > 0);

    const minPrice = minPrices.length > 0 ? Math.min(...minPrices) : 0;
    const maxPrice = maxPrices.length > 0 ? Math.max(...maxPrices) : 0;

    let pricing = basePricing ?? this.createDefaultPricing(vehicle);

    // Use the actual stored Min Price and Max Price from the database
    pricing = {
      ...pricing,
      minimumPrice: minPrice,
      maximumPrice: maxPrice,
    };

    const comparables = await this.getComparableVehicles(vehicle.id);
    const marketInsights = this.generateMarketInsights(vehicle, pricing);

    return {
      vehicle,
      pricing,
      comparables,
      marketInsights,
      confidenceIndicator: this.computeConfidence(pricing),
    };
  }

  async getPriceRange(
    filters?: VehicleFilters,
  ): Promise<{ min: number; max: number; average: number }> {
    let filtered = filters ? this.applyFilters(this.vehicles, filters) : this.vehicles;
    const prices = filtered
      .map((v) => this.pricing.get(v.id)?.averagePrice ?? 0)
      .filter((p) => p > 0);

    if (prices.length === 0) return { min: 0, max: 0, average: 0 };

    return {
      min: Math.min(...prices),
      max: Math.max(...prices),
      average: prices.reduce((a, b) => a + b, 0) / prices.length,
    };
  }

  // ─── Lookups ──────────────────────────────────────────

  async getYears(): Promise<number[]> {
    return this.hierarchy.years;
  }

  async getMakes(year: number): Promise<string[]> {
    return this.hierarchy.makes[year] ?? [];
  }

  async getModels(year: number, make: string): Promise<string[]> {
    const key = `${year}-${make.toLowerCase()}`;
    return this.hierarchy.models[key] ?? [];
  }

  async getSpecs(year: number, make: string, model: string): Promise<string[]> {
    const key = `${year}-${make.toLowerCase()}-${model.toLowerCase()}`;
    return this.hierarchy.specs[key] ?? [];
  }

  // ─── Analytics ───────────────────────────────────────

  async getAnalytics(): Promise<AnalyticsData> {
    return this.memoizedGetAnalytics();
  }

  async getAllVehiclesWithPricing(filters?: VehicleFilters): Promise<{ vehicle: Vehicle; pricing: VehiclePricing }[]> {
    let filtered = filters ? this.applyFilters(this.vehicles, filters) : this.vehicles;
    return filtered
      .map((vehicle) => {
        const pricing = this.pricing.get(vehicle.id) ?? this.createDefaultPricing(vehicle);
        return { vehicle, pricing };
      })
      .filter((vp) => vp.pricing.averagePrice > 0);
  }

  async getDashboardAnalytics(filters?: DashboardFilters): Promise<DashboardAnalytics> {
    // Return cached unfiltered result if available (avoids recomputing 33k rows)
    if (!filters && this.dashboardCache) {
      return this.dashboardCache;
    }

    const vehicles = filters ? this.applyFilters(this.vehicles, filters as VehicleFilters) : this.vehicles;
    const totalUnfiltered = this.vehicles.length;

    // ── Single-pass data collection ──
    const makes = new Map<string, { count: number; totalPrice: number }>();
    const models = new Map<string, { make: string; count: number; totalPrice: number }>();
    const powertrains = new Map<string, { count: number; totalPrice: number }>();
    const bodyTypes = new Map<string, { count: number; totalPrice: number }>();
    const yearsCount = new Map<number, number>();
    const yearsPrices = new Map<number, number[]>();
    const categoryPrices = new Map<string, number[]>();
    const prices: number[] = [];
    const scatterPoints: ScatterDataPoint[] = [];
    const leaderboardCandidates: { vehicle: Vehicle; pricing: VehiclePricing }[] = [];

    let minPrice = Infinity;
    let maxPrice = -Infinity;

    for (const vehicle of vehicles) {
      const pricing = this.pricing.get(vehicle.id) ?? this.createDefaultPricing(vehicle);
      if (pricing.averagePrice <= 0) continue;

      const price = pricing.averagePrice;

      // Overview / Price Distribution
      prices.push(price);
      if (price < minPrice) minPrice = price;
      if (price > maxPrice) maxPrice = price;

      // Makes
      let m = makes.get(vehicle.make);
      if (!m) { m = { count: 0, totalPrice: 0 }; makes.set(vehicle.make, m); }
      m.count++;
      m.totalPrice += price;

      // Models
      const modelKey = `${vehicle.make} ${vehicle.model}`;
      let md = models.get(modelKey);
      if (!md) { md = { make: vehicle.make, count: 0, totalPrice: 0 }; models.set(modelKey, md); }
      md.count++;
      md.totalPrice += price;

      // Powertrain
      const ptKey = vehicle.powertrain || 'Unknown';
      let pt = powertrains.get(ptKey);
      if (!pt) { pt = { count: 0, totalPrice: 0 }; powertrains.set(ptKey, pt); }
      pt.count++;
      pt.totalPrice += price;

      // Body Type
      const btKey = vehicle.bodyType || 'Unknown';
      let bt = bodyTypes.get(btKey);
      if (!bt) { bt = { count: 0, totalPrice: 0 }; bodyTypes.set(btKey, bt); }
      bt.count++;
      bt.totalPrice += price;

      // Year (Age Distribution)
      yearsCount.set(vehicle.year, (yearsCount.get(vehicle.year) ?? 0) + 1);

      // Year (Value Trend)
      let yp = yearsPrices.get(vehicle.year);
      if (!yp) { yp = []; yearsPrices.set(vehicle.year, yp); }
      yp.push(price);

      // Category (Box Plot)
      const catKey = vehicle.category || 'Unknown';
      let cp = categoryPrices.get(catKey);
      if (!cp) { cp = []; categoryPrices.set(catKey, cp); }
      cp.push(price);

      // Scatter Data — representative sample, every Nth vehicle
      if (vehicle.horsepower > 0) {
        // Collect up to 750 initially, then down-sample to ~500
        if (scatterPoints.length < 750) {
          scatterPoints.push({
            horsepower: vehicle.horsepower,
            averagePrice: price,
            make: vehicle.make,
            model: vehicle.model,
            spec: vehicle.spec,
            vehicleId: vehicle.id,
            year: vehicle.year,
          });
        }
      }

      // Leaderboard candidates
      leaderboardCandidates.push({ vehicle, pricing });
    }

    const total = prices.length;

    // ── Overview ──
    const overview: AnalyticsOverview = {
      totalVehicles: vehicles.length,
      totalMakes: makes.size,
      totalModels: models.size,
      averageMarketPrice: total > 0 ? Math.round(prices.reduce((a, b) => a + b, 0) / total) : 0,
      highestVehicleValue: total > 0 ? maxPrice : 0,
      lowestVehicleValue: total > 0 ? minPrice : 0,
      priceRangeSpread: total > 0 ? maxPrice - minPrice : 0,
      lastUpdated: new Date(),
    };

    // ── Top Makes ──
    const topMakes: VehicleCountByMake[] = [...makes.entries()]
      .map(([make, d]) => ({
        make,
        count: d.count,
        averagePrice: Math.round(d.totalPrice / d.count),
        percentage: Number(((d.count / total) * 100).toFixed(1)),
      }))
      .sort((a, b) => b.count - a.count);

    // ── Price Distribution (O(n) bucketing, no filter()-in-loop) ──
    const priceDistribution: PriceDistribution[] = (() => {
      if (total === 0) return [];
      const range = maxPrice - minPrice;
      const bucketSize = range / 10 || 1;
      const buckets = new Array(10).fill(0);

      for (const p of prices) {
        const idx = Math.min(9, Math.floor((p - minPrice) / bucketSize));
        buckets[idx]++;
      }

      return buckets.map((count, i) => ({
        range: `${Math.round(minPrice + i * bucketSize).toLocaleString()} - ${Math.round(minPrice + (i + 1) * bucketSize).toLocaleString()}`,
        min: Math.round(minPrice + i * bucketSize),
        max: Math.round(minPrice + (i + 1) * bucketSize),
        count,
        percentage: Number(((count / total) * 100).toFixed(1)),
      }));
    })();

    // ── Value Trend ──
    const valueTrend: PriceByYear[] = [...yearsPrices.entries()]
      .map(([year, yrPrices]) => {
        yrPrices.sort((a, b) => a - b);
        const sum = yrPrices.reduce((a, b) => a + b, 0);
        return {
          year,
          averagePrice: Math.round(sum / yrPrices.length),
          medianPrice: yrPrices[Math.floor(yrPrices.length / 2)] ?? 0,
          minimumPrice: yrPrices[0] ?? 0,
          maximumPrice: yrPrices[yrPrices.length - 1] ?? 0,
          count: yrPrices.length,
        };
      })
      .sort((a, b) => a.year - b.year);

    // ── Powertrain Composition ──
    const powertrainComposition: PowertrainAnalysis[] = [...powertrains.entries()]
      .map(([powertrain, d]) => ({
        powertrain: powertrain as Vehicle['powertrain'],
        count: d.count,
        averagePrice: Math.round(d.totalPrice / d.count),
        percentage: Number(((d.count / total) * 100).toFixed(1)),
      }))
      .sort((a, b) => b.count - a.count);

    // ── Body Type Distribution ──
    const bodyTypeDistribution: BodyTypeAnalysis[] = [...bodyTypes.entries()]
      .map(([bodyType, d]) => ({
        bodyType: bodyType as Vehicle['bodyType'],
        count: d.count,
        averagePrice: Math.round(d.totalPrice / d.count),
        percentage: Number(((d.count / total) * 100).toFixed(1)),
      }))
      .sort((a, b) => b.count - a.count);

    // ── Age Distribution ──
    const ageDistribution: AgeDistribution[] = [...yearsCount.entries()]
      .map(([year, count]) => ({
        year,
        count,
        percentage: Number(((count / total) * 100).toFixed(1)),
      }))
      .sort((a, b) => a.year - b.year);

    // ── Box Plot ──
    const boxPlot: BoxPlotData[] = [...categoryPrices.entries()]
      .map(([category, catP]) => {
        if (catP.length < 5) return null;
        catP.sort((a, b) => a - b);
        const n = catP.length;
        const idx = (p: number) => Math.max(0, Math.min(n - 1, Math.round((p / 100) * (n - 1))));
        return {
          category,
          min: catP[0] ?? 0,
          q1: catP[idx(25)] ?? 0,
          median: catP[idx(50)] ?? 0,
          q3: catP[idx(75)] ?? 0,
          max: catP[n - 1] ?? 0,
          count: n,
          outliers: [] as { vehicleId: string; price: number }[],
        };
      })
      .filter((v): v is BoxPlotData => v !== null)
      .sort((a, b) => b.count - a.count);

    // ── Top Models ──
    const topModels: VehicleCountByModel[] = [...models.entries()]
      .map(([model, d]) => ({
        model,
        make: d.make,
        count: d.count,
        averagePrice: Math.round(d.totalPrice / d.count),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // ── Premium Leaderboard ──
    leaderboardCandidates.sort((a, b) => b.pricing.averagePrice - a.pricing.averagePrice);
    const premiumLeaderboard: TopVehicle[] = leaderboardCandidates
      .slice(0, 100)
      .map(({ vehicle, pricing }, i) => ({
        rank: i + 1,
        year: vehicle.year,
        make: vehicle.make,
        model: vehicle.model,
        spec: vehicle.spec,
        minPrice: pricing.minimumPrice,
        averagePrice: pricing.averagePrice,
        maxPrice: pricing.maximumPrice,
        vehicleId: vehicle.id,
      }));

    // Down-sample scatter for chart performance (max 500 representative points)
    const step = Math.max(1, Math.ceil(scatterPoints.length / 500));
    const finalScatter = step > 1
      ? scatterPoints.filter((_, i) => i % step === 0)
      : scatterPoints;

    const result: DashboardAnalytics = {
      overview,
      topMakes,
      priceDistribution,
      valueTrend,
      powertrainComposition,
      scatterData: finalScatter,
      bodyTypeDistribution,
      ageDistribution,
      boxPlot,
      topModels,
      premiumLeaderboard,
      totalFiltered: total,
      totalUnfiltered,
    };

    // Cache unfiltered result for instant revisit (most common dashboard view)
    if (!filters) {
      this.dashboardCache = result;
    }

    return result;
  }

  // ─── Inquiries ────────────────────────────────────────

  async saveInquiry(inquiry: Inquiry): Promise<void> {
    this.inquiries.push(inquiry);
  }

  async getInquiries(): Promise<Inquiry[]> {
    return [...this.inquiries];
  }

  async getInquiryById(id: string): Promise<Inquiry | null> {
    return this.inquiries.find((i) => i.id === id) ?? null;
  }

  async updateInquiryStatus(id: string, status: Inquiry['status']): Promise<void> {
    const inquiry = this.inquiries.find((i) => i.id === id);
    if (inquiry) {
      inquiry.status = status;
    }
  }

  // ─── Private Parsing ──────────────────────────────────

  private parseVehicle(row: RawVehicleRow, index: number): Vehicle | null {
    if (!row.Year && !row.Make && !row.Model) return null;
    return {
      id: `veh-${index + 1}`,
      year: Number(row.Year) || 0,
      make: String(row.Make ?? '').trim(),
      model: String(row.Model ?? '').trim(),
      spec: String(row.Spec ?? '').trim(),
      trim: String(row.Spec ?? '').trim(),
      engineSize: Number(row['Engine Size']) || 0,
      horsepower: Number(row.Horsepower) || 0,
      cylinders: Number(row.Cylinders) || 0,
      doors: Number(row.Doors) || 0,
      seats: Number(row.Seats) || 0,
      transmission: normalizeValue(row.Transmission, TRANSMISSIONS) as Vehicle['transmission'],
      bodyType: normalizeValue(row['Body Type'], BODY_TYPES) as Vehicle['bodyType'],
      driveType: normalizeValue(row['Drive Type'], DRIVE_TYPES) as Vehicle['driveType'],
      vehicleType: normalizeValue(row['Vehicle Type'], VEHICLE_TYPES) as Vehicle['vehicleType'],
      category: normalizeValue(row.Category, CATEGORIES) as Vehicle['category'],
      powertrain: normalizeValue(row['Powertrain Type'], POWERTRAINS) as Vehicle['powertrain'],
      description: String(row.Description ?? ''),
    };
  }

  private buildRawPriceMaps(rawData: RawVehicleRow[]): void {
    for (let i = 0; i < rawData.length; i++) {
      const row = rawData[i];
      const key = `veh-${i + 1}`;
      if (row?.['Avg Price'] && row['Avg Price'] > 0) {
        this.rawPrices.set(key, row['Avg Price']);
      }
      if (row?.['Min Price'] && row['Min Price'] > 0) {
        this.rawMinPrices.set(key, row['Min Price']);
      }
      if (row?.['Max Price'] && row['Max Price'] > 0) {
        this.rawMaxPrices.set(key, row['Max Price']);
      }
    }
  }

  private buildPricingIndex(): Map<string, VehiclePricing> {
    // First, collect all prices by make/vehicle for range computation
    const pricesBySegment = new Map<string, number[]>();
    const singlePrices = new Map<string, number>();

    for (const vehicle of this.vehicles) {
      const price = this.rawPrices.get(vehicle.id);
      if (!price || price <= 0) continue;
      singlePrices.set(vehicle.id, price);
      const segment = vehicle.make.toLowerCase();
      const segmentPrices = pricesBySegment.get(segment) ?? [];
      segmentPrices.push(price);
      pricesBySegment.set(segment, segmentPrices);
    }

    const map = new Map<string, VehiclePricing>();
    for (const vehicle of this.vehicles) {
      const price = singlePrices.get(vehicle.id);
      if (!price || price <= 0) continue;

      const segmentPrices = pricesBySegment.get(vehicle.make.toLowerCase()) ?? [price];
      const sorted = [...segmentPrices].sort((a, b) => a - b);
      const len = sorted.length;

      const percentile = (p: number) => {
        if (len === 0) return price;
        const idx = Math.min(len - 1, Math.max(0, Math.round((p / 100) * (len - 1))));
        return sorted[idx] ?? price;
      };

      const minP = sorted[0] ?? price;
      const maxP = sorted[len - 1] ?? price;

      map.set(vehicle.id, {
        vehicleId: vehicle.id,
        averagePrice: price,
        minimumPrice: minP,
        maximumPrice: maxP,
        medianPrice: percentile(50),
        standardDeviation: Math.round((maxP - minP) * 0.2),
        sampleSize: len,
        priceRange: {
          min: minP,
          max: maxP,
          average: price,
          median: percentile(50),
          p10: percentile(10),
          p25: percentile(25),
          p75: percentile(75),
          p90: percentile(90),
        },
        confidenceScore: Math.min(95, 60 + len),
        marketTrend: { direction: 'stable', percentage: 0, periodMonths: 3, volatility: 'low' },
        lastUpdated: new Date(),
      });
    }
    return map;
  }

  private buildHierarchy(): VehicleHierarchy {
    const years = new Set<number>();
    const makes: Record<number, string[]> = {};
    const models: Record<string, string[]> = {};
    const specs: Record<string, string[]> = {};
    const bodyTypes: Record<string, string[]> = {};
    const transmissions: Record<string, string[]> = {};
    const driveTypes: Record<string, string[]> = {};
    const categories: Record<string, string[]> = {};
    const powertrains: Record<string, string[]> = {};
    const vehicleTypes: Record<string, string[]> = {};

    for (const v of this.vehicles) {
      years.add(v.year);
      if (!makes[v.year]) makes[v.year] = [];
      if (!makes[v.year]!.includes(v.make)) makes[v.year]!.push(v.make);

      const modelKey = `${v.year}-${v.make.toLowerCase()}`;
      if (!models[modelKey]) models[modelKey] = [];
      if (!models[modelKey]!.includes(v.model)) models[modelKey]!.push(v.model);

      const specKey = `${v.year}-${v.make.toLowerCase()}-${v.model.toLowerCase()}`;
      if (!specs[specKey]) specs[specKey] = [];
      if (!specs[specKey]!.includes(v.spec)) specs[specKey]!.push(v.spec);

      if (v.bodyType) {
        const btKey = `${v.year}-${v.make.toLowerCase()}-${v.model.toLowerCase()}-${v.spec.toLowerCase()}`;
        if (!bodyTypes[btKey]) bodyTypes[btKey] = [];
        if (!bodyTypes[btKey]!.includes(v.bodyType)) bodyTypes[btKey]!.push(v.bodyType);
      }

      const propKey = `${v.year}-${v.make.toLowerCase()}-${v.model.toLowerCase()}`;
      if (v.transmission) {
        if (!transmissions[propKey]) transmissions[propKey] = [];
        if (!transmissions[propKey]!.includes(v.transmission)) transmissions[propKey]!.push(v.transmission);
      }
      if (v.driveType) {
        if (!driveTypes[propKey]) driveTypes[propKey] = [];
        if (!driveTypes[propKey]!.includes(v.driveType)) driveTypes[propKey]!.push(v.driveType);
      }
      if (v.category) {
        if (!categories[propKey]) categories[propKey] = [];
        if (!categories[propKey]!.includes(v.category)) categories[propKey]!.push(v.category);
      }
      if (v.powertrain) {
        if (!powertrains[propKey]) powertrains[propKey] = [];
        if (!powertrains[propKey]!.includes(v.powertrain)) powertrains[propKey]!.push(v.powertrain);
      }
      if (v.vehicleType) {
        if (!vehicleTypes[propKey]) vehicleTypes[propKey] = [];
        if (!vehicleTypes[propKey]!.includes(v.vehicleType)) vehicleTypes[propKey]!.push(v.vehicleType);
      }
    }

    const sortedYears = [...years].sort((a, b) => b - a);
    for (const y of sortedYears) {
      makes[y]?.sort();
    }
    Object.values(models).forEach((arr) => arr.sort());
    Object.values(specs).forEach((arr) => arr.sort());
    Object.values(bodyTypes).forEach((arr) => arr.sort());
    Object.values(transmissions).forEach((arr) => arr.sort());
    Object.values(driveTypes).forEach((arr) => arr.sort());
    Object.values(categories).forEach((arr) => arr.sort());
    Object.values(powertrains).forEach((arr) => arr.sort());
    Object.values(vehicleTypes).forEach((arr) => arr.sort());

    return { years: sortedYears, makes, models, specs, bodyTypes, transmissions, driveTypes, categories, powertrains, vehicleTypes };
  }

  private computeAnalytics(): AnalyticsData {
    const overview = this.computeOverview();
    return {
      overview,
      countByMake: this.computeCountByMake(),
      countByModel: this.computeCountByModel(),
      priceDistribution: this.computePriceDistribution(),
      priceByYear: this.computePriceByYear(),
      priceByCategory: this.computePriceByCategory(),
      transmissionAnalysis: this.computeTransmissionAnalysis(),
      driveTypeAnalysis: this.computeDriveTypeAnalysis(),
      powertrainAnalysis: this.computePowertrainAnalysis(),
      bodyTypeAnalysis: this.computeBodyTypeAnalysis(),
    };
  }

  private computeOverview(): AnalyticsOverview {
    const prices = this.vehicles.map((v) => this.pricing.get(v.id)?.averagePrice ?? 0);
    const validPrices = prices.filter((p) => p > 0);
    const makes = new Set(this.vehicles.map((v) => v.make));
    const models = new Set(this.vehicles.map((v) => `${v.make}-${v.model}`));

    return {
      totalVehicles: this.vehicles.length,
      totalMakes: makes.size,
      totalModels: models.size,
      averageMarketPrice: validPrices.length > 0 ? Math.round(validPrices.reduce((a, b) => a + b, 0) / validPrices.length) : 0,
      highestVehicleValue: validPrices.length > 0 ? Math.max(...validPrices) : 0,
      lowestVehicleValue: validPrices.length > 0 ? Math.min(...validPrices) : 0,
      priceRangeSpread: validPrices.length > 0 ? Math.max(...validPrices) - Math.min(...validPrices) : 0,
      lastUpdated: new Date(),
    };
  }

  private computeCountByMake(): VehicleCountByMake[] {
    const map = new Map<string, { count: number; totalPrice: number }>();
    for (const v of this.vehicles) {
      const entry = map.get(v.make) ?? { count: 0, totalPrice: 0 };
      entry.count++;
      entry.totalPrice += this.pricing.get(v.id)?.averagePrice ?? 0;
      map.set(v.make, entry);
    }

    const total = this.vehicles.length;
    return [...map.entries()]
      .map(([make, data]) => ({
        make,
        count: data.count,
        averagePrice: Math.round(data.totalPrice / data.count),
        percentage: Number(((data.count / total) * 100).toFixed(1)),
      }))
      .sort((a, b) => b.count - a.count);
  }

  private computeCountByModel(): VehicleCountByModel[] {
    const map = new Map<string, { make: string; count: number; totalPrice: number }>();
    for (const v of this.vehicles) {
      const key = `${v.make}-${v.model}`;
      const entry = map.get(key) ?? { make: v.make, count: 0, totalPrice: 0 };
      entry.count++;
      entry.totalPrice += this.pricing.get(v.id)?.averagePrice ?? 0;
      map.set(key, entry);
    }

    return [...map.entries()]
      .map(([model, data]) => ({
        make: data.make,
        model: model.split('-')[1] ?? model,
        count: data.count,
        averagePrice: Math.round(data.totalPrice / data.count),
      }))
      .sort((a, b) => b.count - a.count);
  }

  private computePriceDistribution(): PriceDistribution[] {
    const prices = this.vehicles
      .map((v) => this.pricing.get(v.id)?.averagePrice ?? 0)
      .filter((p) => p > 0)
      .sort((a, b) => a - b);

    if (prices.length === 0) return [];

    const min = prices[0] ?? 0;
    const max = prices[prices.length - 1] ?? 1;
    const range = max - min;
    const bucketSize = range / 10 || 1;
    const total = prices.length;

    const buckets: PriceDistribution[] = [];
    for (let i = 0; i < 10; i++) {
      const bucketMin = min + i * bucketSize;
      const bucketMax = bucketMin + bucketSize;
      const count = prices.filter((p) => p >= bucketMin && (i === 9 ? p <= bucketMax : p < bucketMax)).length;
      buckets.push({
        range: `${Math.round(bucketMin).toLocaleString()} - ${Math.round(bucketMax).toLocaleString()}`,
        min: Math.round(bucketMin),
        max: Math.round(bucketMax),
        count,
        percentage: Number(((count / total) * 100).toFixed(1)),
      });
    }

    return buckets;
  }

  private computePriceByYear(): PriceByYear[] {
    const map = new Map<number, { prices: number[]; vehicles: Vehicle[] }>();
    for (const v of this.vehicles) {
      const entry = map.get(v.year) ?? { prices: [], vehicles: [] };
      const price = this.pricing.get(v.id)?.averagePrice ?? 0;
      if (price > 0) entry.prices.push(price);
      entry.vehicles.push(v);
      map.set(v.year, entry);
    }

    return [...map.entries()]
      .map(([year, data]) => {
        const sorted = [...data.prices].sort((a, b) => a - b);
        return {
          year,
          averagePrice: Math.round(data.prices.reduce((a, b) => a + b, 0) / data.prices.length),
          medianPrice: sorted.length > 0 ? sorted[Math.floor(sorted.length / 2)] ?? 0 : 0,
          minimumPrice: sorted.length > 0 ? sorted[0] ?? 0 : 0,
          maximumPrice: sorted.length > 0 ? sorted[sorted.length - 1] ?? 0 : 0,
          count: data.vehicles.length,
        };
      })
      .sort((a, b) => a.year - b.year);
  }

  private computePriceByCategory(): PriceByCategory[] {
    const map = new Map<string, { prices: number[]; count: number }>();
    for (const v of this.vehicles) {
      const entry = map.get(v.category) ?? { prices: [], count: 0 };
      const price = this.pricing.get(v.id)?.averagePrice ?? 0;
      if (price > 0) entry.prices.push(price);
      entry.count++;
      map.set(v.category, entry);
    }

    return [...map.entries()]
      .map(([category, data]) => ({
        category: category as Vehicle['category'],
        averagePrice: data.prices.length > 0 ? Math.round(data.prices.reduce((a, b) => a + b, 0) / data.prices.length) : 0,
        medianPrice: data.prices.length > 0
          ? (() => { const s = [...data.prices].sort((a, b) => a - b); return s[Math.floor(s.length / 2)] ?? 0; })()
          : 0,
        count: data.count,
      }))
      .sort((a, b) => b.averagePrice - a.averagePrice);
  }

  private computeTransmissionAnalysis(): TransmissionAnalysis[] {
    const map = new Map<string, { count: number; totalPrice: number }>();
    for (const v of this.vehicles) {
      const entry = map.get(v.transmission) ?? { count: 0, totalPrice: 0 };
      entry.count++;
      entry.totalPrice += this.pricing.get(v.id)?.averagePrice ?? 0;
      map.set(v.transmission, entry);
    }

    const total = this.vehicles.length;
    return [...map.entries()]
      .map(([transmission, data]) => ({
        transmission: transmission as Vehicle['transmission'],
        count: data.count,
        averagePrice: Math.round(data.totalPrice / data.count),
        percentage: Number(((data.count / total) * 100).toFixed(1)),
      }))
      .sort((a, b) => b.count - a.count);
  }

  private computeDriveTypeAnalysis(): DriveTypeAnalysis[] {
    const map = new Map<string, { count: number; totalPrice: number }>();
    for (const v of this.vehicles) {
      const entry = map.get(v.driveType) ?? { count: 0, totalPrice: 0 };
      entry.count++;
      entry.totalPrice += this.pricing.get(v.id)?.averagePrice ?? 0;
      map.set(v.driveType, entry);
    }

    const total = this.vehicles.length;
    return [...map.entries()]
      .map(([driveType, data]) => ({
        driveType: driveType as Vehicle['driveType'],
        count: data.count,
        averagePrice: Math.round(data.totalPrice / data.count),
        percentage: Number(((data.count / total) * 100).toFixed(1)),
      }))
      .sort((a, b) => b.count - a.count);
  }

  private computePowertrainAnalysis(): PowertrainAnalysis[] {
    const map = new Map<string, { count: number; totalPrice: number }>();
    for (const v of this.vehicles) {
      const entry = map.get(v.powertrain) ?? { count: 0, totalPrice: 0 };
      entry.count++;
      entry.totalPrice += this.pricing.get(v.id)?.averagePrice ?? 0;
      map.set(v.powertrain, entry);
    }

    const total = this.vehicles.length;
    return [...map.entries()]
      .map(([powertrain, data]) => ({
        powertrain: powertrain as Vehicle['powertrain'],
        count: data.count,
        averagePrice: Math.round(data.totalPrice / data.count),
        percentage: Number(((data.count / total) * 100).toFixed(1)),
      }))
      .sort((a, b) => b.count - a.count);
  }

  private computeBodyTypeAnalysis(): BodyTypeAnalysis[] {
    const map = new Map<string, { count: number; totalPrice: number }>();
    for (const v of this.vehicles) {
      const entry = map.get(v.bodyType) ?? { count: 0, totalPrice: 0 };
      entry.count++;
      entry.totalPrice += this.pricing.get(v.id)?.averagePrice ?? 0;
      map.set(v.bodyType, entry);
    }

    const total = this.vehicles.length;
    return [...map.entries()]
      .map(([bodyType, data]) => ({
        bodyType: bodyType as Vehicle['bodyType'],
        count: data.count,
        averagePrice: Math.round(data.totalPrice / data.count),
        percentage: Number(((data.count / total) * 100).toFixed(1)),
      }))
      .sort((a, b) => b.count - a.count);
  }

  // ─── Filtering / Sorting / Similarity ─────────────────

  private applyFilters(vehicles: Vehicle[], filters: VehicleFilters): Vehicle[] {
    return vehicles.filter((v) => {
      if (filters.year && v.year !== filters.year) return false;
      if (filters.make && v.make.toLowerCase() !== filters.make.toLowerCase()) return false;
      if (filters.model && v.model.toLowerCase() !== filters.model.toLowerCase()) return false;
      if (filters.spec && v.spec.toLowerCase() !== filters.spec.toLowerCase()) return false;
      if (filters.bodyType && v.bodyType !== filters.bodyType) return false;
      if (filters.transmission && v.transmission !== filters.transmission) return false;
      if (filters.driveType && v.driveType !== filters.driveType) return false;
      if (filters.powertrain && v.powertrain !== filters.powertrain) return false;
      if (filters.vehicleType && v.vehicleType !== filters.vehicleType) return false;
      if (filters.category && v.category !== filters.category) return false;
      if (filters.minYear && v.year < filters.minYear) return false;
      if (filters.maxYear && v.year > filters.maxYear) return false;
      if (filters.minPrice) {
        const price = this.pricing.get(v.id)?.averagePrice ?? 0;
        if (price < filters.minPrice) return false;
      }
      if (filters.maxPrice) {
        const price = this.pricing.get(v.id)?.averagePrice ?? 0;
        if (price > filters.maxPrice) return false;
      }
      if (filters.search) {
        const q = filters.search.toLowerCase();
        if (
          !v.make.toLowerCase().includes(q) &&
          !v.model.toLowerCase().includes(q) &&
          !v.spec.toLowerCase().includes(q)
        )
          return false;
      }
      return true;
    });
  }

  private sortVehicles(a: Vehicle, b: Vehicle, sort: VehicleSortOption): number {
    const dir = sort.direction === 'asc' ? 1 : -1;
    const field = sort.field;

    const priceA = this.pricing.get(a.id)?.averagePrice ?? 0;
    const priceB = this.pricing.get(b.id)?.averagePrice ?? 0;

    let cmp = 0;
    switch (field) {
      case 'year': cmp = a.year - b.year; break;
      case 'make': cmp = a.make.localeCompare(b.make); break;
      case 'model': cmp = a.model.localeCompare(b.model); break;
      case 'price': cmp = priceA - priceB; break;
      case 'horsepower': cmp = a.horsepower - b.horsepower; break;
      case 'engineSize': cmp = a.engineSize - b.engineSize; break;
      default: cmp = 0;
    }
    return cmp * dir;
  }

  private computeSimilarity(a: Vehicle, b: Vehicle): number {
    let score = 0;
    if (a.make === b.make) score += 30;
    if (a.model === b.model) score += 20;
    if (Math.abs(a.year - b.year) <= 1) score += 15;
    else if (Math.abs(a.year - b.year) <= 3) score += 8;
    if (a.bodyType === b.bodyType) score += 10;
    if (a.transmission === b.transmission) score += 5;
    if (a.driveType === b.driveType) score += 5;
    if (a.powertrain === b.powertrain) score += 5;
    if (a.category === b.category) score += 10;
    return score;
  }

  private computeConfidence(pricing: VehiclePricing): ValuationResult['confidenceIndicator'] {
    if (pricing.sampleSize >= 50 && pricing.confidenceScore >= 85) return 'very-high';
    if (pricing.sampleSize >= 30 && pricing.confidenceScore >= 70) return 'high';
    if (pricing.sampleSize >= 15 && pricing.confidenceScore >= 50) return 'moderate';
    if (pricing.sampleSize >= 5) return 'low';
    return 'very-low';
  }

  private createDefaultPricing(vehicle: Vehicle): VehiclePricing {
    return {
      vehicleId: vehicle.id,
      averagePrice: 0,
      minimumPrice: 0,
      maximumPrice: 0,
      medianPrice: 0,
      standardDeviation: 0,
      sampleSize: 0,
      priceRange: { min: 0, max: 0, average: 0, median: 0, p10: 0, p25: 0, p75: 0, p90: 0 },
      confidenceScore: 0,
      marketTrend: { direction: 'stable', percentage: 0, periodMonths: 3, volatility: 'low' },
      lastUpdated: new Date(),
    };
  }

  private generateMarketInsights(_vehicle: Vehicle, _pricing: VehiclePricing): MarketInsight[] {
    const insights: MarketInsight[] = [];
    insights.push({
      type: 'regional',
      title: 'UAE Market Overview',
      description: 'The UAE automotive market shows robust demand for pre-owned vehicles with good specification levels.',
      severity: 'neutral',
    });
    return insights;
  }
}
