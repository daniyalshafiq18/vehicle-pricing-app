import { useEffect, useRef, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { AppProviders } from '@providers';
import { AppRouter } from './router';
import { ErrorBoundary } from '@components/ui';
import { useDataSource } from '@data';
import { missingVehicleRepository, priceSuggestionRepository } from '@repositories';

/**
 * Pre-fetches critical admin data into the React Query cache so that
 * admin pages render immediately without showing a skeleton loader.
 */
async function preFetchCriticalData(queryClient: ReturnType<typeof useQueryClient>) {
  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: ['missing-vehicle-requests'],
      queryFn: () => missingVehicleRepository.getAll(),
      staleTime: 30_000,
    }),
    queryClient.prefetchQuery({
      queryKey: ['price-suggestions'],
      queryFn: () => priceSuggestionRepository.getAll(),
      staleTime: 30_000,
    }),
  ]);
}

/**
 * Waits for the Dataverse data source to finish initializing, then
 * pre-fetches admin data into the React Query cache in the background.
 * The existing page-level skeleton loaders handle the UI — when the
 * pre-fetch completes, subsequent renders serve cached data instantly.
 */
function PreFetchGate({ children }: { children: ReactNode }) {
  const { isInitialized, isInitializing } = useDataSource();
  const queryClient = useQueryClient();
  const prefetched = useRef(false);

  useEffect(() => {
    // Wait for the data source to be ready (it owns the vehicle cache
    // that the missing-vehicle and price-suggestion APIs depend on).
    if (!isInitialized || isInitializing) return;
    // Only pre-fetch once
    if (prefetched.current) return;
    prefetched.current = true;

    preFetchCriticalData(queryClient);
  }, [isInitialized, isInitializing, queryClient]);

  return <>{children}</>;
}

export function App() {
  return (
    <ErrorBoundary>
      <AppProviders>
        <PreFetchGate>
          <AppRouter />
        </PreFetchGate>
      </AppProviders>
    </ErrorBoundary>
  );
}
