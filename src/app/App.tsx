import { useEffect, type ReactNode } from 'react';
import { ErrorBoundary, LoadingScreen } from '@components/ui';
import { AppProviders } from '@providers';
import { useDataSource } from '@data';
import { AppRouter } from './router';

/**
 * SplashGate — shows a branded full-screen loading animation
 * while the Dataverse data source initializes (loading all ~14K vehicles).
 * Once data is ready, the app renders.
 */
function SplashGate({ children }: { children: ReactNode }) {
  const { isInitialized, isInitializing, error, triggerInit, progress } = useDataSource();

  // Start DataSource init on app mount
  useEffect(() => {
    if (!isInitialized && !isInitializing) {
      triggerInit();
    }
  }, [isInitialized, isInitializing, triggerInit]);

  // Loading state — show branded splash with live progress
  if (isInitializing) {
    return <LoadingScreen message="Loading vehicle data..." progress={progress} />;
  }

  // Error state
  if (!isInitialized && error) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-background">
        <p className="text-lg font-medium text-destructive">Failed to load data</p>
        <p className="max-w-md text-center text-sm text-muted-foreground">
          {error}
        </p>
        <button
          onClick={() => window.location.reload()}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Refresh Page
        </button>
      </div>
    );
  }

  // Ready — render app
  return <>{children}</>;
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
