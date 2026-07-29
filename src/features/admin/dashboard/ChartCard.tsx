import type { ReactNode } from 'react';
import { Card, CardContent, EmptyState } from '@components/ui';
import { cn } from '@utils';

interface ChartCardProps {
  title: string;
  subtitle?: string;
  accent?: string;
  icon?: ReactNode;
  headerAction?: ReactNode;
  children?: ReactNode;
  className?: string;
  isEmpty?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
}

export function ChartCard({
  title,
  subtitle,
  accent: _accent,
  icon,
  headerAction,
  children,
  className,
  isEmpty = false,
  emptyTitle = 'No data available',
  emptyDescription,
}: ChartCardProps) {
  return (
    <Card
      className={cn(
        'overflow-hidden border-0 bg-white text-[#071936] shadow-[0_10px_28px_rgba(18,38,63,0.06)] hover:translate-y-0 hover:border-transparent hover:shadow-[0_14px_34px_rgba(18,38,63,0.09)] dark:bg-[#0c2530] dark:text-white dark:shadow-none dark:hover:shadow-none',
        className,
      )}
    >
      <CardContent className="p-4 sm:p-5">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              {icon && <span className="shrink-0 text-[#8fb6cc] dark:text-[#19b8a5]">{icon}</span>}
              <h3 className="truncate text-sm font-semibold leading-5 tracking-normal text-[#071936] dark:text-white">
                {title}
              </h3>
            </div>
            {subtitle && (
              <p className="mt-0.5 truncate text-xs font-medium leading-4 text-[#8aa0ad] dark:text-[#8fb6cc]">
                {subtitle}
              </p>
            )}
          </div>
          {headerAction && <div className="shrink-0">{headerAction}</div>}
        </div>

        {isEmpty ? (
          <div className="flex min-h-[200px] items-center justify-center">
            <EmptyState title={emptyTitle} description={emptyDescription} />
          </div>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}

interface TooltipRow {
  label: string;
  value: string;
  color?: string;
}

interface ChartTooltipProps {
  active?: boolean;
  payload?: { name?: string; value?: number; color?: string; payload?: Record<string, unknown> }[];
  label?: string;
  labelFormatter?: (label: string) => string;
  rows?: TooltipRow[];
  valueFormatter?: (value: number) => string;
  hidePayload?: boolean;
}

export function ChartTooltip({
  active,
  payload,
  label,
  labelFormatter,
  rows,
  valueFormatter = (v) => v.toLocaleString(),
  hidePayload = false,
}: ChartTooltipProps) {
  if (!active || (!payload?.length && !rows?.length)) {
    return null;
  }

  const headerLabel = label ? (labelFormatter ? labelFormatter(label) : label) : null;

  return (
    <div className="min-w-[140px] rounded-[10px] border border-[#e6edf2] bg-white/95 px-3 py-2.5 text-xs shadow-[0_12px_28px_rgba(7,25,54,0.14)] backdrop-blur-sm dark:border-[#31545a] dark:bg-[#071936]/95 dark:shadow-none">
      {headerLabel && (
        <p className="mb-1.5 border-b border-[#eef3f6] pb-1 font-semibold text-[#071936] dark:border-[#17383d] dark:text-white">
          {headerLabel}
        </p>
      )}
      <div className="space-y-1">
        {rows
          ? rows.map((row, i) => (
              <div key={i} className="flex items-center justify-between gap-4">
                <span className="text-[#7e95a3] dark:text-[#8fb6cc]">{row.label}</span>
                <span
                  className="font-semibold tabular-nums"
                  style={row.color ? { color: row.color } : undefined}
                >
                  {row.value}
                </span>
              </div>
            ))
          : !hidePayload
            ? payload?.map((entry, i) => (
                <div key={i} className="flex items-center justify-between gap-4">
                  <span className="text-[#7e95a3] dark:text-[#8fb6cc]">{entry.name ?? 'Value'}</span>
                  <span
                    className="font-semibold tabular-nums"
                    style={entry.color ? { color: entry.color } : undefined}
                  >
                    {valueFormatter(entry.value ?? 0)}
                  </span>
                </div>
              ))
            : null}
      </div>
    </div>
  );
}
