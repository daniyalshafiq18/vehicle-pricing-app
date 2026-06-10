import { type ReactNode } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { QueryProvider } from './QueryProvider';
import { ThemeProvider } from './ThemeProvider';
import { DataSourceProvider } from '@data';

interface AppProvidersProps {
  children: ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <BrowserRouter>
      <QueryProvider>
        <DataSourceProvider>
          <ThemeProvider>
            {children}
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: 'hsl(var(--card))',
                  color: 'hsl(var(--card-foreground))',
                  border: '1px solid hsl(var(--border))',
                },
                success: { iconTheme: { primary: 'hsl(142, 71%, 45%)', secondary: 'white' } },
                error: { iconTheme: { primary: 'hsl(0, 84%, 60%)', secondary: 'white' } },
              }}
            />
          </ThemeProvider>
        </DataSourceProvider>
      </QueryProvider>
    </BrowserRouter>
  );
}
