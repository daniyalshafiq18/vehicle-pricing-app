import type { ReactNode } from 'react';
import { Card, CardContent, EmptyState } from '@components/ui';
import { cn } from '@utils';

interface ChartCardProps {
  /** Card title */
  title: string;
  /** Subtitle shown below the title */
  subtitle?: string;
  /** Icon shown beside the title */
  icon?: ReactNode;
  /** Extra header actions (filters, toggles, etc.) */
  headerAction?: ReactNode;
  /** Chart content */
  children?: ReactNode;
  /** Class name overrides */
  className?: string;
  /** Whether data is empty */
  isEmpty?: boolean;
  /** Empty state title */
  emptyTitle?: string;
  /** Empty state description */
  emptyDescription?: string;
}

/**
 * ChartCard — consistent wrapper for all dashboard chart widgets.
 * Renders a title bar and chart content with built-in empty-state handling.
 */
export function ChartCard({
  title,
  subtitle,
  icon,
  headerAction,
  children,
  className,
  isEmpty = false,
  emptyTitle = 'No data available',
  emptyDescription,
}: ChartCardProps) {
  return (
    <Card className={cn('overflow-hidden border', className)}>
      <CardContent className="p-4 sm:p-5">
        {/* ── Header ── */}
        <div className="mb-4 flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              {icon && (
                <span className="shrink-0 text-muted-foreground/60">{icon}</span>
              )}
              <h3 className="text-sm font-semibold text-foreground truncate">{title}</h3>
            </div>
            {subtitle && (
              <p className="mt-0.5 text-[11px] text-muted-foreground/60 truncate">{subtitle}</p>
            )}
          </div>
          {headerAction && (
            <div className="shrink-0">{headerAction}</div>
          )}
        </div>

        {/* ── Content / Empty ── */}
        {isEmpty ? (
          <div className="flex min-h-[200px] items-center justify-center">
            <EmptyState
              title={emptyTitle}
              description={emptyDescription}
            />
          </div>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}

// ─── Shared Chart Tooltip ──────────────────────────────────────

interface TooltipRow {
  label: string;
  value: string;
  color?: string;
}

interface ChartTooltipProps {
  active?: boolean;
  payload?: { name?: string; value?: number; color?: string; payload?: Record<string, unknown> }[];
  /** Override the default header label */
  label?: string;
  /** Format the header label */
  labelFormatter?: (label: string) => string;
  /** Custom rows to render (takes precedence over automatic payload rows) */
  rows?: TooltipRow[];
  /** Value formatter for automatic payload rows */
  valueFormatter?: (value: number) => string;
  /** Hide default payload rows (use when providing custom rows) */
  hidePayload?: boolean;
}

/**
 * ChartTooltip — premium tooltip used across all dashboard charts.
 * Supports both automatic payload rendering and custom row content.
 */
export function ChartTooltip({
  active,
  payload,
  label,
  labelFormatter,
  rows,
  valueFormatter = (v) => v.toLocaleString(),
  hidePayload = false,
}: ChartTooltipProps) {
  if (!active || (!payload?.length && !rows?.length)) return null;

  const headerLabel = label ? (labelFormatter ? labelFormatter(label) : label) : null;

  return (
    <div className="rounded-lg border bg-background/95 backdrop-blur-sm px-3 py-2.5 shadow-xl text-xs min-w-[140px]">
      {headerLabel && (
        <p className="mb-1.5 font-medium text-foreground/90 border-b border-border/50 pb-1">
          {headerLabel}
        </p>
      )}
      <div className="space-y-1">
        {rows
          ? rows.map((row, i) => (
              <div key={i} className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">{row.label}</span>
                <span
                  className="font-medium tabular-nums"
                  style={row.color ? { color: row.color } : undefined}
                >
                  {row.value}
                </span>
              </div>
            ))
          : !hidePayload
            ? payload?.map((entry, i) => (
                <div key={i} className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground">{entry.name ?? 'Value'}</span>
                  <span
                    className="font-medium tabular-nums"
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
