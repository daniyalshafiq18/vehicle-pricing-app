/**
 * DataverseDataSource — IDataSource implementation backed by the Power Pages Web API.
 *
 * On init it paginates through ALL vehicle records and caches them in memory so that
 * analytics, filtering, sorting, and lookups run from the in-memory cache.
 * Inquiries (create / status update) go directly through the Web API so they persist.
 *
 * @see ../docs/dataverse-schema.md for the Dataverse table schema
 * @see ../docs/MIGRATION.md for the migration playbook
 */

import { safeFetch } from '@lib/safeAjax';
import { fetchAllVehicles } from '@lib/vehicleApi';
import { createContact } from '@lib/contactApi';
import { memoize } from '@utils';
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
  DashboardAnalytics,
  DashboardFilters,
  ScatterDataPoint,
  BoxPlotData,
  TopVehicle,
  Inquiry,
} from '@types';
import {
  API_BASE,
  ENTITIES,
  VEHICLE_FIELDS,
  VEHICLE_SELECT_FIELDS,
  CONTACT_FIELDS,
  CONTACT_SELECT_FIELDS,
  INQUIRY_FIELDS,
  INQUIRY_SELECT_FIELDS,
} from './dataverseConfig';
import {
  bodyTypeLabel,
  categoryLabel,
  transmissionLabel,
  doorsLabel,
  seatsLabel,
  driveTypeLabel,
  powertrainLabel,
  vehicleTypeLabel,
  inquiryStatusLabel,
  inquiryStatusValue,
  cityLabel,
  cityValue,
} from './dataverseOptionSets';

// ─── Helpers ──────────────────────────────────────────────

/** The shape of a single Dataverse Web API response page. */
export interface ODataResponse<T> {
  value: T[];
  '@odata.nextLink'?: string;
  '@odata.count'?: number;
}

/** Raw vehicle record as returned by the Dataverse Web API. */
export interface RawVehicleRecord {
  [VEHICLE_FIELDS.ID]: string;
  [VEHICLE_FIELDS.NAME]?: string;
  [VEHICLE_FIELDS.BUSINESS_ID]?: string;
  [VEHICLE_FIELDS.MAKE]?: string;
  [VEHICLE_FIELDS.MAKE_CODE]?: string;
  [VEHICLE_FIELDS.MODEL]?: string;
  [VEHICLE_FIELDS.MODEL_CODE]?: string;
  [VEHICLE_FIELDS.SPEC]?: string;
  [VEHICLE_FIELDS.YEAR]?: string;
  [VEHICLE_FIELDS.YEAR_CODE]?: string;
  [VEHICLE_FIELDS.DESCRIPTION]?: string;
  [VEHICLE_FIELDS.ENGINE_SIZE]?: number;
  [VEHICLE_FIELDS.HORSEPOWER]?: number;
  [VEHICLE_FIELDS.CYLINDERS]?: number;
  [VEHICLE_FIELDS.MIN_PRICE]?: number;
  [VEHICLE_FIELDS.AVG_PRICE]?: number;
  [VEHICLE_FIELDS.MAX_PRICE]?: number;
  [VEHICLE_FIELDS.PRICE_SPREAD_PCT]?: number;
  [VEHICLE_FIELDS.BODY_TYPE]?: number;
  [VEHICLE_FIELDS.CATEGORY]?: number;
  [VEHICLE_FIELDS.TRANSMISSION]?: number;
  [VEHICLE_FIELDS.DOORS]?: number;
  [VEHICLE_FIELDS.SEATS]?: number;
  [VEHICLE_FIELDS.DRIVE_TYPE]?: number;
  [VEHICLE_FIELDS.POWERTRAIN_TYPE]?: number;
  [VEHICLE_FIELDS.VEHICLE_TYPE]?: number;
  [key: string]: unknown;
}

// ─── Helpers ──────────────────────────────────────────────

function entityUrl(name: string): string {
  return `${API_BASE}/${name}`;
}

function numeric(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

// ─── Class ────────────────────────────────────────────────

export class DataverseDataSource implements IDataSource {
  private initialized = false;
  private vehicles: Vehicle[] = [];
  private pricing: Map<string, VehiclePricing> = new Map();
  private hierarchy!: VehicleHierarchy;
  private inquiries: Inquiry[] = [];
  /** Raw prices extracted from API records, keyed by vehicle ID. */
  private rawPrices = new Map<string, number>();

  private memoizedGetHierarchy = memoize(() => this.buildHierarchy());
  private memoizedGetAnalytics = memoize(() => this.computeAnalytics());
  private dashboardCache: DashboardAnalytics | null = null;

  // ─── Lifecycle ────────────────────────────────────────

  async initialize(): Promise<void> {
    const records = await fetchAllVehicles();

    // Extract average prices from raw API records before parsing
    this.rawPrices.clear();
    for (const r of records) {
      const id = r[VEHICLE_FIELDS.ID] as string | undefined;
      const price = r[VEHICLE_FIELDS.AVG_PRICE] as number | undefined;
      if (id && typeof price === 'number' && price > 0) {
        this.rawPrices.set(id, price);
      }
    }

    this.vehicles = records
      .map((r, i) => this.parseVehicle(r, i))
      .filter((v): v is Vehicle => v !== null);

    this.pricing = this.buildPricingIndex();
    this.hierarchy = this.buildHierarchy();
    this.initialized = true;
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  // ─── Vehicle Parsing ──────────────────────────────────

  private parseVehicle(record: RawVehicleRecord, _index: number): Vehicle | null {
    const make = (record[VEHICLE_FIELDS.MAKE] ?? '').trim();
    if (!make) return null;

    const id = record[VEHICLE_FIELDS.ID];
    if (!id) return null;

    return {
      id,
      year: numeric(record[VEHICLE_FIELDS.YEAR]),
      make,
      model: (record[VEHICLE_FIELDS.MODEL] ?? '').trim(),
      spec: (record[VEHICLE_FIELDS.SPEC] ?? '').trim(),
      trim: (record[VEHICLE_FIELDS.SPEC] ?? '').trim(),
      engineSize: numeric(record[VEHICLE_FIELDS.ENGINE_SIZE]),
      horsepower: numeric(record[VEHICLE_FIELDS.HORSEPOWER]),
      cylinders: numeric(record[VEHICLE_FIELDS.CYLINDERS]),
      doors: numeric(doorsLabel(record[VEHICLE_FIELDS.DOORS], '4')),
      seats: numeric(seatsLabel(record[VEHICLE_FIELDS.SEATS], '5')),
      transmission: transmissionLabel(record[VEHICLE_FIELDS.TRANSMISSION]) as Vehicle['transmission'],
      bodyType: bodyTypeLabel(record[VEHICLE_FIELDS.BODY_TYPE]) as Vehicle['bodyType'],
      driveType: driveTypeLabel(record[VEHICLE_FIELDS.DRIVE_TYPE]) as Vehicle['driveType'],
      vehicleType: vehicleTypeLabel(record[VEHICLE_FIELDS.VEHICLE_TYPE]) as Vehicle['vehicleType'],
      category: categoryLabel(record[VEHICLE_FIELDS.CATEGORY]) as Vehicle['category'],
      powertrain: powertrainLabel(record[VEHICLE_FIELDS.POWERTRAIN_TYPE]) as Vehicle['powertrain'],
      description: (record[VEHICLE_FIELDS.DESCRIPTION] ?? '').trim(),
    };
  }

  // ─── Vehicle queries ──────────────────────────────────

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
    return { vehicles: filtered.slice(start, start + pageSize), total };
  }

  async getVehicleById(id: string): Promise<Vehicle | null> {
    // Check cache first
    const cached = this.vehicles.find((v) => v.id === id);
    if (cached) return cached;

    // Fall back to API single-record fetch
    try {
      const record = await safeFetch<RawVehicleRecord>({
        url: `${entityUrl(ENTITIES.VEHICLE)}(${id})?$select=${VEHICLE_SELECT_FIELDS}`,
      });
      return this.parseVehicle(record, -1);
    } catch {
      return null;
    }
  }

  async getVehicleHierarchy(): Promise<VehicleHierarchy> {
    return this.memoizedGetHierarchy();
  }

  async getVehicleSpecs(year: number, make: string, model: string): Promise<Vehicle[]> {
    return this.vehicles.filter(
      (v) =>
        v.year === year &&
        v.make.toLowerCase() === make.toLowerCase() &&
        v.model.toLowerCase() === model.toLowerCase(),
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

  async getPricingByCriteria(
    year: number,
    make: string,
    model: string,
    spec: string,
  ): Promise<VehiclePricing | null> {
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
      (v) => v.id !== vehicleId && v.make === vehicle.make && Math.abs(v.year - vehicle.year) <= 3,
    );

    const scored = candidates
      .map((candidate) => {
        const pricing = this.pricing.get(candidate.id);
        const score = this.computeSimilarity(vehicle, candidate);
        const diff = pricing
          ? pricing.averagePrice - (this.pricing.get(vehicleId)?.averagePrice ?? 0)
          : 0;
        const myPrice = this.pricing.get(vehicleId)?.averagePrice ?? 1;
        const diffPct = (diff / myPrice) * 100;

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

  async getValuation(
    year: number,
    make: string,
    model: string,
    spec: string,
    bodyType?: string,
  ): Promise<ValuationResult | null> {
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
    const pricing = basePricing ?? this.createDefaultPricing(vehicle);
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
    const filtered = filters ? this.applyFilters(this.vehicles, filters) : this.vehicles;
    const prices = filtered
      .map((v) => this.pricing.get(v.id)?.averagePrice ?? 0)
      .filter((p) => p > 0);

    if (prices.length === 0) return { min: 0, max: 0, average: 0 };

    return {
      min: Math.min(...prices),
      max: Math.max(...prices),
      average: Math.round(prices.reduce((a, b) => a + b, 0) / prices.length),
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
    return this.hierarchy.models[`${year}-${make.toLowerCase()}`] ?? [];
  }

  async getSpecs(year: number, make: string, model: string): Promise<string[]> {
    return this.hierarchy.specs[`${year}-${make.toLowerCase()}-${model.toLowerCase()}`] ?? [];
  }

  // ─── Analytics ────────────────────────────────────────

  async getAnalytics(): Promise<AnalyticsData> {
    return this.memoizedGetAnalytics();
  }

  async getAllVehiclesWithPricing(
    filters?: VehicleFilters,
  ): Promise<{ vehicle: Vehicle; pricing: VehiclePricing }[]> {
    const filtered = filters ? this.applyFilters(this.vehicles, filters) : this.vehicles;
    return filtered
      .map((vehicle) => ({
        vehicle,
        pricing: this.pricing.get(vehicle.id) ?? this.createDefaultPricing(vehicle),
      }))
      .filter((vp) => vp.pricing.averagePrice > 0);
  }

  async getDashboardAnalytics(filters?: DashboardFilters): Promise<DashboardAnalytics> {
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
      prices.push(price);
      if (price < minPrice) minPrice = price;
      if (price > maxPrice) maxPrice = price;

      // Makes
      let m = makes.get(vehicle.make);
      if (!m) {
        m = { count: 0, totalPrice: 0 };
        makes.set(vehicle.make, m);
      }
      m.count++;
      m.totalPrice += price;

      // Models
      const modelKey = `${vehicle.make} ${vehicle.model}`;
      let md = models.get(modelKey);
      if (!md) {
        md = { make: vehicle.make, count: 0, totalPrice: 0 };
        models.set(modelKey, md);
      }
      md.count++;
      md.totalPrice += price;

      // Powertrain
      const ptKey = vehicle.powertrain || 'Unknown';
      let pt = powertrains.get(ptKey);
      if (!pt) {
        pt = { count: 0, totalPrice: 0 };
        powertrains.set(ptKey, pt);
      }
      pt.count++;
      pt.totalPrice += price;

      // Body Type
      const btKey = vehicle.bodyType || 'Unknown';
      let bt = bodyTypes.get(btKey);
      if (!bt) {
        bt = { count: 0, totalPrice: 0 };
        bodyTypes.set(btKey, bt);
      }
      bt.count++;
      bt.totalPrice += price;

      // Year (Age Distribution)
      yearsCount.set(vehicle.year, (yearsCount.get(vehicle.year) ?? 0) + 1);

      // Year (Value Trend)
      let yp = yearsPrices.get(vehicle.year);
      if (!yp) {
        yp = [];
        yearsPrices.set(vehicle.year, yp);
      }
      yp.push(price);

      // Category (Box Plot)
      const catKey = vehicle.category || 'Unknown';
      let cp = categoryPrices.get(catKey);
      if (!cp) {
        cp = [];
        categoryPrices.set(catKey, cp);
      }
      cp.push(price);

      // Scatter Data
      if (vehicle.horsepower > 0 && scatterPoints.length < 750) {
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

      leaderboardCandidates.push({ vehicle, pricing });
    }

    const total = prices.length;

    // ── Overview ──
    const overview = {
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
    const topMakes = [...makes.entries()]
      .map(([make, d]) => ({
        make,
        count: d.count,
        averagePrice: Math.round(d.totalPrice / d.count),
        percentage: Number(((d.count / total) * 100).toFixed(1)),
      }))
      .sort((a, b) => b.count - a.count);

    // ── Price Distribution ──
    const priceDistribution = (() => {
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
    const valueTrend = [...yearsPrices.entries()]
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
    const powertrainComposition = [...powertrains.entries()]
      .map(([powertrain, d]) => ({
        powertrain: powertrain as Vehicle['powertrain'],
        count: d.count,
        averagePrice: Math.round(d.totalPrice / d.count),
        percentage: Number(((d.count / total) * 100).toFixed(1)),
      }))
      .sort((a, b) => b.count - a.count);

    // ── Body Type Distribution ──
    const bodyTypeDistribution = [...bodyTypes.entries()]
      .map(([bodyType, d]) => ({
        bodyType: bodyType as Vehicle['bodyType'],
        count: d.count,
        averagePrice: Math.round(d.totalPrice / d.count),
        percentage: Number(((d.count / total) * 100).toFixed(1)),
      }))
      .sort((a, b) => b.count - a.count);

    // ── Age Distribution ──
    const ageDistribution = [...yearsCount.entries()]
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
    const topModels = [...models.entries()]
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

    const step = Math.max(1, Math.ceil(scatterPoints.length / 500));
    const finalScatter = step > 1 ? scatterPoints.filter((_, i) => i % step === 0) : scatterPoints;

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

    if (!filters) {
      this.dashboardCache = result;
    }

    return result;
  }

  // ─── Inquiries ────────────────────────────────────────

  async saveInquiry(inquiry: Inquiry): Promise<void> {
    console.log(`[saveInquiry] ENTERED for ${inquiry.email} / ${inquiry.selectedVehicle.make} ${inquiry.selectedVehicle.model}`);
    // 1. Upsert Contact
    const contactId = await this.upsertContact(inquiry);
    console.log(`[saveInquiry] upsertContact returned contactId=${contactId}`);

    // 2. Create Vehicle Inquiry
    console.log(`[saveInquiry] SENDING POST inquiry`);
    await safeFetch({
      url: entityUrl(ENTITIES.INQUIRY),
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({
        [INQUIRY_FIELDS.CONTACT_LOOKUP]: contactId
          ? { '@odata.bind': `/contacts(${contactId})` }
          : null,
        [INQUIRY_FIELDS.VEHICLE_LOOKUP]: { '@odata.bind': `/${ENTITIES.VEHICLE}(${inquiry.id})` },
        [INQUIRY_FIELDS.STATUS]: inquiryStatusValue(inquiry.status) ?? 1,
        'vpi_firstname': inquiry.firstName,
        'vpi_lastname': inquiry.lastName,
        'vpi_email': inquiry.email,
        'vpi_phone': inquiry.phone,
        'vpi_city': cityValue(inquiry.city) ?? null,
        'vpi_country': inquiry.country,
        'vpi_consent': inquiry.consent,
        'vpi_vehiclemake': inquiry.selectedVehicle.make,
        'vpi_vehiclemodel': inquiry.selectedVehicle.model,
        'vpi_vehiclespec': inquiry.selectedVehicle.spec,
        'vpi_vehicleyear': inquiry.selectedVehicle.year,
        'vpi_bodytype': bodyTypeLabel(inquiry.selectedVehicle.bodyType),
      }),
    });

    console.log(`[saveInquiry] POST inquiry completed`);
    // Keep local cache in sync
    this.inquiries.push(inquiry);
  }

  async getInquiries(): Promise<Inquiry[]> {
    try {
      const response = await safeFetch<ODataResponse<RawInquiryRecord>>({
        url: `${entityUrl(ENTITIES.INQUIRY)}?$select=${INQUIRY_SELECT_FIELDS}&$orderby=vpi_createdon desc`,
      });
      this.inquiries = (response.value ?? []).map((r) => this.parseInquiry(r));
    } catch {
      // Fall back to cached inquiries
    }
    return [...this.inquiries];
  }

  async getInquiryById(id: string): Promise<Inquiry | null> {
    const cached = this.inquiries.find((i) => i.id === id);
    if (cached) return cached;

    try {
      const record = await safeFetch<RawInquiryRecord>({
        url: `${entityUrl(ENTITIES.INQUIRY)}(${id})?$select=${INQUIRY_SELECT_FIELDS}`,
      });
      return this.parseInquiry(record);
    } catch {
      return null;
    }
  }

  async updateInquiryStatus(id: string, status: Inquiry['status']): Promise<void> {
    const value = inquiryStatusValue(status);
    if (!value) return;

    await safeFetch({
      url: `${entityUrl(ENTITIES.INQUIRY)}(${id})`,
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ [INQUIRY_FIELDS.STATUS]: value }),
    });

    // Update local cache
    const inquiry = this.inquiries.find((i) => i.id === id);
    if (inquiry) {
      inquiry.status = status;
    }
  }

  // ─── Private: Contact Management ──────────────────────

  private _upsertCount = 0;
  private async upsertContact(inquiry: Inquiry): Promise<string | null> {
    this._upsertCount++;
    const callId = this._upsertCount;
    console.log(`[upsertContact #${callId}] ENTERED for ${inquiry.email}`);

    try {
      // Try to find existing contact by email
      console.log(`[upsertContact #${callId}] SENDING GET check`);
      const existing = await safeFetch<ODataResponse<RawContactRecord>>({
        url: `${entityUrl(ENTITIES.CONTACT)}?$select=${CONTACT_SELECT_FIELDS}&$filter=${CONTACT_FIELDS.EMAIL} eq '${encodeURIComponent(inquiry.email)}'&$top=1`,
      });
      console.log(`[upsertContact #${callId}] GET returned`, { found: existing.value?.length });
      if (existing.value?.length && existing.value[0]?.[CONTACT_FIELDS.ID]) {
        return existing.value[0][CONTACT_FIELDS.ID]!;
      }
    } catch {
      // Proceed to create
    }

    // Create new contact
    console.log(`[upsertContact #${callId}] SENDING POST create`);
    try {
      const contactId = await createContact({
        firstname: inquiry.firstName,
        lastname: inquiry.lastName,
        emailaddress1: inquiry.email,
        telephone1: inquiry.phone,
        vpi_city: cityValue(inquiry.city) ?? null,
        vpi_country: inquiry.country,
      });
      console.log(`[upsertContact #${callId}] POST returned`, { hasId: !!contactId });
      return contactId;
    } catch (e) {
      console.log(`[upsertContact #${callId}] POST failed`, e);
      return null;
    }
  }

  // ─── Private: Parsing ─────────────────────────────────

  private parseInquiry(record: RawInquiryRecord): Inquiry {
    return {
      id: record[INQUIRY_FIELDS.ID] ?? '',
      firstName: (record as any).vpi_firstname ?? '',
      lastName: (record as any).vpi_lastname ?? '',
      email: (record as any).vpi_email ?? '',
      phone: (record as any).vpi_phone ?? '',
      country: (record as any).vpi_country ?? '',
      city: cityLabel((record as any).vpi_city, 'Dubai'),
      consent: Boolean((record as any).vpi_consent),
      selectedVehicle: {
        year: Number((record as any).vpi_vehicleyear) || 0,
        make: (record as any).vpi_vehiclemake ?? '',
        model: (record as any).vpi_vehiclemodel ?? '',
        spec: (record as any).vpi_vehiclespec ?? '',
        bodyType: (record as any).vpi_bodytype ?? '',
      },
      createdAt: new Date(),
      status: inquiryStatusLabel(record[INQUIRY_FIELDS.STATUS], 'pending') as Inquiry['status'],
    };
  }

  // ─── Private: Pricing Index ───────────────────────────

  private buildPricingIndex(): Map<string, VehiclePricing> {
    const pricesBySegment = new Map<string, number[]>();
    const singlePrices = new Map<string, number>();

    for (const vehicle of this.vehicles) {
      const price = this.rawPrice(vehicle.id) ?? 0;
      if (price <= 0) continue;
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
        marketTrend: { direction: 'stable' as const, percentage: 0, periodMonths: 3, volatility: 'low' as const },
        lastUpdated: new Date(),
      });
    }
    return map;
  }

  /** Extract the average price from the raw API data captured during init. */
  private rawPrice(vehicleId: string): number | undefined {
    return this.rawPrices.get(vehicleId);
  }

  // ─── Private: Hierarchy ───────────────────────────────

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
    for (const y of sortedYears) makes[y]?.sort();
    Object.values(models).forEach((arr) => arr.sort());
    Object.values(specs).forEach((arr) => arr.sort());
    Object.values(bodyTypes).forEach((arr) => arr.sort());
    Object.values(transmissions).forEach((arr) => arr.sort());
    Object.values(driveTypes).forEach((arr) => arr.sort());
    Object.values(categories).forEach((arr) => arr.sort());
    Object.values(powertrains).forEach((arr) => arr.sort());
    Object.values(vehicleTypes).forEach((arr) => arr.sort());

    return {
      years: sortedYears,
      makes,
      models,
      specs,
      bodyTypes,
      transmissions,
      driveTypes,
      categories,
      powertrains,
      vehicleTypes,
    };
  }

  // ─── Private: Analytics Helpers ───────────────────────

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

  private computeOverview() {
    const prices = this.vehicles.map((v) => this.pricing.get(v.id)?.averagePrice ?? 0);
    const validPrices = prices.filter((p) => p > 0);
    const makes = new Set(this.vehicles.map((v) => v.make));
    const models = new Set(this.vehicles.map((v) => `${v.make}-${v.model}`));

    return {
      totalVehicles: this.vehicles.length,
      totalMakes: makes.size,
      totalModels: models.size,
      averageMarketPrice: validPrices.length > 0
        ? Math.round(validPrices.reduce((a, b) => a + b, 0) / validPrices.length)
        : 0,
      highestVehicleValue: validPrices.length > 0 ? Math.max(...validPrices) : 0,
      lowestVehicleValue: validPrices.length > 0 ? Math.min(...validPrices) : 0,
      priceRangeSpread: validPrices.length > 0 ? Math.max(...validPrices) - Math.min(...validPrices) : 0,
      lastUpdated: new Date(),
    };
  }

  private computeCountByMake() {
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

  private computeCountByModel() {
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

  private computePriceDistribution() {
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

    const buckets = [];
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

  private computePriceByYear() {
    const map = new Map<number, { prices: number[] }>();
    for (const v of this.vehicles) {
      const entry = map.get(v.year) ?? { prices: [] };
      const price = this.pricing.get(v.id)?.averagePrice ?? 0;
      if (price > 0) entry.prices.push(price);
      map.set(v.year, entry);
    }

    return [...map.entries()]
      .map(([year, data]) => {
        const sorted = [...data.prices].sort((a, b) => a - b);
        return {
          year,
          averagePrice: Math.round(data.prices.reduce((a, b) => a + b, 0) / data.prices.length) || 0,
          medianPrice: sorted.length > 0 ? sorted[Math.floor(sorted.length / 2)] ?? 0 : 0,
          minimumPrice: sorted.length > 0 ? sorted[0] ?? 0 : 0,
          maximumPrice: sorted.length > 0 ? sorted[sorted.length - 1] ?? 0 : 0,
          count: data.prices.length,
        };
      })
      .sort((a, b) => a.year - b.year);
  }

  private computePriceByCategory() {
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
        averagePrice: data.prices.length > 0
          ? Math.round(data.prices.reduce((a, b) => a + b, 0) / data.prices.length)
          : 0,
        medianPrice: data.prices.length > 0
          ? (() => { const s = [...data.prices].sort((a, b) => a - b); return s[Math.floor(s.length / 2)] ?? 0; })()
          : 0,
        count: data.count,
      }))
      .sort((a, b) => b.averagePrice - a.averagePrice);
  }

  private computeTransmissionAnalysis() {
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

  private computeDriveTypeAnalysis() {
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

  private computePowertrainAnalysis() {
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

  private computeBodyTypeAnalysis() {
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

  // ─── Private: Filtering / Sorting / Similarity ────────

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
    return [
      {
        type: 'regional',
        title: 'UAE Market Overview',
        description: 'The UAE automotive market shows robust demand for pre-owned vehicles.',
        severity: 'neutral',
      },
    ];
  }
}

// ─── Raw API response types (internal) ────────────────────

interface RawContactRecord {
  [CONTACT_FIELDS.ID]?: string;
  [CONTACT_FIELDS.FIRST_NAME]?: string;
  [CONTACT_FIELDS.LAST_NAME]?: string;
  [CONTACT_FIELDS.EMAIL]?: string;
  [CONTACT_FIELDS.PHONE]?: string;
  [CONTACT_FIELDS.CITY]?: number;
  [CONTACT_FIELDS.COUNTRY]?: string;
}

interface RawInquiryRecord {
  [INQUIRY_FIELDS.ID]?: string;
  [INQUIRY_FIELDS.STATUS]?: number;
}
