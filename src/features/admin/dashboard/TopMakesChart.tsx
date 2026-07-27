import { useId } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts';
import { ChartCard, ChartTooltip } from './ChartCard';
import { formatCurrency, compactNumber } from '@utils';
import type { VehicleCountByMake } from '@types';
import { BarChart3 } from 'lucide-react';

// ─── Unified brand-aligned palette ───────────────────────
const COLORS = [
  '#6366f1', // indigo-500 (brand primary)
  '#14b8a6', // teal-500
  '#f59e0b', // amber-500 (brand accent)
  '#8b5cf6', // violet-500
  '#06b6d4', // cyan-500
  '#f97316', // orange-500
  '#a855f7', // purple-500
  '#10b981', // emerald-500
  '#0ea5e9', // sky-500
  '#ec4899', // pink-500
];

interface TopMakesChartProps {
  data: VehicleCountByMake[];
  className?: string;
}

export function TopMakesChart({ data, className }: TopMakesChartProps) {
  const uid = useId();
  const sorted = [...data]
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  if (!sorted.length) {
    return (
      <ChartCard
        title="Top Makes"
        subtitle="Manufacturers by vehicle count"
        icon={<BarChart3 className="h-4 w-4" />}
        accent="from-indigo-500/60 to-violet-500/60"
        isEmpty
        emptyTitle="No make data available"
        className={className}
      />
    );
  }

  const totalVehicles = sorted.reduce((s, d) => s + d.count, 0);

  return (
    <ChartCard
      title="Top Makes"
      subtitle={`${sorted.length} manufacturers · ${compactNumber(totalVehicles)} vehicles`}
      icon={<BarChart3 className="h-4 w-4" />}
      accent="from-blue-500/60 to-violet-500/60"
      className={className}
    >
      <div className="h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={sorted}
            layout="vertical"
            margin={{ top: 4, right: 16, bottom: 4, left: 0 }}
            barCategoryGap="25%"
            barGap={0}
          >
            <defs>
              {sorted.map((_, i) => (
                <linearGradient key={i} id={`${uid}-${i}`} x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor={COLORS[i % COLORS.length]} stopOpacity={0.9} />
                  <stop offset="100%" stopColor={COLORS[i % COLORS.length]} stopOpacity={0.5} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="hsl(var(--border))"
              horizontal={false}
            />
            <XAxis
              type="number"
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: 'hsl(var(--border))' }}
              tickFormatter={compactNumber}
            />
            <YAxis
              type="category"
              dataKey="make"
              width={150}
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              cursor={{ fill: 'hsl(var(--muted))', opacity: 0.3 }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0]?.payload as VehicleCountByMake | undefined;
                if (!d) return null;
                const idx = sorted.indexOf(d);
                return (
                  <ChartTooltip
                    active
                    label={d.make}
                    rows={[
                      { label: 'Vehicles', value: compactNumber(d.count), color: COLORS[idx % COLORS.length] },
                      { label: 'Avg Price', value: formatCurrency(d.averagePrice) },
                      { label: 'Market Share', value: `${d.percentage}%` },
                    ]}
                  />
                );
              }}
            />
            <Bar
              dataKey="count"
              radius={[0, 3, 3, 0]}
              maxBarSize={24}
            >
              {sorted.map((entry, i) => (
                <Cell
                  key={entry.make}
                  fill={`url(#${uid}-${i})`}
                  className="transition-opacity duration-200 hover:opacity-80"
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}
