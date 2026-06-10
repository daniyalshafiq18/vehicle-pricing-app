import { create } from 'zustand';
import type { AdminState } from '@types';
import type { AnalyticsData } from '@types';

export const useAdminStore = create<AdminState>()((set) => ({
  analytics: null,
  isSidebarCollapsed: false,
  activeSection: 'dashboard',
  isLoading: false,
  error: null,

  setAnalytics: (analytics: AnalyticsData) => set({ analytics }),
  toggleSidebar: () => set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),
  setActiveSection: (section: string) => set({ activeSection: section }),
  setLoading: (isLoading: boolean) => set({ isLoading }),
  setError: (error: string | null) => set({ error }),
}));
