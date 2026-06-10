import { motion } from 'framer-motion';
import { useDashboardAnalytics } from '@hooks';
import { useDashboardStore } from '@stores';
import { Card, CardContent, LazyChart } from '@components/ui';
import { formatCurrency, formatNumber, cn } from '@utils';
import {
  Car, BarChart3, DollarSign, ArrowUpRight, ArrowDownRight,
  Activity, Clock, Sparkles,
} from 'lucide-react';
import {
  TopMakesChart,
  PriceDistributionChart,
  ValueTrendChart,
  PowertrainDonutChart,
  PerformanceScatterChart,
  BodyTypeBarChart,
  AgeDistributionChart,
  VolatilityBoxChart,
  TopModelsChart,
} from './dashboard/charts';
import { PremiumLeaderboard } from './dashboard/PremiumLeaderboard';
import { VehicleIntelligenceModal } from './dashboard/VehicleIntelligenceModal';

// ─── KPI Config ──────────────────────────────────────
interface KPICardStyle {
  gradient: string;
  iconBg: string;
  iconColor: string;
  accent: string;
}

const kpiStyles: Record<string, KPICardStyle> = {
  'TOTAL VEHICLES': { gradient: 'from-blue-500/20 to-blue-600/5', iconBg: 'bg-blue-500/10', iconColor: 'text-blue-600 dark:text-blue-400', accent: 'bg-blue-500' },
  'TOTAL MAKES': { gradient: 'from-violet-500/20 to-violet-600/5', iconBg: 'bg-violet-500/10', iconColor: 'text-violet-600 dark:text-violet-400', accent: 'bg-violet-500' },
  'TOTAL MODELS': { gradient: 'from-emerald-500/20 to-emerald-600/5', iconBg: 'bg-emerald-500/10', iconColor: 'text-emerald-600 dark:text-emerald-400', accent: 'bg-emerald-500' },
  'HIGHEST VALUE': { gradient: 'from-amber-500/20 to-amber-600/5', iconBg: 'bg-amber-500/10', iconColor: 'text-amber-600 dark:text-amber-400', accent: 'bg-amber-500' },
  'AVG MARKET PRICE': { gradient: 'from-rose-500/20 to-rose-600/5', iconBg: 'bg-rose-500/10', iconColor: 'text-rose-600 dark:text-rose-400', accent: 'bg-rose-500' },
  'LOWEST VALUE': { gradient: 'from-teal-500/20 to-teal-600/5', iconBg: 'bg-teal-500/10', iconColor: 'text-teal-600 dark:text-teal-400', accent: 'bg-teal-500' },
};

const kpiConfig = [
  { label: 'TOTAL VEHICLES', value: (o: any) => formatNumber(o.totalVehicles), icon: Car, subtitle: 'In database' },
  { label: 'TOTAL MAKES', value: (o: any) => formatNumber(o.totalMakes), icon: BarChart3, subtitle: 'Manufacturers' },
  { label: 'TOTAL MODELS', value: (o: any) => formatNumber(o.totalModels), icon: Activity, subtitle: 'Unique models' },
  { label: 'HIGHEST VALUE', value: (o: any) => formatCurrency(o.highestVehicleValue), icon: ArrowUpRight, subtitle: 'Top market price' },
  { label: 'AVG MARKET PRICE', value: (o: any) => formatCurrency(o.averageMarketPrice), icon: DollarSign, subtitle: 'Across all vehicles' },
  { label: 'LOWEST VALUE', value: (o: any) => formatCurrency(o.lowestVehicleValue), icon: ArrowDownRight, subtitle: 'Bottom market price' },
];

// ─── Animations ──────────────────────────────────────
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.04 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0 },
};

function KPICardSkeleton() {
  return (
    <div className="rounded-2xl border bg-card p-5">
      <div className="animate-pulse space-y-3">
        <div className="h-3 w-24 rounded bg-muted" />
        <div className="h-7 w-20 rounded bg-muted" />
      </div>
    </div>
  );
}

// ─── Section Wrapper ─────────────────────────────────
function ChartSection({ title, subtitle, badge, children, className = '' }: {
  title: string;
  subtitle?: string;
  badge?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div variants={itemVariants} className={className}>
      <Card className="overflow-hidden border h-full">
        <div className="h-1 bg-gradient-to-r from-primary/60 to-accent/60" />
        <CardContent className="p-5 flex flex-col h-full">
          <div className="mb-4 flex items-center justify-between shrink-0">
            <div>
              <h3 className="text-sm font-semibold text-foreground">{title}</h3>
              {subtitle && <p className="text-[10px] text-muted-foreground mt-0.5">{subtitle}</p>}
            </div>
            {badge && (
              <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-medium text-primary">{badge}</span>
            )}
          </div>
          <div className="flex-1 min-h-0">
            {children}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ═════════════════════════════════════════════════════
// DASHBOARD PAGE
// ═════════════════════════════════════════════════════
export function AdminDashboardPage() {
  const {
    overview, topMakes, priceDistribution, valueTrend,
    powertrainComposition, scatterData, bodyTypeDistribution,
    ageDistribution, boxPlot, topModels, premiumLeaderboard,
    totalFiltered, totalUnfiltered,
    isLoading, error,
  } = useDashboardAnalytics();

  const openModal = useDashboardStore((s) => s.openModal);
  const setFilter = useDashboardStore((s) => s.setFilter);

  if (isLoading) {
    return (
      <motion.div className="space-y-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
        <div className="animate-pulse space-y-2">
          <div className="h-8 w-48 rounded-lg bg-muted" />
          <div className="h-4 w-72 rounded bg-muted/50" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => <KPICardSkeleton key={i} />)}
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-2xl border bg-card p-5">
              <div className="mb-4 h-5 w-32 rounded bg-muted" />
              <div className="h-72 rounded-lg bg-muted/50" />
            </div>
          ))}
        </div>
      </motion.div>
    );
  }

  if (error || !overview) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10">
          <ArrowDownRight className="h-8 w-8 text-destructive" />
        </div>
        <p className="text-lg font-medium text-foreground">Failed to load analytics</p>
        <p className="mt-1 text-sm text-muted-foreground">Try refreshing the page or check your data source.</p>
      </div>
    );
  }

  return (
    <motion.div className="space-y-6" variants={containerVariants} initial="hidden" animate="visible">
      {/* ── Header ──────────────────────────────────── */}
      <motion.div variants={itemVariants}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Dashboard</h1>
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{formatNumber(overview.totalVehicles)}</span> vehicles across{' '}
              <span className="font-medium text-foreground">{formatNumber(overview.totalMakes)}</span> makes ·{' '}
              {totalFiltered !== totalUnfiltered && (
                <span className="text-primary">Filtered: {formatNumber(totalFiltered)} vehicles · </span>
              )}
              <span className="text-muted-foreground/60">
                Updated {new Date(overview.lastUpdated).toLocaleDateString()}
              </span>
            </p>
          </div>
        </div>
      </motion.div>

      {/* ── KPI Cards ──────────────────────────────── */}
      <motion.div variants={itemVariants}>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {kpiConfig.map((kpi) => {
            const val = kpi.value(overview);
            const style: KPICardStyle = kpiStyles[kpi.label] as KPICardStyle;
            return (
              <motion.div key={kpi.label} variants={itemVariants} className="group">
                <Card className="relative h-full overflow-hidden border transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                  {/* Top accent bar */}
                  <div className={cn('h-1 bg-gradient-to-r', style.gradient)} />
                  <CardContent className="relative flex h-full flex-col p-4 pt-3.5">
                    {/* Decorative background */}
                    <div className={cn('absolute right-0 top-0 h-24 w-24 -translate-y-6 translate-x-6 rounded-full opacity-[0.03] transition-transform duration-500 group-hover:scale-150', style.accent)} />
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
                        {kpi.label}
                      </span>
                      <div className={cn('flex h-8 w-8 items-center justify-center rounded-xl transition-all duration-300 group-hover:scale-110 group-hover:shadow-sm', style.iconBg)}>
                        <kpi.icon className={cn('h-4 w-4', style.iconColor)} />
                      </div>
                    </div>
                    <div className="mt-3 flex items-baseline gap-2">
                      <p className="text-xl font-bold tracking-tight text-foreground">{val}</p>
                    </div>
                    <p className="mt-0.5 text-[10px] text-muted-foreground/60">{kpi.subtitle}</p>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* ── Section 1: Top Makes + Section 2: Price Distribution ── */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ChartSection title="Top Vehicle Makes" subtitle="Highest inventory count by manufacturer" badge="Top 10">
          <LazyChart immediate height={280}>
            <TopMakesChart
              data={topMakes}
              onBarClick={(make) => setFilter('make', make)}
            />
          </LazyChart>
        </ChartSection>
        <ChartSection title="Price Distribution" subtitle="Vehicle count by market price range" badge="Histogram">
          <LazyChart immediate height={280}>
            <PriceDistributionChart data={priceDistribution} />
          </LazyChart>
        </ChartSection>
      </div>

      {/* ── Section 3: Value Trend + Section 4: Powertrain Donut ── */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ChartSection title="Vehicle Value Trend" subtitle="Average price by model year" badge="Trend">
          <LazyChart immediate height={280}>
            <ValueTrendChart data={valueTrend} />
          </LazyChart>
        </ChartSection>
        <ChartSection title="Powertrain Composition" subtitle="Market share by fuel/powertrain type" badge="Donut">
          <LazyChart immediate height={280}>
            <PowertrainDonutChart data={powertrainComposition} />
          </LazyChart>
        </ChartSection>
      </div>

      {/* ── Section 5: Performance vs Value (full width) ── */}
      <div className="grid gap-6 lg:grid-cols-1">
        <ChartSection title="Performance vs Value" subtitle="How horsepower relates to market price" badge="Scatter">
          <LazyChart height={280}>
            <PerformanceScatterChart
              data={scatterData}
              onDotClick={(vehicleId) => openModal(vehicleId)}
            />
          </LazyChart>
        </ChartSection>
      </div>

      {/* ── Section 6: Category + Section 7: Age Distribution ── */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ChartSection title="Vehicle Category Distribution" subtitle="Inventory composition by body type" badge="Top 10">
          <LazyChart height={280}>
            <BodyTypeBarChart data={bodyTypeDistribution} />
          </LazyChart>
        </ChartSection>
        <ChartSection title="Vehicle Age Distribution" subtitle="How old is the current inventory" badge="Area">
          <LazyChart height={280}>
            <AgeDistributionChart
              data={ageDistribution}
              onDotClick={(year) => setFilter('year', year)}
            />
          </LazyChart>
        </ChartSection>
      </div>

      {/* ── Section 8: Price Volatility + Section 9: Top Models ── */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ChartSection title="Price Volatility Analysis" subtitle="Min, median, and max prices by category" badge="Range">
          <LazyChart height={280}>
            <VolatilityBoxChart data={boxPlot} />
          </LazyChart>
        </ChartSection>
        <ChartSection title="Top Vehicle Models" subtitle="Most frequent models by inventory count" badge="Top 10">
          <LazyChart height={280}>
            <TopModelsChart
              data={topModels}
              onBarClick={(model) => setFilter('model', model)}
            />
          </LazyChart>
        </ChartSection>
      </div>

      {/* ── Section 10: Premium Vehicle Leaderboard ── */}
      <motion.div variants={itemVariants}>
        <LazyChart height={400} rootMargin="300px">
          <Card className="overflow-hidden border">
            <div className="h-1 bg-gradient-to-r from-amber-500/60 to-amber-400/60" />
            <CardContent className="p-5">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Premium Vehicle Leaderboard</h3>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Top {premiumLeaderboard.length} vehicles by market value
                  </p>
                </div>
                <span className="rounded-full bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-400">Top 100</span>
              </div>
              <PremiumLeaderboard
                data={premiumLeaderboard}
                onVehicleSelect={(vehicleId) => openModal(vehicleId)}
              />
            </CardContent>
          </Card>
        </LazyChart>
      </motion.div>

      {/* ── Footer ─────────────────────────────────── */}
      <motion.div variants={itemVariants}>
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground/60">
          <Clock className="h-3 w-3" />
          <span>Last updated: {new Date(overview.lastUpdated).toLocaleDateString('en-US', {
            year: 'numeric', month: 'long', day: 'numeric',
            hour: '2-digit', minute: '2-digit',
          })}</span>
          <span className="mx-2">·</span>
          <Sparkles className="h-3 w-3" />
          <span>Live analytics · {formatNumber(totalFiltered)} vehicles displayed</span>
        </div>
      </motion.div>

      {/* ── Vehicle Intelligence Modal ──────────────── */}
      <VehicleIntelligenceModal />
    </motion.div>
  );
}
