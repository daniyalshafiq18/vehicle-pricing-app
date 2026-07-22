import { useEffect, useState, type ReactNode } from 'react';
import { cn } from '@utils';
import { ErrorBoundary, LoadingScreen } from '@components/ui';
import { AppProviders } from '@providers';
import { useDataSource } from '@data';
import { AppRouter } from './router';

/**
 * SplashGate — shows a branded full-screen loading animation
 * while the Dataverse data source initializes (loading all ~14K vehicles).
 * Once data is ready, the app renders immediately with a smooth fade-out
 * of the splash over the newly-rendered content.
 */
function SplashGate({ children }: { children: ReactNode }) {
  const { isInitialized, isInitializing, error, triggerInit, progress } = useDataSource();
  const [fadingOut, setFadingOut] = useState(false);

  // Start DataSource init on app mount
  useEffect(() => {
    if (!isInitialized && !isInitializing) {
      triggerInit();
    }
  }, [isInitialized, isInitializing, triggerInit]);

  // When data is ready, fade out the splash over 400ms so the app content
  // renders underneath without a visible "flash" of empty page.
  useEffect(() => {
    if (isInitialized) {
      setFadingOut(true);
    }
  }, [isInitialized]);

  // Show splash while initializing — or fading out
  if (!error && (!isInitialized || fadingOut)) {
    return (
      <div className="relative">
        {/* App renders underneath — always mounted once initialized */}
        {isInitialized && <div className="contents">{children}</div>}
        {/* Splash overlay fades out */}
        <div
          className={cn(
            'fixed inset-0 z-50 transition-opacity duration-500',
            fadingOut ? 'opacity-0 pointer-events-none' : '',
          )}
        >
          <LoadingScreen
            message="Loading vehicle data..."
            progress={progress}
          />
        </div>
        {/* Remove splash from DOM once fade completes */}
        {fadingOut && <FadeCleanup onDone={() => setFadingOut(false)} />}
      </div>
    );
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

/** Calls `onDone` after the 500ms CSS fade-out finishes. */
function FadeCleanup({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const id = setTimeout(onDone, 600);
    return () => clearTimeout(id);
  }, [onDone]);
  return null;
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
