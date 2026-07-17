import { useState, useCallback, useMemo } from 'react';
import { useVehicles, useVehicleHierarchy, usePricing, useBatchPricing } from '@hooks';
import { useVehicleStore } from '@stores';
import { useDebounce } from '@utils';
import {
  Button,
  Input,
  Badge,
  Dialog,
  SkeletonTable,
  Card,
  CardContent,
  CustomSelect,
  type CustomSelectOption,
} from '@components/ui';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  ArrowUpDown,
  Cpu,
  Cog,
  Shield,
  Layers,
  Info,
  Fuel,
  Gauge,
  Filter,
  X,
  RotateCcw,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertCircle,
  Zap,
  LayoutList,
  LayoutGrid,
  Car,
} from 'lucide-react';
import type { Vehicle } from '@types';
import { formatCurrency, formatNumber, cn } from '@utils';

const specColors: Record<string, string> = {
  'SPIDER': 'bg-primary/10 text-primary border-primary/20',
  'COMPETIZIONE': 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
  'MULTIAIR': 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20',
  'LUXURY': 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  'PREMIUM': 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20',
  'SPORT': 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
  'STANDARD': 'bg-primary/10 text-primary border-primary/20',
};

const trendIcons: Record<string, React.ReactNode> = {
  up: <TrendingUp className="h-3 w-3 text-emerald-500" />,
  down: <TrendingDown className="h-3 w-3 text-rose-500" />,
  stable: <Minus className="h-3 w-3 text-muted-foreground" />,
};

// ─── Confidence Badge ────────────────────────────────────────
function ConfidenceBadge({ score }: { score: number }) {
  const color = score >= 85 ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
    : score >= 70 ? 'text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/20'
    : score >= 50 ? 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20'
    : 'text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/20';

  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium', color)}>
      <Zap className="h-2.5 w-2.5" />
      {score}%
    </span>
  );
}

// ─── Pricing Detail ──────────────────────────────────────────
function PricingDetailSection({ vehicleId }: { vehicleId: string }) {
  const { data: pricing, isLoading } = usePricing(vehicleId);

  if (isLoading) return (
    <div className="animate-pulse space-y-3">
      <div className="h-4 w-32 rounded bg-muted" />
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-14 rounded-xl bg-muted/50" />
        ))}
      </div>
    </div>
  );

  if (!pricing) return <p className="text-sm text-muted-foreground">No pricing data available</p>;

  const trend = pricing.marketTrend;
  const trendColor = trend.direction === 'up' ? 'text-emerald-600 dark:text-emerald-400'
    : trend.direction === 'down' ? 'text-rose-600 dark:text-rose-400' : 'text-muted-foreground';

  const range = pricing.priceRange;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          <DollarSign className="h-4 w-4" />
          Pricing Overview
        </h4>
        <ConfidenceBadge score={pricing.confidenceScore} />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Market Price', value: formatCurrency(pricing.averagePrice) },
          { label: 'Median', value: formatCurrency(pricing.medianPrice) },
          { label: 'Range (Low)', value: formatCurrency(pricing.minimumPrice) },
          { label: 'Range (High)', value: formatCurrency(pricing.maximumPrice) },
          { label: 'P10', value: formatCurrency(range.p10) },
          { label: 'P25', value: formatCurrency(range.p25) },
          { label: 'P75', value: formatCurrency(range.p75) },
          { label: 'P90', value: formatCurrency(range.p90) },
        ].map((item) => (
          <div key={item.label} className="rounded-xl border bg-card p-3">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{item.label}</p>
            <p className="mt-0.5 text-sm font-semibold text-foreground">{item.value}</p>
          </div>
        ))}
      </div>

      {/* Price range bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{formatCurrency(range.min)}</span>
          <span className="text-foreground/60">Price Range</span>
          <span>{formatCurrency(range.max)}</span>
        </div>
        <div className="relative h-2 overflow-hidden rounded-full bg-muted">
          <div className="absolute left-0 top-0 h-full rounded-full bg-gradient-to-r from-primary/40 via-primary/60 to-primary/40"
            style={{ left: `${((range.p25 - range.min) / (range.max - range.min)) * 100}%`, right: `${100 - ((range.p75 - range.min) / (range.max - range.min)) * 100}%` }}
          />
          <div className="absolute top-1/2 h-full w-0.5 -translate-y-1/2 rounded-full bg-foreground"
            style={{ left: `${((pricing.averagePrice - range.min) / (range.max - range.min)) * 100}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-[10px] text-muted-foreground/60">
          <span>P25</span>
          <span className="font-medium text-foreground/60">AVG</span>
          <span>P75</span>
        </div>
      </div>

      {/* Market trend */}
      <div className="flex items-center gap-4 rounded-xl border bg-card p-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Market Trend:</span>
          <span className={cn('flex items-center gap-1 text-sm font-medium', trendColor)}>
            {trendIcons[trend.direction]}
            {trend.direction === 'up' ? 'Appreciating' : trend.direction === 'down' ? 'Depreciating' : 'Stable'}
            <span className="text-xs opacity-70">({trend.percentage > 0 ? '+' : ''}{trend.percentage}% / {trend.periodMonths}mo)</span>
          </span>
        </div>
        <span className="ml-auto text-xs text-muted-foreground">Sample: {formatNumber(pricing.sampleSize)} vehicles</span>
      </div>
    </div>
  );
}

// ─── Vehicle Detail Dialog ───────────────────────────────────
function VehicleDetailDialog({
  vehicle,
  isOpen,
  onClose,
}: {
  vehicle: Vehicle;
  isOpen: boolean;
  onClose: () => void;
}) {
  const specs = [
    { label: 'Year', value: vehicle.year },
    { label: 'Make', value: vehicle.make },
    { label: 'Model', value: vehicle.model },
    { label: 'Spec', value: vehicle.spec },
  ];

  const technical = [
    { label: 'Engine', value: `${vehicle.engineSize}L`, icon: Cpu },
    { label: 'Horsepower', value: `${vehicle.horsepower} HP`, icon: Gauge },
    { label: 'Cylinders', value: vehicle.cylinders, icon: Fuel },
    { label: 'Transmission', value: vehicle.transmission, icon: Cog },
    { label: 'Drive Type', value: vehicle.driveType, icon: Shield },
    { label: 'Powertrain', value: vehicle.powertrain, icon: Layers },
  ];

  const dimensions = [
    { label: 'Body Type', value: vehicle.bodyType },
    { label: 'Category', value: vehicle.category },
    { label: 'Vehicle Type', value: vehicle.vehicleType },
    { label: 'Doors', value: vehicle.doors },
    { label: 'Seats', value: vehicle.seats },
  ];

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
      description={vehicle.spec}
      size="xl"
    >
      <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-1">
        <div>
          <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            <Info className="h-4 w-4" />
            Vehicle Identity
          </h4>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {specs.map((s) => (
              <div key={s.label} className="rounded-xl border bg-card p-3">
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className="mt-0.5 font-medium text-foreground">{s.value}</p>
              </div>
            ))}
          </div>
        </div>

        <PricingDetailSection vehicleId={vehicle.id} />

        <div>
          <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            <Gauge className="h-4 w-4" />
            Technical Specifications
          </h4>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {technical.map((t) => (
              <div key={t.label} className="rounded-xl border bg-card p-3">
                <div className="flex items-center gap-3">
                  <t.icon className="h-5 w-5 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">{t.label}</p>
                    <p className="truncate font-medium text-foreground">{t.value}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            <Layers className="h-4 w-4" />
            Classification
          </h4>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {dimensions.map((d) => (
              <div key={d.label} className="rounded-xl border bg-card p-3">
                <p className="text-xs text-muted-foreground">{d.label}</p>
                <p className="mt-0.5 font-medium text-foreground">{d.value}</p>
              </div>
            ))}
          </div>
        </div>

        {vehicle.description && (
          <div>
            <h4 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Description</h4>
            <p className="text-sm text-muted-foreground leading-relaxed">{vehicle.description}</p>
          </div>
        )}
      </div>
    </Dialog>
  );
}

// ─── Filter Bar ──────────────────────────────────────────────
function FilterBar({
  filters,
  onFilterChange,
  onReset,
}: {
  filters: Record<string, string | undefined>;
  onFilterChange: (key: string, value: string | undefined) => void;
  onReset: () => void;
}) {
  const { data: hierarchy } = useVehicleHierarchy();
  const [expanded, setExpanded] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  // ── Build all valid (year, make, model) tuples from hierarchy ──────

  const allTuples: Array<{ year: number; make: string; model: string }> =
    useMemo(() => {
      if (!hierarchy) return [];
      const result: Array<{ year: number; make: string; model: string }> = [];
      for (const year of hierarchy.years) {
        const makes = hierarchy.makes[year] ?? [];
        for (const make of makes) {
          const mk = `${year}-${make.toLowerCase()}`;
          const models = hierarchy.models[mk] ?? [];
          for (const model of models) {
            result.push({ year, make, model });
          }
        }
      }
      return result;
    }, [hierarchy]);

  // ── Helper: filter tuples by ALL selected filters, optionally
  //    excluding one dimension so that its dropdown shows all
  //    compatible values (not just the already-selected one).
  //
  function filterTuples(
    tuples: typeof allTuples,
    excludeDim?: string,
  ): typeof allTuples {
    if (!hierarchy) return [];

    return tuples.filter((t) => {
      const k = `${t.year}-${t.make.toLowerCase()}-${t.model.toLowerCase()}`;

      // Year / Make / Model (case-insensitive match)
      if (
        filters.year &&
        excludeDim !== 'year' &&
        String(t.year) !== filters.year
      ) return false;
      if (
        filters.make &&
        excludeDim !== 'make' &&
        t.make.toLowerCase() !== filters.make.toLowerCase()
      ) return false;
      if (
        filters.model &&
        excludeDim !== 'model' &&
        t.model.toLowerCase() !== filters.model.toLowerCase()
      ) return false;

      // Spec
      if (filters.spec && excludeDim !== 'spec') {
        const vals = hierarchy.specs[k] ?? [];
        if (!vals.some((v) => v.toLowerCase() === filters.spec!.toLowerCase())) return false;
      }

      // Transmission
      if (filters.transmission && excludeDim !== 'transmission') {
        const vals = hierarchy.transmissions[k] ?? [];
        if (!vals.some((v) => v.toLowerCase() === filters.transmission!.toLowerCase())) return false;
      }

      // Drive Type
      if (filters.driveType && excludeDim !== 'driveType') {
        const vals = hierarchy.driveTypes[k] ?? [];
        if (!vals.some((v) => v.toLowerCase() === filters.driveType!.toLowerCase())) return false;
      }

      // Category
      if (filters.category && excludeDim !== 'category') {
        const vals = hierarchy.categories[k] ?? [];
        if (!vals.some((v) => v.toLowerCase() === filters.category!.toLowerCase())) return false;
      }

      // Powertrain
      if (filters.powertrain && excludeDim !== 'powertrain') {
        const vals = hierarchy.powertrains[k] ?? [];
        if (!vals.some((v) => v.toLowerCase() === filters.powertrain!.toLowerCase())) return false;
      }

      // Vehicle Type
      if (filters.vehicleType && excludeDim !== 'vehicleType') {
        const vals = hierarchy.vehicleTypes[k] ?? [];
        if (!vals.some((v) => v.toLowerCase() === filters.vehicleType!.toLowerCase())) return false;
      }

      // Body Type — try both spec-qualified and unqualified keys
      if (filters.bodyType && excludeDim !== 'bodyType') {
        let body: string[] = [];
        if (filters.spec) {
          body = hierarchy.bodyTypes[`${k}-${filters.spec.toLowerCase()}`] ?? [];
        }
        if (body.length === 0) {
          body = hierarchy.bodyTypes[k] ?? [];
        }
        if (!body.some((v) => v.toLowerCase() === filters.bodyType!.toLowerCase())) return false;
      }

      return true;
    });
  }

  // ── Memoised constrained options for every dimension ─────────────

  const yearOptions: CustomSelectOption[] = useMemo(() => {
    if (!hierarchy) return [];
    const matched = filterTuples(allTuples, 'year');
    const vals = new Set(matched.map((t) => String(t.year)));
    return [...vals].sort().map((v) => ({ value: v, label: v }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allTuples, hierarchy, JSON.stringify(filters)]);

  const makeOptions: CustomSelectOption[] = useMemo(() => {
    if (!hierarchy) return [];
    const matched = filterTuples(allTuples, 'make');
    const vals = new Set(matched.map((t) => t.make));
    return [...vals].sort().map((v) => ({ value: v, label: v }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allTuples, hierarchy, JSON.stringify(filters)]);

  const modelOptions: CustomSelectOption[] = useMemo(() => {
    if (!hierarchy) return [];
    const matched = filterTuples(allTuples, 'model');
    const vals = new Set(matched.map((t) => t.model));
    return [...vals].sort().map((v) => ({ value: v, label: v }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allTuples, hierarchy, JSON.stringify(filters)]);

  const specOptions: CustomSelectOption[] = useMemo(() => {
    if (!hierarchy) return [];
    const matched = filterTuples(allTuples, 'spec');
    const vals = new Set<string>();
    for (const t of matched) {
      const k = `${t.year}-${t.make.toLowerCase()}-${t.model.toLowerCase()}`;
      const items = hierarchy.specs[k] ?? [];
      items.forEach((v) => vals.add(v));
    }
    return [...vals].sort().map((v) => ({ value: v, label: v }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allTuples, hierarchy, JSON.stringify(filters)]);

  const transmissionOptions: CustomSelectOption[] = useMemo(() => {
    if (!hierarchy) return [];
    const matched = filterTuples(allTuples, 'transmission');
    const vals = new Set<string>();
    for (const t of matched) {
      const k = `${t.year}-${t.make.toLowerCase()}-${t.model.toLowerCase()}`;
      const items = hierarchy.transmissions[k] ?? [];
      items.forEach((v) => vals.add(v));
    }
    return [...vals].sort().map((v) => ({ value: v, label: v }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allTuples, hierarchy, JSON.stringify(filters)]);

  const driveTypeOptions: CustomSelectOption[] = useMemo(() => {
    if (!hierarchy) return [];
    const matched = filterTuples(allTuples, 'driveType');
    const vals = new Set<string>();
    for (const t of matched) {
      const k = `${t.year}-${t.make.toLowerCase()}-${t.model.toLowerCase()}`;
      const items = hierarchy.driveTypes[k] ?? [];
      items.forEach((v) => vals.add(v));
    }
    return [...vals].sort().map((v) => ({ value: v, label: v }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allTuples, hierarchy, JSON.stringify(filters)]);

  const categoryOptions: CustomSelectOption[] = useMemo(() => {
    if (!hierarchy) return [];
    const matched = filterTuples(allTuples, 'category');
    const vals = new Set<string>();
    for (const t of matched) {
      const k = `${t.year}-${t.make.toLowerCase()}-${t.model.toLowerCase()}`;
      const items = hierarchy.categories[k] ?? [];
      items.forEach((v) => vals.add(v));
    }
    return [...vals].sort().map((v) => ({ value: v, label: v }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allTuples, hierarchy, JSON.stringify(filters)]);

  const powertrainOptions: CustomSelectOption[] = useMemo(() => {
    if (!hierarchy) return [];
    const matched = filterTuples(allTuples, 'powertrain');
    const vals = new Set<string>();
    for (const t of matched) {
      const k = `${t.year}-${t.make.toLowerCase()}-${t.model.toLowerCase()}`;
      const items = hierarchy.powertrains[k] ?? [];
      items.forEach((v) => vals.add(v));
    }
    return [...vals].sort().map((v) => ({ value: v, label: v }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allTuples, hierarchy, JSON.stringify(filters)]);

  const vehicleTypeOptions: CustomSelectOption[] = useMemo(() => {
    if (!hierarchy) return [];
    const matched = filterTuples(allTuples, 'vehicleType');
    const vals = new Set<string>();
    for (const t of matched) {
      const k = `${t.year}-${t.make.toLowerCase()}-${t.model.toLowerCase()}`;
      const items = hierarchy.vehicleTypes[k] ?? [];
      items.forEach((v) => vals.add(v));
    }
    return [...vals].sort().map((v) => ({ value: v, label: v }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allTuples, hierarchy, JSON.stringify(filters)]);

  const bodyTypeOptions: CustomSelectOption[] = useMemo(() => {
    if (!hierarchy) return [];
    const matched = filterTuples(allTuples, 'bodyType');
    const vals = new Set<string>();
    for (const t of matched) {
      const k = `${t.year}-${t.make.toLowerCase()}-${t.model.toLowerCase()}`;
      const ymsk = filters.spec ? `${k}-${filters.spec.toLowerCase()}` : '';
      const fromSpec = ymsk ? hierarchy.bodyTypes[ymsk] ?? [] : [];
      const items = fromSpec.length > 0 ? fromSpec : (hierarchy.bodyTypes[k] ?? []);
      items.forEach((v) => vals.add(v));
    }
    return [...vals].sort().map((v) => ({ value: v, label: v }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allTuples, hierarchy, JSON.stringify(filters)]);

  const hasActiveFilters = Object.values(filters).some((v) => v !== undefined);
  const activeFilterCount = Object.values(filters).filter((v) => v !== undefined).length;

  const filterChips: { key: string; label: string }[] = [];
  if (filters.year) filterChips.push({ key: 'year', label: `Year: ${filters.year}` });
  if (filters.make) filterChips.push({ key: 'make', label: `Make: ${filters.make}` });
  if (filters.model) filterChips.push({ key: 'model', label: `Model: ${filters.model}` });
  if (filters.bodyType) filterChips.push({ key: 'bodyType', label: `Body: ${filters.bodyType}` });
  if (filters.transmission) filterChips.push({ key: 'transmission', label: `Trans: ${filters.transmission}` });
  if (filters.category) filterChips.push({ key: 'category', label: `Category: ${filters.category}` });
  if (filters.spec) filterChips.push({ key: 'spec', label: `Spec: ${filters.spec}` });
  if (filters.powertrain) filterChips.push({ key: 'powertrain', label: `Power: ${filters.powertrain}` });
  if (filters.vehicleType) filterChips.push({ key: 'vehicleType', label: `Type: ${filters.vehicleType}` });
  if (filters.minPrice) filterChips.push({ key: 'minPrice', label: `Min: $${Number(filters.minPrice).toLocaleString()}` });
  if (filters.maxPrice) filterChips.push({ key: 'maxPrice', label: `Max: $${Number(filters.maxPrice).toLocaleString()}` });

  return (
    <div className="rounded-2xl border bg-card shadow-lg">
      {/* Primary filters — always visible, all independent */}
      <div className="p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className={cn("flex-1 min-w-[140px] relative", openDropdown === 'year' ? 'z-50' : 'z-0')}>
            <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Year</label>
            <CustomSelect
              placeholder="All Years"
              options={yearOptions}
              value={filters.year}
              onChange={(v) => onFilterChange('year', v)}
              onOpenChange={(o) => setOpenDropdown(o ? 'year' : null)}
            />
          </div>
          <div className={cn("flex-1 min-w-[140px] relative", openDropdown === 'make' ? 'z-50' : 'z-0')}>
            <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Make</label>
            <CustomSelect
              placeholder="All Makes"
              options={makeOptions}
              value={filters.make}
              onChange={(v) => onFilterChange('make', v)}
              onOpenChange={(o) => setOpenDropdown(o ? 'make' : null)}
            />
          </div>
          <div className={cn("flex-1 min-w-[140px] relative", openDropdown === 'model' ? 'z-50' : 'z-0')}>
            <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Model</label>
            <CustomSelect
              placeholder="All Models"
              options={modelOptions}
              value={filters.model}
              onChange={(v) => onFilterChange('model', v)}
              onOpenChange={(o) => setOpenDropdown(o ? 'model' : null)}
            />
          </div>
          <div className="flex items-center gap-2 pb-0.5">
            <Button
              variant={expanded || hasActiveFilters ? "default" : "ghost"}
              size="sm"
              onClick={() => setExpanded(!expanded)}
            >
              <Filter className={cn(
                "mr-1.5 h-3.5 w-3.5 transition-transform duration-200",
                expanded && "rotate-180"
              )} />
              {expanded ? 'Fewer' : 'More'}
              {!expanded && activeFilterCount > 0 && (
                <span className="ml-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary-foreground/20 px-1 text-[10px] font-bold">
                  {activeFilterCount}
                </span>
              )}
            </Button>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={onReset}>
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                Reset
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Expandable advanced filters */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="advanced-filters"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
          >
            <div className="border-t border-border" />
            <div className="p-4">
              <span className="mb-3 block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">Advanced Filters</span>
              <div className="flex flex-wrap items-end gap-3">
                <div className={cn("flex-1 min-w-[140px] relative", openDropdown === 'bodyType' ? 'z-50' : 'z-0')}>
                  <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Body Type</label>
                  <CustomSelect placeholder="All Types" options={bodyTypeOptions} value={filters.bodyType} onChange={(v) => onFilterChange('bodyType', v)} onOpenChange={(o) => setOpenDropdown(o ? 'bodyType' : null)} />
                </div>
                <div className={cn("flex-1 min-w-[140px] relative", openDropdown === 'transmission' ? 'z-50' : 'z-0')}>
                  <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Transmission</label>
                  <CustomSelect placeholder="All" options={transmissionOptions} value={filters.transmission} onChange={(v) => onFilterChange('transmission', v)} onOpenChange={(o) => setOpenDropdown(o ? 'transmission' : null)} />
                </div>
                <div className={cn("flex-1 min-w-[140px] relative", openDropdown === 'category' ? 'z-50' : 'z-0')}>
                  <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Category</label>
                  <CustomSelect placeholder="All" options={categoryOptions} value={filters.category} onChange={(v) => onFilterChange('category', v)} onOpenChange={(o) => setOpenDropdown(o ? 'category' : null)} />
                </div>
                <div className={cn("flex-1 min-w-[140px] relative", openDropdown === 'driveType' ? 'z-50' : 'z-0')}>
                  <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Drive Type</label>
                  <CustomSelect placeholder="All" options={driveTypeOptions} value={filters.driveType} onChange={(v) => onFilterChange('driveType', v)} onOpenChange={(o) => setOpenDropdown(o ? 'driveType' : null)} />
                </div>
                <div className={cn("flex-1 min-w-[140px] relative", openDropdown === 'spec' ? 'z-50' : 'z-0')}>
                  <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Spec</label>
                  <CustomSelect placeholder="All" options={specOptions} value={filters.spec} onChange={(v) => onFilterChange('spec', v)} onOpenChange={(o) => setOpenDropdown(o ? 'spec' : null)} />
                </div>
                <div className={cn("flex-1 min-w-[140px] relative", openDropdown === 'powertrain' ? 'z-50' : 'z-0')}>
                  <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Powertrain</label>
                  <CustomSelect placeholder="All" options={powertrainOptions} value={filters.powertrain} onChange={(v) => onFilterChange('powertrain', v)} onOpenChange={(o) => setOpenDropdown(o ? 'powertrain' : null)} />
                </div>
                <div className={cn("flex-1 min-w-[140px] relative", openDropdown === 'vehicleType' ? 'z-50' : 'z-0')}>
                  <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Vehicle Type</label>
                  <CustomSelect placeholder="All" options={vehicleTypeOptions} value={filters.vehicleType} onChange={(v) => onFilterChange('vehicleType', v)} onOpenChange={(o) => setOpenDropdown(o ? 'vehicleType' : null)} />
                </div>
                <div className="flex-1 min-w-[140px]">
                  <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Min Price</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
                    <input type="number" placeholder="No min" value={filters.minPrice ?? ''} onChange={(e) => onFilterChange('minPrice', e.target.value || undefined)} className="flex h-10 w-full rounded-xl border border-input bg-card pl-6 pr-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" />
                  </div>
                </div>
                <div className="flex-1 min-w-[140px]">
                  <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Max Price</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
                    <input type="number" placeholder="No max" value={filters.maxPrice ?? ''} onChange={(e) => onFilterChange('maxPrice', e.target.value || undefined)} className="flex h-10 w-full rounded-xl border border-input bg-card pl-6 pr-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active filter chips */}
      <AnimatePresence>
        {filterChips.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-border"
          >
            <div className="flex flex-wrap items-center gap-1.5 px-4 py-2.5">
              {filterChips.map((chip) => (
                <span
                  key={chip.key}
                  className="inline-flex items-center gap-1 rounded-full border bg-primary/10 px-2.5 py-0.5 text-[10px] font-medium text-primary"
                >
                  {chip.label}
                  <button onClick={() => onFilterChange(chip.key, undefined)} className="ml-0.5 rounded-full p-0.5 opacity-60 transition-opacity hover:opacity-100">
                    <X className="h-2.5 w-2.5" />
                  </button>
                </span>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
// ─── Empty State ───────────────────────────────────────────────
function VehiclesEmptyState({ onReset }: { onReset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-muted">
        <AlertCircle className="h-10 w-10 text-muted-foreground" />
      </div>
      <p className="text-lg font-medium text-foreground">No vehicles found</p>
      <p className="mt-1 text-sm text-muted-foreground">Try adjusting your search or filters.</p>
      <Button variant="outline" size="sm" onClick={onReset} className="mt-4">
        <RotateCcw className="mr-1.5 h-3 w-3" />
        Clear filters
      </Button>
    </div>
  );
}

// ─── Vehicle Card (Grid View) ──────────────────────────────────
function VehicleCard({ vehicle, pricing, onClick }: {
  vehicle: Vehicle;
  pricing?: import('@types').VehiclePricing;
  onClick: () => void;
}) {
  const specBadgeColor = specColors[vehicle.spec] ?? '';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="group h-full"
    >
      <Card className="overflow-hidden border transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 h-full">
        {/* Gradient top bar */}
        <div className="h-1 bg-gradient-to-r from-primary/60 via-accent/60 to-primary/30" />
        <CardContent className="p-5 flex flex-col h-full">
          {/* Header row: year + spec badge */}
          <div className="flex items-center justify-between mb-4 shrink-0">
            <span className="inline-flex items-center rounded-full border bg-muted/50 px-2.5 py-0.5 text-xs font-medium text-foreground">
              {vehicle.year}
            </span>
            <Badge variant="outline" size="default" className={specBadgeColor}>
              {vehicle.spec}
            </Badge>
          </div>

          {/* Make & Model */}
          <h3 className="text-lg font-bold text-foreground leading-tight">
            {vehicle.make} {vehicle.model}
          </h3>

          {/* Details grid */}
          <div className="mt-4 grid grid-cols-2 gap-2">
            {[
              { icon: Cpu, label: 'Engine', value: `${vehicle.engineSize}L` },
              { icon: Gauge, label: 'HP', value: vehicle.horsepower },
              { icon: Cog, label: 'Trans', value: vehicle.transmission },
              { icon: Shield, label: 'Drive', value: vehicle.driveType },
            ].map((spec) => (
              <div key={spec.label} className="rounded-xl bg-muted/40 p-3 transition-colors hover:bg-muted/60">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <spec.icon className="h-3 w-3" />
                  <span className="text-[10px]">{spec.label}</span>
                </div>
                <p className="mt-0.5 text-sm font-semibold text-foreground">{spec.value}</p>
              </div>
            ))}
          </div>

          {/* Classification tags */}
          <div className="mt-3 flex flex-wrap items-center gap-1.5 shrink-0">
            <span className="inline-flex items-center rounded-lg border bg-card px-2 py-0.5 text-[10px] text-muted-foreground">
              <Car className="mr-1 h-2.5 w-2.5" />
              {vehicle.bodyType}
            </span>
            <span className="inline-flex items-center rounded-lg border bg-card px-2 py-0.5 text-[10px] text-muted-foreground">
              <Layers className="mr-1 h-2.5 w-2.5" />
              {vehicle.category}
            </span>
            <span className="inline-flex items-center rounded-lg border bg-card px-2 py-0.5 text-[10px] text-muted-foreground">
              <Zap className="mr-1 h-2.5 w-2.5" />
              {vehicle.powertrain}
            </span>
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Bottom: price + actions */}
          <div className="mt-4 flex items-center justify-between border-t pt-4 shrink-0">
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Market Price</p>
              <p className="text-lg font-bold text-primary">
                {pricing?.averagePrice ? formatCurrency(pricing.averagePrice) : '—'}
              </p>
              {pricing && (
                <p className="text-[10px] text-muted-foreground">
                  {formatCurrency(pricing.minimumPrice)} — {formatCurrency(pricing.maximumPrice)}
                </p>
              )}
            </div>
            <Button variant="ghost" size="icon-sm" title="View details" onClick={onClick}>
              <Eye className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ─── Main Page ───────────────────────────────────────────────
export function AdminVehiclesPage() {
  const { filters, sort, page, pageSize, setSort, setPage, setPageSize, resetFilters } = useVehicleStore();
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [localFilters, setLocalFilters] = useState<Record<string, string | undefined>>({
    year: filters.year ? String(filters.year) : undefined,
    make: filters.make,
    model: filters.model,
    bodyType: filters.bodyType,
    transmission: filters.transmission,
    category: filters.category,
    spec: filters.spec,
    powertrain: filters.powertrain,
    vehicleType: filters.vehicleType,
    minPrice: filters.minPrice ? String(filters.minPrice) : undefined,
    maxPrice: filters.maxPrice ? String(filters.maxPrice) : undefined,
  });

  const queryFilters = useMemo(() => ({
    ...filters,
    search: debouncedSearch || undefined,
    year: localFilters.year ? Number(localFilters.year) : undefined,
    make: localFilters.make,
    model: localFilters.model,
    bodyType: localFilters.bodyType as Vehicle['bodyType'] | undefined,
    transmission: localFilters.transmission as Vehicle['transmission'] | undefined,
    category: localFilters.category as Vehicle['category'] | undefined,
    spec: localFilters.spec,
    powertrain: localFilters.powertrain as Vehicle['powertrain'] | undefined,
    vehicleType: localFilters.vehicleType as Vehicle['vehicleType'] | undefined,
    minPrice: localFilters.minPrice ? Number(localFilters.minPrice) : undefined,
    maxPrice: localFilters.maxPrice ? Number(localFilters.maxPrice) : undefined,
  }), [filters, search, localFilters]);

  const { data, isLoading } = useVehicles(queryFilters, sort, page, pageSize);

  // ── Batch pricing (eliminates N+1 individual usePricing hooks) ──
  const vehicleIds = useMemo(() => data?.vehicles.map((v) => v.id) ?? [], [data?.vehicles]);
  const { data: pricingMap } = useBatchPricing(vehicleIds);

  const handleSort = useCallback(
    (field: typeof sort.field) => {
      setSort({
        field,
        direction: sort.field === field && sort.direction === 'asc' ? 'desc' : 'asc',
      });
    },
    [sort, setSort],
  );

  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / pageSize));

  const SortIcon = ({ field }: { field: typeof sort.field }) => {
    if (sort.field !== field) return <ArrowUpDown className="ml-1 h-3 w-3 text-muted-foreground/50" />;
    return (
      <ArrowUpDown
        className={`ml-1 h-3 w-3 transition-transform ${
          sort.direction === 'asc' ? 'rotate-180' : ''
        } text-primary`}
      />
    );
  };

  const handleFilterChange = useCallback((key: string, value: string | undefined) => {
    setLocalFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  }, [setPage]);

  const handleResetFilters = useCallback(() => {
    setLocalFilters({});
    resetFilters();
    setSearch('');
    setPage(1);
  }, [resetFilters, setPage]);

  const handleExportCSV = useCallback(() => {
    const vehicles = data?.vehicles;
    if (!vehicles || !vehicles.length) return;
    const headers = ['#', 'Year', 'Make', 'Model', 'Spec', 'Body Type', 'Engine', 'Horsepower', 'Transmission', 'Drive Type', 'Category', 'Price'];
    const rows = vehicles.map((v, i) => [
      (page - 1) * pageSize + i + 1,
      v.year, v.make, v.model, v.spec, v.bodyType,
      `${v.engineSize}L`, v.horsepower,
      v.transmission, v.driveType, v.category,
      pricingMap?.get(v.id) ? pricingMap.get(v.id)!.averagePrice : '',
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vehicles-page-${page}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [data?.vehicles, page, pageSize, pricingMap]);

  const getPageNumbers = useCallback(() => {
    const pages: (number | 'ellipsis')[] = [];
    const maxVisible = 5;
    if (totalPages <= maxVisible + 2) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      let start = Math.max(2, page - 1);
      let end = Math.min(totalPages - 1, page + 1);
      if (start > 2) pages.push('ellipsis');
      for (let i = start; i <= end; i++) pages.push(i);
      if (end < totalPages - 1) pages.push('ellipsis');
      pages.push(totalPages);
    }
    return pages;
  }, [totalPages, page]);

  return (
    <motion.div
      className="space-y-5"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
      <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Vehicles</h1>
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{formatNumber(data?.total ?? 0)}</span> vehicles in the database
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex items-center rounded-lg border bg-card p-0.5">
            <button
              onClick={() => setViewMode('table')}
              className={cn(
                'flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-all',
                viewMode === 'table'
                  ? 'bg-primary/10 text-primary shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
              title="Table view"
            >
              <LayoutList className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Table</span>
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={cn(
                'flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-all',
                viewMode === 'grid'
                  ? 'bg-primary/10 text-primary shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
              title="Grid view"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Grid</span>
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/50" />
            <Input
              placeholder="Search vehicles..."
              className="w-48 md:w-64 pl-9"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={!data?.vehicles.length} title="Export vehicles as CSV">
            <Download className="mr-1.5 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Filter bar */}
      <FilterBar
        filters={localFilters}
        onFilterChange={handleFilterChange}
        onReset={handleResetFilters}
      />

      {/* Table / Grid toggle */}
      {viewMode === 'table' ? (
        /* ── Table View ── */
        <div className="rounded-2xl border bg-card">
          {isLoading ? (
            <div className="p-6">
              <SkeletonTable rows={10} cols={9} />
            </div>
          ) : data?.vehicles && data.vehicles.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="px-4 py-3.5 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">#</th>
                    <th className="px-4 py-3.5 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      <span className="inline-flex cursor-pointer items-center gap-1 transition-colors hover:text-foreground" onClick={() => handleSort('year')}>
                        Year <SortIcon field="year" />
                      </span>
                    </th>
                    <th className="px-4 py-3.5 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      <span className="inline-flex cursor-pointer items-center gap-1 transition-colors hover:text-foreground" onClick={() => handleSort('make')}>
                        Make <SortIcon field="make" />
                      </span>
                    </th>
                    <th className="px-4 py-3.5 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      <span className="inline-flex cursor-pointer items-center gap-1 transition-colors hover:text-foreground" onClick={() => handleSort('model')}>
                        Model <SortIcon field="model" />
                      </span>
                    </th>
                    <th className="px-4 py-3.5 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">Spec</th>
                    <th className="px-4 py-3.5 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">Body</th>
                    <th className="px-4 py-3.5 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">Engine</th>
                    <th className="px-4 py-3.5 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">HP</th>
                    <th className="px-4 py-3.5 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      <span className="inline-flex cursor-pointer items-center gap-1 transition-colors hover:text-foreground" onClick={() => handleSort('price')}>
                        Price <SortIcon field="price" />
                      </span>
                    </th>
                    <th className="px-4 py-3.5 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data.vehicles.map((vehicle, i) => (
                    <tr
                      key={vehicle.id}
                      className="group/row transition-colors hover:bg-muted/50"
                    >
                      <td className="px-4 py-3 text-center text-xs text-muted-foreground">
                        {(page - 1) * pageSize + i + 1}
                      </td>
                      <td className="px-4 py-3 text-center font-semibold text-foreground">
                        {vehicle.year}
                      </td>
                      <td className="px-4 py-3 text-center font-medium text-foreground">
                        {vehicle.make}
                      </td>
                      <td className="px-4 py-3 text-center text-foreground">
                        {vehicle.model}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant="outline" size="default" className={specColors[vehicle.spec] ?? ''}>
                          {vehicle.spec}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-center text-xs text-foreground">
                        {vehicle.bodyType}
                      </td>
                      <td className="px-4 py-3 text-center text-xs text-muted-foreground">
                        {vehicle.engineSize}L
                      </td>
                      <td className="px-4 py-3 text-center text-xs text-muted-foreground">
                        {vehicle.horsepower}
                      </td>
                      <td className="px-4 py-3 text-center font-medium text-foreground">
                        {pricingMap?.get(vehicle.id)?.averagePrice ? formatCurrency(pricingMap.get(vehicle.id)!.averagePrice) : '—'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1 opacity-0 group-hover/row:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon-sm" title="View details" onClick={() => setSelectedVehicle(vehicle)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <VehiclesEmptyState onReset={handleResetFilters} />
          )}
        </div>
      ) : (
        /* ── Grid / Card View ── */
        <div className="rounded-2xl">
          {isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-[320px] animate-pulse rounded-2xl border bg-card p-5">
                  <div className="mb-4 h-4 w-20 rounded bg-muted" />
                  <div className="mb-2 h-6 w-40 rounded bg-muted" />
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    {Array.from({ length: 4 }).map((_, j) => (
                      <div key={j} className="h-16 rounded-xl bg-muted/50" />
                    ))}
                  </div>
                  <div className="mt-3 h-4 w-24 rounded bg-muted/50" />
                  <div className="mt-4 flex items-center justify-between pt-4">
                    <div className="h-8 w-24 rounded bg-muted" />
                    <div className="h-8 w-8 rounded bg-muted" />
                  </div>
                </div>
              ))}
            </div>
          ) : data?.vehicles && data.vehicles.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {data.vehicles.map((vehicle) => (
                <VehicleCard
                  key={vehicle.id}
                  vehicle={vehicle}
                  pricing={pricingMap?.get(vehicle.id)}
                  onClick={() => setSelectedVehicle(vehicle)}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border bg-card">
              <VehiclesEmptyState onReset={handleResetFilters} />
            </div>
          )}
        </div>
      )}

      {/* Pagination */}
      <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
        <div className="flex items-center gap-3">
          <p className="text-sm text-muted-foreground">
            Page <span className="text-foreground">{page}</span> of <span className="text-foreground">{totalPages}</span>
            <span className="mx-2 text-muted-foreground/30">·</span>
            <span>{formatNumber(data?.total ?? 0)} total</span>
          </p>
          <div className="flex items-center gap-1.5">
            <label className="text-[10px] text-muted-foreground">Rows:</label>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="rounded-md border bg-background px-2 py-1 text-xs text-foreground outline-none focus:border-primary/50"
            >
              {[10, 20, 50, 100].map((size) => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(1)} title="First page">
            <ChevronLeft className="h-3.5 w-3.5" />
            <ChevronLeft className="-ml-2 h-3.5 w-3.5" />
          </Button>
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-1">
            {getPageNumbers().map((pageNum, idx) =>
              pageNum === 'ellipsis' ? (
                <span key={`e-${idx}`} className="px-1 text-muted-foreground">…</span>
              ) : (
                <Button
                  key={pageNum}
                  variant={page === pageNum ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPage(pageNum)}
                  className={page === pageNum ? 'min-w-[32px]' : 'min-w-[32px]'}
                >
                  {pageNum}
                </Button>
              )
            )}
          </div>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(totalPages)} title="Last page">
            <ChevronRight className="h-3.5 w-3.5" />
            <ChevronRight className="-ml-2 h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {selectedVehicle && (
        <VehicleDetailDialog
          vehicle={selectedVehicle}
          isOpen={!!selectedVehicle}
          onClose={() => setSelectedVehicle(null)}
        />
      )}
    </motion.div>
  );
}
