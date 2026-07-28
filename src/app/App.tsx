import { useEffect, useState, type ReactNode } from 'react';
import { ErrorBoundary, LoadingScreen } from '@components/ui';
import { AppProviders } from '@providers';
import { useDataSource } from '@data';
import { AppRouter } from './router';

/**
 * SplashGate — shows a branded full-screen loading animation
 * while the Dataverse data source initializes (loading all ~30k–34k vehicles).
 *
 * Progress flows: 0 → 14 → 29 → 43 → 57 → 71 → 86 → 98 → 100
 * (per-page jumps smoothed by a continuous rAF animation inside LoadingScreen).
 *
 * When data is ready, the splash stays visible for 900ms so the smooth
 * progress animation can reach exactly 100%, THEN the splash is removed
 * instantly. No fade, no opacity transition, no intermediate render state —
 * the app has been rendering underneath since `isInitialized` became true,
 * so React Query hooks are already fetching by the time the user sees it.
 */
function SplashGate({ children }: { children: ReactNode }) {
  const { isInitialized, isInitializing, error, triggerInit, progress } = useDataSource();
  const [splashDeleted, setSplashDeleted] = useState(false);

  // Start DataSource init on app mount
  useEffect(() => {
    if (!isInitialized && !isInitializing) {
      triggerInit();
    }
  }, [isInitialized, isInitializing, triggerInit]);

  // When data becomes ready, hold the splash for 900ms so the smooth
  // rAF progress animation reaches 100%, then remove it cleanly.
  useEffect(() => {
    if (isInitialized) {
      const id = setTimeout(() => setSplashDeleted(true), 900);
      return () => clearTimeout(id);
    }
  }, [isInitialized]);

  // Error state — splash couldn't load
  if (error && !isInitialized) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-background">
        <p className="text-lg font-medium text-destructive">Failed to load data</p>
        <p className="max-w-md text-center text-sm text-muted-foreground">
          {error}
        </p>
        <button
          onClick={() => window.location.reload()}
          className="rounded-lg bg-[#19b8a5] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#14a794]"
        >
          Refresh Page
        </button>
      </div>
    );
  }

  return (
    <>
      {/* App content — hidden behind splash until splashDeleted */}
      {isInitialized && <div className={splashDeleted ? '' : 'hidden'}>{children}</div>}

      {/* Splash overlay — stays in DOM, fully opaque, no transitions */}
      {!splashDeleted && (
        <LoadingScreen message="Loading vehicle data..." progress={progress} />
      )}
    </>
  );
}

export function App() {
  return (
    <ErrorBoundary>
      <AppProviders>
        <SplashGate>
          <AppRouter />
        </SplashGate>
      </AppProviders>
    </ErrorBoundary>
  );
}
