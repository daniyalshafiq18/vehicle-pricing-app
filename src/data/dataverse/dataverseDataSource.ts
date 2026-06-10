/**
 * DataverseDataSource — IDataSource implementation for Microsoft Dataverse.
 *
 * Fetches vehicle data from Dataverse OData v4.0 endpoints on initialization,
 * caches it in memory for fast reads, and persists inquiries/contacts directly
 * to the API.
 *
 * When data flows match: the cached-vehicle analytics algorithms are identical
 * to ExcelDataSource so dashboard charts and KPIs produce the same results.
 *
 * Inquiry lifecycle:
 *   1. Look up contact by email (create if missing)
 *   2. Look up vehicle GUID from cached data
 *   3. Create inquiry with navigation property bindings
 */

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
  DashboardAnalytics,
  DashboardFilters,
  Inquiry,
  ScatterDataPoint,
  PriceDistribution,
  PriceByYear,
  PriceByCategory,
  PowertrainAnalysis,
  BodyTypeAnalysis,
  TransmissionAnalysis,
  DriveTypeAnalysis,
  AgeDistribution,
  BoxPlotData,
  TopVehicle,
  VehicleCountByMake,
  VehicleCountByModel,
} from '@types';
import { memoize } from '@utils';
import { dvClient } from './dataverseClient';
import { qb, includeAnnotationsHeader } from './dataverseQueries';
import {
  mapVehicleRow,
  buildPricing,
  mapContactRow,
  mapInquiryRow,
  buildHierarchy,
} from './dataverseMapper';
import { cityMapping, inquiryStatusMapping } from './mappings';
import type {
  DataverseVehicleRow,
  DataverseInquiryRow,
  DataverseContactRow,
  ODataResponse,
  ContactCreatePayload,
  InquiryCreatePayload,
} from './types';
import {
  VEHICLE_SELECT_FIELDS,
  INQUIRY_SELECT_FIELDS,
  CONTACT_SELECT_FIELDS,
} from './types';
import { DataverseError } from './errors';

// ─── Helpers ─────────────────────────────────────────────────────────

const PAGE_SIZE = 5000; // Max records per Dataverse API call

export class DataverseDataSource implements IDataSource {
  private initialized = false;
  private vehicles: Vehicle[] = [];
  private pricing: Map<string, VehiclePricing> = new Map();
  private hierarchy!: VehicleHierarchy;
  private inquiries: Inquiry[] = [];
  private inquiryInitialized = false;

  private memoizedGetHierarchy = memoize(() => this.hierarchy);
  private memoizedGetAnalytics = memoize(() => this.computeAnalytics());
  private dashboardCache: DashboardAnalytics | null = null;

  // ─── Lifecycle ────────────────────────────────────────

  async initialize(): Promise<void> {
    // Fetch all vehicles from Dataverse with pagination
    const rows = await this.fetchAllVehicleRows();
    this.buildFromRows(rows);
    this.initialized = true;
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  // ─── Vehicles ─────────────────────────────────────────

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

  async getComparableVehicles(
    vehicleId: string,
    limit = 5,
  ): Promise<ComparableVehicle[]> {
    const vehicle = this.vehicles.find((v) => v.id === vehicleId);
    if (!vehicle) return [];

    const candidates = this.vehicles.filter(
      (v) =>
        v.id !== vehicleId &&
        v.make === vehicle.make &&
        Math.abs(v.year - vehicle.year) <= 3,
    );

    return candidates
      .map((candidate) => {
        const pricing = this.pricing.get(candidate.id);
        const score = this.computeSimilarity(vehicle, candidate);
        const diff = pricing
          ? pricing.averagePrice -
            (this.pricing.get(vehicleId)?.averagePrice ?? 0)
          : 0;
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

    // Collect min/max from all matching vehicles
    const matching = this.vehicles.filter(
      (v) =>
        v.year === year &&
        v.make.toLowerCase() === make.toLowerCase() &&
        v.model.toLowerCase() === model.toLowerCase() &&
        v.spec.toLowerCase() === spec.toLowerCase() &&
        (!bodyType || v.bodyType.toLowerCase() === bodyType.toLowerCase()),
    );

    const minPrices = matching
      .map((v) => this.pricing.get(v.id)?.minimumPrice ?? 0)
      .filter((p) => p > 0);
    const maxPrices = matching
      .map((v) => this.pricing.get(v.id)?.maximumPrice ?? 0)
      .filter((p) => p > 0);

    const minPrice = minPrices.length > 0 ? Math.min(...minPrices) : 0;
    const maxPrice = maxPrices.length > 0 ? Math.max(...maxPrices) : 0;

    let pricing = basePricing ?? this.createDefaultPricing(vehicle);
    pricing = { ...pricing, minimumPrice: minPrice, maximumPrice: maxPrice };

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
    let filtered = filters
      ? this.applyFilters(this.vehicles, filters)
      : this.vehicles;
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

  // ─── Analytics ────────────────────────────────────────

  async getAnalytics(): Promise<AnalyticsData> {
    return this.memoizedGetAnalytics();
  }

  async getAllVehiclesWithPricing(
    filters?: VehicleFilters,
  ): Promise<{ vehicle: Vehicle; pricing: VehiclePricing }[]> {
    let filtered = filters
      ? this.applyFilters(this.vehicles, filters)
      : this.vehicles;
    return filtered
      .map((vehicle) => {
        const pricing =
          this.pricing.get(vehicle.id) ?? this.createDefaultPricing(vehicle);
        return { vehicle, pricing };
      })
      .filter((vp) => vp.pricing.averagePrice > 0);
  }

  async getDashboardAnalytics(
    filters?: DashboardFilters,
  ): Promise<DashboardAnalytics> {
    // Return cached unfiltered result if available
    if (!filters && this.dashboardCache) {
      return this.dashboardCache;
    }

    const vehicles = filters
      ? this.applyFilters(this.vehicles, filters as VehicleFilters)
      : this.vehicles;
    const totalUnfiltered = this.vehicles.length;

    // ── Single-pass data collection ──
    const makes = new Map<string, { count: number; totalPrice: number }>();
    const models = new Map<
      string,
      { make: string; count: number; totalPrice: number }
    >();
    const powertrains = new Map<
      string,
      { count: number; totalPrice: number }
    >();
    const bodyTypes = new Map<
      string,
      { count: number; totalPrice: number }
    >();
    const yearsCount = new Map<number, number>();
    const yearsPrices = new Map<number, number[]>();
    const categoryPrices = new Map<string, number[]>();
    const prices: number[] = [];
    const scatterPoints: ScatterDataPoint[] = [];
    const leaderboardCandidates: {
      vehicle: Vehicle;
      pricing: VehiclePricing;
    }[] = [];

    let minPrice = Infinity;
    let maxPrice = -Infinity;

    for (const vehicle of vehicles) {
      const pricing =
        this.pricing.get(vehicle.id) ?? this.createDefaultPricing(vehicle);
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

      // Scatter data — sample
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

      // Leaderboard candidates
      leaderboardCandidates.push({ vehicle, pricing });
    }

    const total = prices.length;

    // ── Overview ──
    const overview: AnalyticsOverview = {
      totalVehicles: vehicles.length,
      totalMakes: makes.size,
      totalModels: models.size,
      averageMarketPrice:
        total > 0
          ? Math.round(prices.reduce((a, b) => a + b, 0) / total)
          : 0,
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

    // ── Price Distribution ──
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
        const idx = (p: number) =>
          Math.max(0, Math.min(n - 1, Math.round((p / 100) * (n - 1))));
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
    leaderboardCandidates.sort(
      (a, b) => b.pricing.averagePrice - a.pricing.averagePrice,
    );
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

    // Down-sample scatter
    const step = Math.max(1, Math.ceil(scatterPoints.length / 500));
    const finalScatter =
      step > 1
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

    if (!filters) {
      this.dashboardCache = result;
    }

    return result;
  }

  // ─── Makes / Models / Years ───────────────────────────

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

  // ─── Inquiries (Dataverse API) ────────────────────────

  async saveInquiry(inquiry: Inquiry): Promise<void> {
    // Step 1: Look up or create the contact
    const contactId = await this.resolveContact(inquiry);

    // Step 2: Find the vehicle GUID from cached data
    const vehicleId = this.findVehicleGuid(inquiry);
    if (!vehicleId) {
      throw new DataverseError(
        `Vehicle not found: ${inquiry.selectedVehicle.year} ${inquiry.selectedVehicle.make} ${inquiry.selectedVehicle.model} ${inquiry.selectedVehicle.spec}`,
        404,
      );
    }

    // Step 3: Create the inquiry
    const statusCode = this.getInquiryStatusCode(inquiry.status);
    const payload: InquiryCreatePayload = {
      'vpi_Contact@odata.bind': `contacts(${contactId})`,
      'vpi_Vehicle@odata.bind': `vpi_vehicledatas(${vehicleId})`,
      vpi_status: statusCode,
    };

    await dvClient.post('/vpi_vehicleinquiries', payload);
  }

  async getInquiries(): Promise<Inquiry[]> {
    // Use cached inquiries if we've already fetched them this session
    if (this.inquiryInitialized) {
      return [...this.inquiries];
    }

    const headers = includeAnnotationsHeader();
    const allRows = await this.fetchAllInquiryRows(headers);
    const result: Inquiry[] = [];

    for (const row of allRows) {
      // Resolve vehicle and contact from cache
      const vehicleGuid = row._vpi_vehicle_value;
      const vehicle = vehicleGuid
        ? this.vehicles.find((v) => v.id === vehicleGuid)
        : undefined;

      const contactGuid = row._vpi_contact_value;

      // Try to fetch contact details from Dataverse for display
      let contactInfo: { firstName: string; lastName: string; email: string; city: string; country: string } | undefined;
      try {
        const contactRow = await dvClient.get<DataverseContactRow>(
          `/contacts(${contactGuid})`,
          {
            $select: CONTACT_SELECT_FIELDS,
          },
          { headers },
        );
        contactInfo = mapContactRow(contactRow);
      } catch {
        // Contact fetch is best-effort
      }

      // Look up pricing for the vehicle
      const pricing = vehicle
        ? this.pricing.get(vehicle.id)
        : undefined;

      const mapped = mapInquiryRow(row, vehicle, contactInfo, pricing);
      result.push(mapped);
    }

    this.inquiries = result;
    this.inquiryInitialized = true;
    return [...result];
  }

  async getInquiryById(id: string): Promise<Inquiry | null> {
    // Refresh from API if not cached
    if (!this.inquiryInitialized) {
      await this.getInquiries();
    }
    return this.inquiries.find((i) => i.id === id) ?? null;
  }

  async updateInquiryStatus(id: string, status: Inquiry['status']): Promise<void> {
    const code = this.getInquiryStatusCode(status);
    await dvClient.patch(`/vpi_vehicleinquiries(${id})`, {
      vpi_status: code,
    });

    // Update cache
    const inquiry = this.inquiries.find((i) => i.id === id);
    if (inquiry) {
      inquiry.status = status;
    }
  }

  // ─── Private: Data Fetching ───────────────────────────

  /**
   * Fetch ALL vehicle rows from Dataverse, handling pagination via
   * @odata.nextLink and/or $skip/$top.
   */
  private async fetchAllVehicleRows(): Promise<DataverseVehicleRow[]> {
    const allRows: DataverseVehicleRow[] = [];
    let skip = 0;
    let hasMore = true;

    while (hasMore) {
      const params = qb
        .clear()
        .select(...VEHICLE_SELECT_FIELDS.split(','))
        .top(PAGE_SIZE)
        .skip(skip)
        .build();

      const response = await dvClient.get<ODataResponse<DataverseVehicleRow>>(
        '/vpi_vehicledatas',
        params,
        { headers: includeAnnotationsHeader() },
      );

      allRows.push(...response.value);

      // Check for nextLink (Dataverse server-side paging)
      if (response['@odata.nextLink']) {
        skip = 0;
        // Follow nextLink by fetching directly
        const nextRows = await this.fetchNextLink<DataverseVehicleRow>(
          response['@odata.nextLink'],
        );
        allRows.push(...nextRows);
        hasMore = false; // nextLink handler already got all remaining pages
      } else if (response.value.length === PAGE_SIZE) {
        // Manual $skip pagination
        skip += PAGE_SIZE;
      } else {
        hasMore = false;
      }
    }

    return allRows;
  }

  /**
   * Follow @odata.nextLink URLs for server-side pagination.
   */
  private async fetchNextLink<T>(
    nextLink: string,
  ): Promise<T[]> {
    const rows: T[] = [];
    let url: string | undefined = nextLink;

    while (url) {
      const response: ODataResponse<T> = await dvClient.get<ODataResponse<T>>(
        url.replace(this.getBaseUrl() + '/_api', ''),
      );
      rows.push(...response.value);
      url = response['@odata.nextLink'];
    }

    return rows;
  }

  /**
   * Fetch all inquiry rows with pagination.
   */
  private async fetchAllInquiryRows(
    headers: Record<string, string>,
  ): Promise<DataverseInquiryRow[]> {
    const allRows: DataverseInquiryRow[] = [];
    let skip = 0;
    let hasMore = true;

    while (hasMore) {
      const params = qb
        .clear()
        .select(...INQUIRY_SELECT_FIELDS.split(','))
        .top(PAGE_SIZE)
        .skip(skip)
        .build();

      const response = await dvClient.get<ODataResponse<DataverseInquiryRow>>(
        '/vpi_vehicleinquiries',
        params,
        { headers },
      );

      allRows.push(...response.value);

      if (response['@odata.nextLink']) {
        const nextRows = await this.fetchNextLink<DataverseInquiryRow>(
          response['@odata.nextLink'],
        );
        allRows.push(...nextRows);
        hasMore = false;
      } else if (response.value.length === PAGE_SIZE) {
        skip += PAGE_SIZE;
      } else {
        hasMore = false;
      }
    }

    return allRows;
  }

  /**
   * Get the base URL from the dvClient module (reuse same logic).
   */
  private getBaseUrl(): string {
    const meta = document.querySelector<HTMLMetaElement>(
      'meta[name="dataverse-url"]',
    );
    if (meta?.content) return meta.content.replace(/\/+$/, '');
    const envUrl = import.meta.env.VITE_DATAVERSE_URL as string | undefined;
    if (envUrl) return envUrl.replace(/\/+$/, '');
    return window.location.origin;
  }

  // ─── Private: Contact Resolution ──────────────────────

  /**
   * Find or create a contact in Dataverse.
   * Returns the contact GUID.
   */
  private async resolveContact(inquiry: Inquiry): Promise<string> {
    // Try to find existing contact by email
    const filter = `emailaddress1 eq '${inquiry.email.replace(/'/g, "''")}'`;
    const params = qb
      .clear()
      .select('contactid')
      .filter(filter)
      .top(1)
      .build();

    try {
      const existing = await dvClient.get<ODataResponse<DataverseContactRow>>(
        '/contacts',
        params,
      );
      if (existing.value.length > 0) {
        return existing.value[0]!.contactid;
      }
    } catch {
      // Not found or error — create below
    }

    // Create new contact
    const payload: ContactCreatePayload = {
      firstname: inquiry.firstName,
      lastname: inquiry.lastName,
      emailaddress1: inquiry.email,
      vpi_city: this.getCityCode(inquiry.city),
      vpi_country: inquiry.country || 'UAE',
    };

    // POST to Dataverse — the response includes the new record's ID in the
    // OData-EntityId header rather than in the body
    const location = await dvClient.post<string>('/contacts', payload);
    const guidMatch = location.match(
      /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i,
    );
    if (guidMatch) return guidMatch[0]!;

    // Fallback: try fetching the contact we just created
    const verifyFilter = `emailaddress1 eq '${inquiry.email.replace(/'/g, "''")}'`;
    const verifyParams = qb
      .clear()
      .select('contactid')
      .filter(verifyFilter)
      .top(1)
      .build();
    const verified = await dvClient.get<ODataResponse<DataverseContactRow>>(
      '/contacts',
      verifyParams,
    );
    if (verified.value.length > 0) {
      return verified.value[0]!.contactid;
    }

    throw new DataverseError('Failed to create or find contact', 500);
  }

  /**
   * Map a city string to a Dataverse option-set code.
   */
  private getCityCode(city: string): number {
    const code = cityMapping.code(city);
    if (code !== undefined) return code;
    // Default to Dubai if unknown
    return 1;
  }

  /**
   * Find a vehicle's Dataverse GUID from the cached data by matching
   * year/make/model/spec.
   */
  private findVehicleGuid(inquiry: Inquiry): string | null {
    const { year, make, model, spec } = inquiry.selectedVehicle;
    const vehicle = this.vehicles.find(
      (v) =>
        v.year === year &&
        v.make.toLowerCase() === make.toLowerCase() &&
        v.model.toLowerCase() === model.toLowerCase() &&
        v.spec.toLowerCase() === spec.toLowerCase(),
    );
    return vehicle?.id ?? null;
  }

  // ─── Private: Inquiry Status ──────────────────────────

  /**
   * Map an application-level InquiryStatus to a Dataverse option-set code.
   */
  private getInquiryStatusCode(status: Inquiry['status']): number {
    const labelMap: Record<Inquiry['status'], string> = {
      pending: 'Pending',
      reviewed: 'Reviewed',
      contacted: 'Contacted',
      closed: 'Closed',
    };
    const code = inquiryStatusMapping.code(labelMap[status]!);
    if (code !== undefined) return code;
    return 1; // Default to Pending (code 1)
  }

  // ─── Private: Data Construction ───────────────────────

  private buildFromRows(rows: DataverseVehicleRow[]): void {
    this.vehicles = rows.map((row) => mapVehicleRow(row));
    this.pricing = new Map();
    for (const row of rows) {
      const vehicle = this.vehicles.find(
        (v) => v.id === row.vpi_vehicledataid,
      );
      if (vehicle) {
        this.pricing.set(vehicle.id, buildPricing(vehicle.id, row));
      }
    }
    this.hierarchy = buildHierarchy(this.vehicles);
  }

  // ─── Private: Filtering / Sorting / Similarity ────────

  private applyFilters(
    vehicles: Vehicle[],
    filters: VehicleFilters,
  ): Vehicle[] {
    return vehicles.filter((v) => {
      if (filters.year && v.year !== filters.year) return false;
      if (
        filters.make &&
        v.make.toLowerCase() !== filters.make.toLowerCase()
      )
        return false;
      if (
        filters.model &&
        v.model.toLowerCase() !== filters.model.toLowerCase()
      )
        return false;
      if (
        filters.spec &&
        v.spec.toLowerCase() !== filters.spec.toLowerCase()
      )
        return false;
      if (filters.bodyType && v.bodyType !== filters.bodyType) return false;
      if (filters.transmission && v.transmission !== filters.transmission)
        return false;
      if (filters.driveType && v.driveType !== filters.driveType)
        return false;
      if (filters.powertrain && v.powertrain !== filters.powertrain)
        return false;
      if (filters.vehicleType && v.vehicleType !== filters.vehicleType)
        return false;
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

  private sortVehicles(
    a: Vehicle,
    b: Vehicle,
    sort: VehicleSortOption,
  ): number {
    const dir = sort.direction === 'asc' ? 1 : -1;
    const field = sort.field;

    const priceA = this.pricing.get(a.id)?.averagePrice ?? 0;
    const priceB = this.pricing.get(b.id)?.averagePrice ?? 0;

    let cmp = 0;
    switch (field) {
      case 'year':
        cmp = a.year - b.year;
        break;
      case 'make':
        cmp = a.make.localeCompare(b.make);
        break;
      case 'model':
        cmp = a.model.localeCompare(b.model);
        break;
      case 'price':
        cmp = priceA - priceB;
        break;
      case 'horsepower':
        cmp = a.horsepower - b.horsepower;
        break;
      case 'engineSize':
        cmp = a.engineSize - b.engineSize;
        break;
      default:
        cmp = 0;
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

  private computeConfidence(
    pricing: VehiclePricing,
  ): ValuationResult['confidenceIndicator'] {
    if (pricing.sampleSize >= 50 && pricing.confidenceScore >= 85)
      return 'very-high';
    if (pricing.sampleSize >= 30 && pricing.confidenceScore >= 70)
      return 'high';
    if (pricing.sampleSize >= 15 && pricing.confidenceScore >= 50)
      return 'moderate';
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
      priceRange: {
        min: 0,
        max: 0,
        average: 0,
        median: 0,
        p10: 0,
        p25: 0,
        p75: 0,
        p90: 0,
      },
      confidenceScore: 0,
      marketTrend: {
        direction: 'stable',
        percentage: 0,
        periodMonths: 3,
        volatility: 'low',
      },
      lastUpdated: new Date(),
    };
  }

  private generateMarketInsights(
    _vehicle: Vehicle,
    _pricing: VehiclePricing,
  ): MarketInsight[] {
    return [
      {
        type: 'regional',
        title: 'UAE Market Overview',
        description:
          'The UAE automotive market shows robust demand for pre-owned vehicles with good specification levels.',
        severity: 'neutral',
      },
    ];
  }

  // ─── Private: Analytics computation mirroring ExcelDataSource ──

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
    const prices = this.vehicles.map(
      (v) => this.pricing.get(v.id)?.averagePrice ?? 0,
    );
    const validPrices = prices.filter((p) => p > 0);
    const makes = new Set(this.vehicles.map((v) => v.make));
    const models = new Set(this.vehicles.map((v) => `${v.make}-${v.model}`));

    return {
      totalVehicles: this.vehicles.length,
      totalMakes: makes.size,
      totalModels: models.size,
      averageMarketPrice:
        validPrices.length > 0
          ? Math.round(
              validPrices.reduce((a, b) => a + b, 0) / validPrices.length,
            )
          : 0,
      highestVehicleValue: validPrices.length > 0 ? Math.max(...validPrices) : 0,
      lowestVehicleValue: validPrices.length > 0 ? Math.min(...validPrices) : 0,
      priceRangeSpread:
        validPrices.length > 0
          ? Math.max(...validPrices) - Math.min(...validPrices)
          : 0,
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
    const map = new Map<
      string,
      { make: string; count: number; totalPrice: number }
    >();
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
      const count = prices.filter(
        (p) => p >= bucketMin && (i === 9 ? p <= bucketMax : p < bucketMax),
      ).length;
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
          averagePrice: Math.round(
            data.prices.reduce((a, b) => a + b, 0) / data.prices.length,
          ),
          medianPrice:
            sorted.length > 0
              ? sorted[Math.floor(sorted.length / 2)] ?? 0
              : 0,
          minimumPrice: sorted.length > 0 ? sorted[0] ?? 0 : 0,
          maximumPrice: sorted.length > 0
            ? sorted[sorted.length - 1] ?? 0
            : 0,
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
        averagePrice:
          data.prices.length > 0
            ? Math.round(
                data.prices.reduce((a, b) => a + b, 0) / data.prices.length,
              )
            : 0,
        medianPrice:
          data.prices.length > 0
            ? (() => {
                const s = [...data.prices].sort((a, b) => a - b);
                return s[Math.floor(s.length / 2)] ?? 0;
              })()
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
}
