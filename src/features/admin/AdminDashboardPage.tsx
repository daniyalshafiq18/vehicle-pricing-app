import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useDashboardAnalytics, useInquiries, useMissingVehicleRequests } from '@hooks';
import { useDashboardStore } from '@stores';
import { Card, CardContent, LazyChart, LoadingScreen } from '@components/ui';
import { formatNumber, cn } from '@utils';
import {
  Car, BarChart3, ArrowDownRight,
  Activity, Clock, Sparkles,
  Layers, MessageSquare, FileQuestion,
} from 'lucide-react';
import { PremiumLeaderboard } from './dashboard/PremiumLeaderboard';
import { VehicleIntelligenceModal } from './dashboard/VehicleIntelligenceModal';
import {
  TopMakesChart,
  BodyTypeChart,
  ValueTrendChart,
  PowertrainChart,
  TopModelsChart,
} from './dashboard';

// ─── KPI Config ──────────────────────────────────────
interface KPICardStyle {
  gradient: string;
  iconBg: string;
  iconColor: string;
  accent: string;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.04 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0 },
};

// ═════════════════════════════════════════════════════
// DASHBOARD PAGE
// ═════════════════════════════════════════════════════
export function AdminDashboardPage() {
  const navigate = useNavigate();
  const {
    overview, premiumLeaderboard,
    topMakes, bodyTypeDistribution,
    valueTrend,
    powertrainComposition,
    topModels,
    totalFiltered, totalUnfiltered,
    isLoading, error,
  } = useDashboardAnalytics();

  const { data: inquiries } = useInquiries();
  const { data: missingVehicles } = useMissingVehicleRequests();

  const openModal = useDashboardStore((s) => s.openModal);

  if (isLoading) {
    return <LoadingScreen message="Loading dashboard analytics..." />;
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
        {(() => {
          const kpiStylesMap: Record<string, KPICardStyle> = {
            'TOTAL VEHICLES': { gradient: 'from-blue-500/20 to-blue-600/5', iconBg: 'bg-blue-500/10', iconColor: 'text-blue-600 dark:text-blue-400', accent: 'bg-blue-500' },
            'TOTAL MAKES': { gradient: 'from-violet-500/20 to-violet-600/5', iconBg: 'bg-violet-500/10', iconColor: 'text-violet-600 dark:text-violet-400', accent: 'bg-violet-500' },
            'TOTAL MODELS': { gradient: 'from-emerald-500/20 to-emerald-600/5', iconBg: 'bg-emerald-500/10', iconColor: 'text-emerald-600 dark:text-emerald-400', accent: 'bg-emerald-500' },
            'BODY TYPES': { gradient: 'from-pink-500/20 to-pink-600/5', iconBg: 'bg-pink-500/10', iconColor: 'text-pink-600 dark:text-pink-400', accent: 'bg-pink-500' },
            'QUERIES': { gradient: 'from-sky-500/20 to-sky-600/5', iconBg: 'bg-sky-500/10', iconColor: 'text-sky-600 dark:text-sky-400', accent: 'bg-sky-500' },
            'MISSING VEHICLES': { gradient: 'from-orange-500/20 to-orange-600/5', iconBg: 'bg-orange-500/10', iconColor: 'text-orange-600 dark:text-orange-400', accent: 'bg-orange-500' },
          };
          const bodyTypeNames = bodyTypeDistribution.map(b => b.bodyType).join(', ');
          const inquiriesCount = inquiries?.length ?? 0;
          const missingVehiclesCount = missingVehicles?.length ?? 0;

          const kpiCards = [
            { label: 'TOTAL VEHICLES', value: formatNumber(overview.totalVehicles), icon: Car, subtitle: 'In database', linkTo: '/admin/vehicles' },
            { label: 'TOTAL MAKES', value: formatNumber(overview.totalMakes), icon: BarChart3, subtitle: 'Manufacturers', linkTo: '/admin/vehicles' },
            { label: 'TOTAL MODELS', value: formatNumber(overview.totalModels), icon: Activity, subtitle: 'Unique models', linkTo: '/admin/vehicles' },
            { label: 'BODY TYPES', value: formatNumber(bodyTypeDistribution.length), icon: Layers, subtitle: bodyTypeNames.length > 35 ? bodyTypeNames.slice(0, 35) + '...' : bodyTypeNames, linkTo: '/admin/vehicles' },
            { label: 'QUERIES', value: formatNumber(inquiriesCount), icon: MessageSquare, subtitle: 'All inquiries', linkTo: '/admin/queries' },
            { label: 'MISSING VEHICLES', value: formatNumber(missingVehiclesCount), icon: FileQuestion, subtitle: 'Vehicle requests', linkTo: '/admin/missing-vehicles' },
          ];
          return (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              {kpiCards.map((kpi) => {
                const style = kpiStylesMap[kpi.label] as KPICardStyle;
                return (
                  <motion.div
                    key={kpi.label}
                    variants={itemVariants}
                    className="group cursor-pointer"
                    onClick={() => navigate(kpi.linkTo)}
                    tabIndex={0}
                    role="button"
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(kpi.linkTo); } }}
                  >
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
                          <p className="text-xl font-bold tracking-tight text-foreground">{kpi.value}</p>
                        </div>
                        <p className="mt-0.5 text-[10px] text-muted-foreground/60">{kpi.subtitle}</p>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          );
        })()}
      </motion.div>

      {/* ── Section 1: Top Makes + Top Models ──────── */}
      <motion.div
        variants={itemVariants}
        className="grid gap-4 md:grid-cols-2"
      >
        <LazyChart height={320} rootMargin="200px">
          <TopMakesChart data={topMakes} />
        </LazyChart>
        <LazyChart height={320} rootMargin="200px">
          <TopModelsChart data={topModels} />
        </LazyChart>
      </motion.div>

      {/* ── Section 2: Body Types + Powertrain ──────── */}
      <motion.div
        variants={itemVariants}
        className="grid gap-4 md:grid-cols-2"
      >
        <LazyChart height={320} rootMargin="200px">
          <BodyTypeChart data={bodyTypeDistribution} />
        </LazyChart>
        <LazyChart height={320} rootMargin="200px">
          <PowertrainChart data={powertrainComposition} />
        </LazyChart>
      </motion.div>

      {/* ── Section 3: Price by Model Year (full width) ── */}
      <motion.div variants={itemVariants}>
        <LazyChart height={380} rootMargin="300px">
          <ValueTrendChart data={valueTrend} />
        </LazyChart>
      </motion.div>

      {/* ── Premium Vehicle Leaderboard ── */}
      <motion.div variants={itemVariants}>
        <LazyChart height={500} rootMargin="300px">
          <Card className="overflow-hidden border">
            <div className="h-1 bg-gradient-to-r from-amber-500/60 to-orange-500/60" />
            <CardContent className="p-6">
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
