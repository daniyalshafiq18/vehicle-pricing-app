import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useDashboardAnalytics, useInquiries, useMissingVehicleRequests } from '@hooks';
import { useDashboardStore } from '@stores';
import { Card, CardContent, LazyChart, LoadingScreen } from '@components/ui';
import { formatNumber, cn } from '@utils';
import {
  Car, BarChart3, ArrowDownRight,
  Activity, Clock, Sparkles, X,
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
  headingColor: string;
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

  // ─── Active view toggle (queries / missing vehicles status breakdown) ──
  const [activeView, setActiveView] = useState<'default' | 'queries' | 'missing_vehicles'>('default');

  const inquiriesByStatus = useMemo(() => {
    if (!inquiries) return [];
    const counts: Record<string, number> = {};
    inquiries.forEach((inq) => {
      const s = inq.status.charAt(0).toUpperCase() + inq.status.slice(1);
      counts[s] = (counts[s] || 0) + 1;
    });
    return Object.entries(counts).map(([status, count]) => ({ status, count }));
  }, [inquiries]);

  const missingVehiclesByStatus = useMemo(() => {
    if (!missingVehicles) return [];
    const counts: Record<string, number> = {};
    missingVehicles.forEach((mv) => {
      const s = mv.status || 'Unknown';
      counts[s] = (counts[s] || 0) + 1;
    });
    return Object.entries(counts).map(([status, count]) => ({ status, count }));
  }, [missingVehicles]);

  const STATUS_COLORS: Record<string, string> = {
    Pending: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800/50',
    Approved: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800/50',
    'In Progress': 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800/50',
    Reject: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800/50',
    Reviewed: 'bg-sky-100 text-sky-800 border-sky-200 dark:bg-sky-900/30 dark:text-sky-300 dark:border-sky-800/50',
    Contacted: 'bg-violet-100 text-violet-800 border-violet-200 dark:bg-violet-900/30 dark:text-violet-300 dark:border-violet-800/50',
    Closed: 'bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800/50 dark:text-slate-300 dark:border-slate-700',
    Unknown: 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800/50 dark:text-gray-300 dark:border-gray-700',
  };

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
            'TOTAL VEHICLES': { gradient: 'from-blue-500/20 to-blue-600/5', iconBg: 'bg-blue-500/10', iconColor: 'text-blue-600 dark:text-blue-400', accent: 'bg-blue-500', headingColor: 'text-blue-600/80 dark:text-blue-400/80' },
            'TOTAL MAKES': { gradient: 'from-violet-500/20 to-violet-600/5', iconBg: 'bg-violet-500/10', iconColor: 'text-violet-600 dark:text-violet-400', accent: 'bg-violet-500', headingColor: 'text-violet-600/80 dark:text-violet-400/80' },
            'TOTAL MODELS': { gradient: 'from-emerald-500/20 to-emerald-600/5', iconBg: 'bg-emerald-500/10', iconColor: 'text-emerald-600 dark:text-emerald-400', accent: 'bg-emerald-500', headingColor: 'text-emerald-600/80 dark:text-emerald-400/80' },
            'BODY TYPES': { gradient: 'from-pink-500/20 to-pink-600/5', iconBg: 'bg-pink-500/10', iconColor: 'text-pink-600 dark:text-pink-400', accent: 'bg-pink-500', headingColor: 'text-pink-600/80 dark:text-pink-400/80' },
            'QUERIES': { gradient: 'from-sky-500/20 to-sky-600/5', iconBg: 'bg-sky-500/10', iconColor: 'text-sky-600 dark:text-sky-400', accent: 'bg-sky-500', headingColor: 'text-sky-600/80 dark:text-sky-400/80' },
            'MISSING VEHICLES': { gradient: 'from-orange-500/20 to-orange-600/5', iconBg: 'bg-orange-500/10', iconColor: 'text-orange-600 dark:text-orange-400', accent: 'bg-orange-500', headingColor: 'text-orange-600/80 dark:text-orange-400/80' },
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
                    className={cn(
                      'group cursor-pointer',
                      activeView === 'queries' && kpi.label === 'QUERIES' && 'ring-2 ring-sky-400/50 rounded-xl',
                      activeView === 'missing_vehicles' && kpi.label === 'MISSING VEHICLES' && 'ring-2 ring-orange-400/50 rounded-xl',
                    )}
                    onClick={() => {
                      if (kpi.label === 'QUERIES') {
                        setActiveView((prev) => (prev === 'queries' ? 'default' : 'queries'));
                      } else if (kpi.label === 'MISSING VEHICLES') {
                        setActiveView((prev) => (prev === 'missing_vehicles' ? 'default' : 'missing_vehicles'));
                      } else {
                        navigate(kpi.linkTo);
                      }
                    }}
                    tabIndex={0}
                    role="button"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        if (kpi.label === 'QUERIES') {
                          setActiveView((prev) => (prev === 'queries' ? 'default' : 'queries'));
                        } else if (kpi.label === 'MISSING VEHICLES') {
                          setActiveView((prev) => (prev === 'missing_vehicles' ? 'default' : 'missing_vehicles'));
                        } else {
                          navigate(kpi.linkTo);
                        }
                      }
                    }}
                  >
                    <Card className="relative h-full overflow-hidden border transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                      {/* Top accent bar */}
                      <div className={cn('h-1 bg-gradient-to-r', style.gradient)} />
                      <CardContent className="relative flex h-full flex-col p-4 pt-3.5">
                        {/* Decorative background */}
                        <div className={cn('absolute right-0 top-0 h-24 w-24 -translate-y-6 translate-x-6 rounded-full opacity-[0.03] transition-transform duration-500 group-hover:scale-150', style.accent)} />
                        <div className="flex items-center justify-between">
                          <span className={cn('text-[10px] font-semibold uppercase tracking-widest', style.headingColor)}>
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

      {/* ── Inline Status Distribution ──────────────── */}
      {activeView !== 'default' && (
        <motion.div
          variants={itemVariants}
          initial="hidden"
          animate="visible"
          className="space-y-4"
        >
          <Card className="overflow-hidden border">
            <div className={cn(
              'h-1',
              activeView === 'queries' ? 'bg-gradient-to-r from-sky-500/60 to-blue-500/60' : 'bg-gradient-to-r from-orange-500/60 to-amber-500/60',
            )} />
            <CardContent className="p-6">
              {/* Header */}
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">
                    {activeView === 'queries' ? 'Inquiries' : 'Missing Vehicle Requests'}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {activeView === 'queries'
                      ? `${inquiries?.length ?? 0} total inquiries grouped by status`
                      : `${missingVehicles?.length ?? 0} total requests grouped by status`
                    }
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveView('default')}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-accent/10 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Status Grid */}
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {(activeView === 'queries' ? inquiriesByStatus : missingVehiclesByStatus).map(({ status, count }) => (
                  <div
                    key={status}
                    className={cn(
                      'flex items-center justify-between rounded-xl border px-4 py-3 transition-colors hover:shadow-sm',
                      STATUS_COLORS[status] || STATUS_COLORS.Unknown,
                    )}
                  >
                    <span className="text-sm font-semibold">{status}</span>
                    <span className="text-lg font-bold tabular-nums">{count}</span>
                  </div>
                ))}
              </div>

              {/* Empty state */}
              {(activeView === 'queries' ? inquiriesByStatus.length === 0 : missingVehiclesByStatus.length === 0) && (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <MessageSquare className="mb-3 h-10 w-10 text-muted-foreground/40" />
                  <p className="text-sm font-medium">No records found</p>
                  <p className="text-xs mt-1">There are no {activeView === 'queries' ? 'inquiries' : 'missing vehicle requests'} to display.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* ── Chart Sections (hidden when a status breakdown is active) ── */}
      {activeView === 'default' && (
        <>
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
      </>
      )}

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
