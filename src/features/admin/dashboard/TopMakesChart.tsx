import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts';
import { ChartCard, ChartTooltip } from './ChartCard';
import { formatCurrency, compactNumber } from '@utils';
import { CHART_COLORS, CHART_COLORS_HSL, getBarOpacity } from '@utils/colors';
import type { VehicleCountByMake } from '@types';
import { BarChart3 } from 'lucide-react';

interface TopMakesChartProps {
  data: VehicleCountByMake[];
  className?: string;
}

export function TopMakesChart({ data, className }: TopMakesChartProps) {
  const sorted = [...data]
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  if (!sorted.length) {
    return (
      <ChartCard
        title="Top Makes"
        subtitle="Manufacturers by vehicle count"
        icon={<BarChart3 className="h-4 w-4" />}
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
                return (
                  <ChartTooltip
                    active
                    label={d.make}
                    rows={[
                      { label: 'Vehicles', value: compactNumber(d.count), color: CHART_COLORS[0] },
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
                  fill={CHART_COLORS_HSL.primary}
                  fillOpacity={getBarOpacity(i)}
                  className="transition-opacity duration-200 hover:fill-opacity-90"
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}
