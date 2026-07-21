import { createContext, useContext, useState, useCallback, useRef, type ReactNode } from 'react';
import type { IDataSource } from '@types';
import { DataverseDataSource } from './dataverseDataSource';

interface DataSourceContextValue {
  dataSource: IDataSource | null;
  isInitialized: boolean;
  isInitializing: boolean;
  error: string | null;
  /** 0–100 progress percentage during initialization (0 when idle). */
  progress: number;
  triggerInit: () => Promise<void>;
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
  }>({ isInitialized: false, isInitializing: false, error: null });
  const [progress, setProgress] = useState(0);
  const dsRef = useRef<IDataSource | null>(null);
  const initStarted = useRef(false);

  const initialize = useCallback(async () => {
    // Prevent concurrent or duplicate init calls
    if (initStarted.current) return;
    initStarted.current = true;

    setState((s) => ({ ...s, isInitializing: true, error: null }));
    setProgress(0);
    try {
      const ds = new DataverseDataSource();
      await ds.initialize((pct) => setProgress(pct));
      dsRef.current = ds;
      globalDataSource = ds;
      setProgress(100);
      setState({ isInitialized: true, isInitializing: false, error: null });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to initialize data source';
      console.error('[DataSourceProvider] Initialization failed:', message, err);
      setState({ isInitialized: false, isInitializing: false, error: message });
    }
  }, []);

  const value: DataSourceContextValue = {
    dataSource: dsRef.current,
    isInitialized: state.isInitialized,
    isInitializing: state.isInitializing,
    error: state.error,
    progress,
    triggerInit: initialize,
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
