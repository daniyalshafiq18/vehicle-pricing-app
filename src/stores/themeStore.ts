import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ThemeMode, ThemeState } from '@types';

function getSystemDark(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function resolveIsDark(mode: ThemeMode): boolean {
  if (mode === 'system') return getSystemDark();
  return mode === 'dark';
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      mode: 'system',
      isDark: getSystemDark(),

      setMode: (mode: ThemeMode) => {
        const isDark = resolveIsDark(mode);
        set({ mode, isDark });
        applyTheme(isDark);
      },

      toggle: () => {
        const { mode } = get();
        const nextMode: ThemeMode = mode === 'dark' ? 'light' : 'dark';
        const isDark = resolveIsDark(nextMode);
        set({ mode: nextMode, isDark });
        applyTheme(isDark);
      },
    }),
    {
      name: 'vehicle-pricing-theme',
      partialize: (state) => ({ mode: state.mode }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          const isDark = resolveIsDark(state.mode);
          state.isDark = isDark;
          applyTheme(isDark);
        }
      },
    },
  ),
);

function applyTheme(isDark: boolean): void {
  const root = document.documentElement;
  if (isDark) {
    root.classList.add('dark');
    root.classList.remove('light');
  } else {
    root.classList.remove('dark');
    root.classList.add('light');
  }
}

// Listen for system theme changes when in 'system' mode
if (typeof window !== 'undefined') {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    const { mode } = useThemeStore.getState();
    if (mode === 'system') {
      const isDark = getSystemDark();
      useThemeStore.setState({ isDark });
      applyTheme(isDark);
    }
  });
}
