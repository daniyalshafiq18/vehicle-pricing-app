import { useDeferredValue } from 'react';
import { useQuery } from '@tanstack/react-query';
import { analyticsRepository } from '@repositories';
import { useDashboardStore } from '@stores';
import type { DashboardFilters } from '@types';

const DASHBOARD_ANALYTICS_KEY = 'dashboard-analytics';

export function useDashboardAnalytics() {
  const filters = useDashboardStore((s) => s.filters);

  const { data, isLoading, error, isFetching } = useQuery({
    queryKey: [DASHBOARD_ANALYTICS_KEY, filters],
    queryFn: () => analyticsRepository.getDashboardAnalytics(
      Object.values(filters).some((v) => v !== undefined) ? filters : undefined,
    ),
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  });

  // Defer chart data so the main thread can prioritise KPI rendering
  const deferredData = useDeferredValue(data);

  return {
    // KPIs use fresh data (not deferred)
    overview: data?.overview ?? null,
    totalFiltered: data?.totalFiltered ?? 0,
    totalUnfiltered: data?.totalUnfiltered ?? 0,
    // Charts use deferred value to avoid blocking the UI on recomputation
    topMakes: deferredData?.topMakes ?? [],
    priceDistribution: deferredData?.priceDistribution ?? [],
    valueTrend: deferredData?.valueTrend ?? [],
    powertrainComposition: deferredData?.powertrainComposition ?? [],
    scatterData: deferredData?.scatterData ?? [],
    bodyTypeDistribution: deferredData?.bodyTypeDistribution ?? [],
    ageDistribution: deferredData?.ageDistribution ?? [],
    boxPlot: deferredData?.boxPlot ?? [],
    topModels: deferredData?.topModels ?? [],
    premiumLeaderboard: deferredData?.premiumLeaderboard ?? [],
    isLoading,
    isRefetching: isFetching && !isLoading,
    error,
  };
}

/** Fetch only the value-trend slice for a make/model chart filter. */
export function useValueTrendAnalytics(make?: string, model?: string) {
  const filters: DashboardFilters | undefined = make
    ? { make, ...(model ? { model } : {}) }
    : undefined;

  const query = useQuery({
    queryKey: [DASHBOARD_ANALYTICS_KEY, 'value-trend', make ?? 'all', model ?? 'all'],
    queryFn: () => analyticsRepository.getDashboardAnalytics(filters),
    enabled: !!make,
    staleTime: 30_000,
    placeholderData: (previous) => previous,
  });

  return {
    valueTrend: query.data?.valueTrend ?? [],
    isLoading: query.isFetching,
  };
}
