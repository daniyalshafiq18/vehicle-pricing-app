import { useId } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { ChartCard, ChartTooltip } from './ChartCard';
import { formatCurrency, compactNumber } from '@utils';
import type { PriceByYear } from '@types';
import { Activity } from 'lucide-react';

interface ValueTrendChartProps {
  data: PriceByYear[];
  className?: string;
}

export function ValueTrendChart({ data, className }: ValueTrendChartProps) {
  const gradientId = useId();

  if (!data.length) {
    return (
      <ChartCard
        title="Price by Model Year"
        subtitle="Average market value trend"
        icon={<Activity className="h-4 w-4" />}
        accent="from-amber-500/60 to-orange-500/60"
        isEmpty
        emptyTitle="No value trend data available"
        className={className}
      />
    );
  }

  return (
    <ChartCard
      title="Price by Model Year"
      subtitle={`${data.length} model years · values trend`}
      icon={<Activity className="h-4 w-4" />}
      accent="from-amber-500/60 to-orange-500/60"
      className={className}
    >
      <div className="h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 4, right: 12, bottom: 4, left: 4 }}
          >
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.03} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="hsl(var(--border))"
              vertical={false}
            />
            <XAxis
              dataKey="year"
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: 'hsl(var(--border))' }}
              tickFormatter={(y: number) => String(y).slice(2)}
            />
            <YAxis
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: 'hsl(var(--border))' }}
              tickFormatter={compactNumber}
              width={60}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0]?.payload as PriceByYear | undefined;
                if (!d) return null;
                return (
                  <ChartTooltip
                    active
                    label={String(d.year)}
                    rows={[
                      { label: 'Average', value: formatCurrency(d.averagePrice), color: '#f59e0b' },
                      { label: 'Median', value: formatCurrency(d.medianPrice) },
                      { label: 'Min', value: formatCurrency(d.minimumPrice) },
                      { label: 'Max', value: formatCurrency(d.maximumPrice) },
                      { label: 'Vehicles', value: compactNumber(d.count) },
                    ]}
                  />
                );
              }}
            />
            <Area
              type="monotone"
              dataKey="averagePrice"
              stroke="#f59e0b"
              strokeWidth={2.5}
              fill={`url(#${gradientId})`}
              dot={false}
              activeDot={{
                r: 4,
                fill: '#f59e0b',
                stroke: 'hsl(var(--background))',
                strokeWidth: 2,
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}
