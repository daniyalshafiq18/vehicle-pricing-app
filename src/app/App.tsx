import { AppProviders } from '@providers';
import { AppRouter } from './router';
import { ErrorBoundary } from '@components/ui';

export function App() {
  return (
    <ErrorBoundary>
      <AppProviders>
        <AppRouter />
      </AppProviders>
    </ErrorBoundary>
  );
}
