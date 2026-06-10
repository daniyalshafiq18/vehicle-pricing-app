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
    <div className="inline-flex items-center gap-1 rounded-lg border bg-background p-1">
      {modes.map(({ value, icon: Icon, label }) => (
        <button
          key={value}
          onClick={() => setMode(value)}
          className={`rounded-md p-2 transition-colors ${
            mode === value
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
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
