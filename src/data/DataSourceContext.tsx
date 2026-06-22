import { createContext, useContext, useEffect, useState, useCallback, useRef, type ReactNode } from 'react';
import type { IDataSource } from '@types';
import { DataverseDataSource } from './dataverseDataSource';

interface DataSourceContextValue {
  dataSource: IDataSource | null;
  isInitialized: boolean;
  isInitializing: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const DataSourceContext = createContext<DataSourceContextValue | null>(null);

let globalDataSource: IDataSource | null = null;

export function getDataSource(): IDataSource {
  if (!globalDataSource) {
    throw new Error('DataSource not initialized. Wrap your app in <DataSourceProvider>.');
  }
  return globalDataSource;
}

interface DataSourceProviderProps {
  children: ReactNode;
}

export function DataSourceProvider({ children }: DataSourceProviderProps) {
  const [state, setState] = useState<{
    isInitialized: boolean;
    isInitializing: boolean;
    error: string | null;
  }>({ isInitialized: false, isInitializing: true, error: null });
  const dsRef = useRef<IDataSource | null>(null);

  const initialize = useCallback(async () => {
    setState((s) => ({ ...s, isInitializing: true, error: null }));
    try {
      const ds = new DataverseDataSource();
      await ds.initialize();
      dsRef.current = ds;
      globalDataSource = ds;
      setState({ isInitialized: true, isInitializing: false, error: null });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to initialize data source';
      console.error('[DataSourceProvider] Initialization failed:', message, err);
      setState({ isInitialized: false, isInitializing: false, error: message });
    }
  }, []);

  useEffect(() => {
    initialize();
  }, [initialize]);

  const value: DataSourceContextValue = {
    dataSource: dsRef.current,
    isInitialized: state.isInitialized,
    isInitializing: state.isInitializing,
    error: state.error,
    refresh: initialize,
  };

  return <DataSourceContext.Provider value={value}>{children}</DataSourceContext.Provider>;
}

export function useDataSource(): DataSourceContextValue {
  const ctx = useContext(DataSourceContext);
  if (!ctx) {
    throw new Error('useDataSource must be used within <DataSourceProvider>');
  }
  return ctx;
}
