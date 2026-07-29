import { useThemeStore } from '@stores';
import { Sun, Moon, Monitor } from 'lucide-react';
import type { ThemeMode } from '@types';

export function ThemeSwitcher() {
  const { mode, setMode } = useThemeStore();

  const modes: { value: ThemeMode; icon: typeof Sun; label: string }[] = [
    { value: 'light', icon: Sun, label: 'Light' },
    { value: 'dark', icon: Moon, label: 'Dark' },
    { value: 'system', icon: Monitor, label: 'System' },
  ];

  return (
    <div className="inline-flex items-center gap-1 rounded-[10px] border border-[#d9e2e8] bg-white p-1 dark:border-[#31545a] dark:bg-[#0c2530]">
      {modes.map(({ value, icon: Icon, label }) => (
        <button
          key={value}
          onClick={() => setMode(value)}
          className={`rounded-md p-2 transition-colors ${
            mode === value
              ? 'bg-[#19b8a5] text-white shadow-sm'
              : 'text-[#647887] hover:bg-[#ecfbf8] hover:text-[#08766c] dark:text-[#8fb6cc] dark:hover:bg-[#0f3f43] dark:hover:text-[#19b8a5]'
          }`}
          title={label}
          aria-label={`Switch to ${label} mode`}
        >
          <Icon className="h-4 w-4" />
        </button>
      ))}
    </div>
  );
}
