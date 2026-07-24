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
  iconBg: string;
  iconColor: string;
  headingColor: string;
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
    Pending: 'border-accent/20 bg-accent/10 text-accent-800 dark:text-accent-600',
    Approved: 'border-success/20 bg-success/10 text-success',
    'In Progress': 'border-primary/20 bg-primary/10 text-primary',
    Reject: 'border-destructive/20 bg-destructive/10 text-destructive',
    Reviewed: 'border-primary/20 bg-primary/10 text-primary',
    Contacted: 'border-accent/20 bg-accent/10 text-accent-800 dark:text-accent-600',
    Closed: 'border-border bg-muted text-muted-foreground',
    Unknown: 'border-border bg-muted text-muted-foreground',
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
            <h1 className="text-lg font-bold tracking-tight text-foreground">Dashboard</h1>
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
            'TOTAL VEHICLES': { iconBg: 'bg-primary-50', iconColor: 'text-primary', headingColor: 'text-primary-700' },
            'TOTAL MAKES': { iconBg: 'bg-primary-50', iconColor: 'text-primary', headingColor: 'text-primary-700' },
            'TOTAL MODELS': { iconBg: 'bg-primary-50', iconColor: 'text-primary', headingColor: 'text-primary-700' },
            'BODY TYPES': { iconBg: 'bg-primary-50', iconColor: 'text-primary', headingColor: 'text-primary-700' },
            'QUERIES': { iconBg: 'bg-primary-50', iconColor: 'text-primary', headingColor: 'text-primary-700' },
            'MISSING VEHICLES': { iconBg: 'bg-primary-50', iconColor: 'text-primary', headingColor: 'text-primary-700' },
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
                      activeView === 'queries' && kpi.label === 'QUERIES' && 'rounded-xl ring-2 ring-primary/50',
                      activeView === 'missing_vehicles' && kpi.label === 'MISSING VEHICLES' && 'rounded-xl ring-2 ring-accent/50',
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
                      <CardContent className="relative flex h-full flex-col p-4 pt-3.5">
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
            <CardContent className="p-6">
              {/* Header */}
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold text-foreground">
                    {activeView === 'queries' ? 'Inquiries' : 'Missing Vehicle Requests'}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-0.5">
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
                  <p className="text-sm mt-1">There are no {activeView === 'queries' ? 'inquiries' : 'missing vehicle requests'} to display.</p>
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
            <CardContent className="p-6">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold text-foreground">Premium Vehicle Leaderboard</h3>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Top {premiumLeaderboard.length} vehicles by market value
                  </p>
                </div>
                <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-medium text-primary">Top 100</span>
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
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground/60">
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
