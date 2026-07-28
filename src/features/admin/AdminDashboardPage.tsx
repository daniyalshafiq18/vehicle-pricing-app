import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useDashboardAnalytics, useInquiries, useMissingVehicleRequests } from '@hooks';
import { useDashboardStore } from '@stores';
import { Card, CardContent, LazyChart, LoadingScreen } from '@components/ui';
import { formatNumber, cn } from '@utils';
import {
  Activity,
  ArrowDownRight,
  BarChart3,
  Car,
  Clock,
  FileQuestion,
  Layers,
  MessageSquare,
  Sparkles,
  X,
} from 'lucide-react';
import { PremiumLeaderboard } from './dashboard/PremiumLeaderboard';
import { VehicleIntelligenceModal } from './dashboard/VehicleIntelligenceModal';
import {
  BodyTypeChart,
  PowertrainChart,
  TopMakesChart,
  TopModelsChart,
  ValueTrendChart,
} from './dashboard';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.04 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0 },
};

const statusColors: Record<string, string> = {
  Pending: 'border-[#bfe9e2] bg-[#ecfbf8] text-[#08766c]',
  Approved: 'border-[#cdebe6] bg-[#ecfbf8] text-[#08766c]',
  'In Progress': 'border-[#cfe0ea] bg-[#f0f7fa] text-[#427189]',
  Reject: 'border-[#f4c7c7] bg-[#fff0f0] text-[#b42323]',
  Reviewed: 'border-[#cdebe6] bg-[#ecfbf8] text-[#08766c]',
  Contacted: 'border-[#cfe0ea] bg-[#f0f7fa] text-[#427189]',
  Closed: 'border-[#e5edf2] bg-[#f6f9fb] text-[#647887]',
  Unknown: 'border-[#e5edf2] bg-[#f6f9fb] text-[#7e95a3]',
};

export function AdminDashboardPage() {
  const navigate = useNavigate();
  const {
    overview,
    premiumLeaderboard,
    topMakes,
    bodyTypeDistribution,
    valueTrend,
    powertrainComposition,
    topModels,
    totalFiltered,
    totalUnfiltered,
    isLoading,
    error,
  } = useDashboardAnalytics();

  const { data: inquiries } = useInquiries();
  const { data: missingVehicles } = useMissingVehicleRequests();
  const openModal = useDashboardStore((s) => s.openModal);
  const [activeView, setActiveView] = useState<'default' | 'queries' | 'missing_vehicles'>('default');

  const inquiriesByStatus = useMemo(() => {
    if (!inquiries) {
      return [];
    }
    const counts: Record<string, number> = {};
    inquiries.forEach((inq) => {
      const status = inq.status.charAt(0).toUpperCase() + inq.status.slice(1);
      counts[status] = (counts[status] || 0) + 1;
    });
    return Object.entries(counts).map(([status, count]) => ({ status, count }));
  }, [inquiries]);

  const missingVehiclesByStatus = useMemo(() => {
    if (!missingVehicles) {
      return [];
    }
    const counts: Record<string, number> = {};
    missingVehicles.forEach((mv) => {
      const status = mv.status || 'Unknown';
      counts[status] = (counts[status] || 0) + 1;
    });
    return Object.entries(counts).map(([status, count]) => ({ status, count }));
  }, [missingVehicles]);

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

  const bodyTypeNames = bodyTypeDistribution.map((b) => b.bodyType).join(', ');
  const inquiriesCount = inquiries?.length ?? 0;
  const missingVehiclesCount = missingVehicles?.length ?? 0;

  const kpiCards = [
    { label: 'Total Vehicles', value: formatNumber(overview.totalVehicles), icon: Car, subtitle: 'In database', linkTo: '/admin/vehicles' },
    { label: 'Total Makes', value: formatNumber(overview.totalMakes), icon: BarChart3, subtitle: 'Manufacturers', linkTo: '/admin/vehicles' },
    { label: 'Total Models', value: formatNumber(overview.totalModels), icon: Activity, subtitle: 'Unique models', linkTo: '/admin/vehicles' },
    {
      label: 'Body Types',
      value: formatNumber(bodyTypeDistribution.length),
      icon: Layers,
      subtitle: bodyTypeNames.length > 32 ? `${bodyTypeNames.slice(0, 32)}...` : bodyTypeNames,
      linkTo: '/admin/vehicles',
    },
    { label: 'Queries', value: formatNumber(inquiriesCount), icon: MessageSquare, subtitle: 'All inquiries', linkTo: '/admin/queries' },
    { label: 'Missing Vehicles', value: formatNumber(missingVehiclesCount), icon: FileQuestion, subtitle: 'Vehicle requests', linkTo: '/admin/missing-vehicles' },
  ];

  const handleKpiAction = (label: string, linkTo: string) => {
    if (label === 'Queries') {
      setActiveView((prev) => (prev === 'queries' ? 'default' : 'queries'));
      return;
    }
    if (label === 'Missing Vehicles') {
      setActiveView((prev) => (prev === 'missing_vehicles' ? 'default' : 'missing_vehicles'));
      return;
    }
    navigate(linkTo);
  };

  return (
    <motion.div
      className="-m-6 min-h-[calc(100vh-4rem)] bg-[#e5e7eb] p-4 text-[#071936] dark:bg-[#061821] dark:text-white sm:p-5 lg:-m-8 lg:p-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.div variants={itemVariants} className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[20px] font-extrabold leading-7 tracking-normal text-[#071936] dark:text-white sm:text-[22px]">
            Overall Performance Dashboard
          </h1>
          <p className="mt-1 text-[11px] font-medium text-[#7e95a3] dark:text-[#8fb6cc]">
            <span className="font-semibold text-[#071936] dark:text-white">{formatNumber(overview.totalVehicles)}</span> vehicles across{' '}
            <span className="font-semibold text-[#071936] dark:text-white">{formatNumber(overview.totalMakes)}</span> makes
            {totalFiltered !== totalUnfiltered && (
              <span className="text-[#19b8a5]"> · Filtered: {formatNumber(totalFiltered)} vehicles</span>
            )}
            <span className="text-[#9aabb5]"> · Updated {new Date(overview.lastUpdated).toLocaleDateString()}</span>
          </p>
        </div>
        <div className="flex items-center gap-2 self-start rounded-[8px] bg-white px-3 py-2 text-[11px] font-semibold text-[#071936] shadow-[0_8px_24px_rgba(18,38,63,0.05)] sm:self-auto">
          <span className="text-[#8aa0ad]">Period</span>
          <span>Week till date</span>
        </div>
      </motion.div>

      <div className="grid gap-3 xl:grid-cols-12">
        <motion.div variants={itemVariants} className="xl:col-span-4">
          <Card className="h-full border-0 bg-white shadow-[0_10px_28px_rgba(18,38,63,0.06)] hover:translate-y-0 hover:border-transparent">
            <CardContent className="p-4 sm:p-5">
              <div className="mb-5">
                <h2 className="text-[15px] font-bold leading-5 text-[#071936] dark:text-white">Weekly Stats</h2>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {kpiCards.map((kpi) => {
                  const selected =
                    (activeView === 'queries' && kpi.label === 'Queries') ||
                    (activeView === 'missing_vehicles' && kpi.label === 'Missing Vehicles');
                  return (
                    <button
                      key={kpi.label}
                      type="button"
                      onClick={() => handleKpiAction(kpi.label, kpi.linkTo)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleKpiAction(kpi.label, kpi.linkTo);
                        }
                      }}
                      className={cn(
                        'group min-h-[76px] rounded-[4px] bg-[#f7fafc] p-3 text-left transition-colors hover:bg-[#edf5f7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#19b8a5]/35',
                        selected && 'bg-[#e7f8f5] ring-2 ring-[#19b8a5]/30',
                      )}
                    >
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <span className="truncate text-[10px] font-medium leading-4 text-[#8aa0ad]">{kpi.label}</span>
                        <kpi.icon className="h-3.5 w-3.5 shrink-0 text-[#8fb6cc] group-hover:text-[#19b8a5]" />
                      </div>
                      <p className="text-[15px] font-bold leading-5 text-[#071936]">{kpi.value}</p>
                      <p className="mt-1 truncate text-[10px] font-semibold leading-4 text-[#647887]">{kpi.subtitle}</p>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants} className="xl:col-span-4">
          <LazyChart height={350} rootMargin="200px">
            <PowertrainChart data={powertrainComposition} />
          </LazyChart>
        </motion.div>

        <motion.div variants={itemVariants} className="xl:col-span-4">
          <LazyChart height={350} rootMargin="200px">
            <TopModelsChart data={topModels} />
          </LazyChart>
        </motion.div>

        <motion.div variants={itemVariants} className="xl:col-span-12">
          <LazyChart height={350} rootMargin="250px">
            <ValueTrendChart data={valueTrend} />
          </LazyChart>
        </motion.div>

        {activeView !== 'default' && (
          <motion.div variants={itemVariants} className="xl:col-span-12">
            <Card className="border-0 bg-white shadow-[0_10px_28px_rgba(18,38,63,0.06)] hover:translate-y-0 hover:border-transparent">
              <CardContent className="p-4 sm:p-5">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-[14px] font-bold text-[#071936]">
                      {activeView === 'queries' ? 'Inquiries' : 'Missing Vehicle Requests'}
                    </h3>
                    <p className="mt-0.5 text-[10px] font-medium text-[#8aa0ad]">
                      {activeView === 'queries'
                        ? `${inquiries?.length ?? 0} total inquiries grouped by status`
                        : `${missingVehicles?.length ?? 0} total requests grouped by status`}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveView('default')}
                    className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-[#f4f8fb] text-[#7e95a3] transition-colors hover:bg-[#eaf2f6] hover:text-[#071936]"
                    aria-label="Close status breakdown"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {(activeView === 'queries' ? inquiriesByStatus : missingVehiclesByStatus).map(({ status, count }) => (
                    <div
                      key={status}
                      className={cn(
                        'flex items-center justify-between rounded-[8px] border px-4 py-3 transition-colors hover:bg-white',
                        statusColors[status] || statusColors.Unknown,
                      )}
                    >
                      <span className="text-[12px] font-semibold">{status}</span>
                      <span className="text-[18px] font-bold tabular-nums">{count}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {activeView === 'default' && (
          <>
            <motion.div variants={itemVariants} className="xl:col-span-6">
              <LazyChart height={310} rootMargin="200px">
                <BodyTypeChart data={bodyTypeDistribution} />
              </LazyChart>
            </motion.div>
            <motion.div variants={itemVariants} className="xl:col-span-6">
              <LazyChart height={310} rootMargin="200px">
                <TopMakesChart data={topMakes} />
              </LazyChart>
            </motion.div>
          </>
        )}

        <motion.div variants={itemVariants} className="xl:col-span-12">
          <LazyChart height={500} rootMargin="300px">
            <Card className="overflow-hidden border-0 bg-white shadow-[0_10px_28px_rgba(18,38,63,0.06)] hover:translate-y-0 hover:border-transparent">
              <CardContent className="p-4 sm:p-5">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-[15px] font-bold leading-5 text-[#071936]">Premium Vehicle Leaderboard</h3>
                    <p className="mt-0.5 text-[10px] font-medium text-[#8aa0ad]">
                      Top {premiumLeaderboard.length} vehicles by market value
                    </p>
                  </div>
                  <span className="rounded-[8px] bg-[#ecfbf8] px-3 py-1 text-[10px] font-bold text-[#08766c]">Top 100</span>
                </div>
                <PremiumLeaderboard
                  data={premiumLeaderboard}
                  onVehicleSelect={(vehicleId) => openModal(vehicleId)}
                />
              </CardContent>
            </Card>
          </LazyChart>
        </motion.div>
      </div>

      <motion.div variants={itemVariants} className="mt-5 flex flex-wrap items-center justify-center gap-2 text-[11px] font-medium text-[#8aa0ad]">
        <Clock className="h-3.5 w-3.5" />
        <span>
          Last updated: {new Date(overview.lastUpdated).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
        <span className="mx-1 text-[#c2d1d9]">·</span>
        <Sparkles className="h-3.5 w-3.5" />
        <span>Live analytics · {formatNumber(totalFiltered)} vehicles displayed</span>
      </motion.div>

      <VehicleIntelligenceModal />
    </motion.div>
  );
}
