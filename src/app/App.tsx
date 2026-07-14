import { ErrorBoundary } from '@components/ui';
import { AppProviders } from '@providers';
import { AppRouter } from './router';

export function App() {
  return (
    <ErrorBoundary>
      <AppProviders>
        <AppRouter />
      </AppProviders>
    </ErrorBoundary>
  );
}
