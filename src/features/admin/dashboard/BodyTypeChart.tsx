import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts';
import { ChartCard, ChartTooltip } from './ChartCard';
import { formatCurrency, compactNumber } from '@utils';
import { CHART_COLORS, CHART_COLORS_HSL, getBarOpacity } from '@utils/colors';
import type { BodyTypeAnalysis } from '@types';
import { Layers } from 'lucide-react';

interface BodyTypeChartProps {
  data: BodyTypeAnalysis[];
  className?: string;
}

export function BodyTypeChart({ data, className }: BodyTypeChartProps) {
  const sorted = [...data]
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  if (!sorted.length) {
    return (
      <ChartCard
        title="Body Types"
        subtitle="Vehicle body type distribution"
        icon={<Layers className="h-4 w-4" />}
        isEmpty
        emptyTitle="No body type data available"
        className={className}
      />
    );
  }

  const totalVehicles = sorted.reduce((s: number, d) => s + d.count, 0);

  return (
    <ChartCard
      title="Body Types"
      subtitle={`${sorted.length} body types · ${compactNumber(totalVehicles)} vehicles`}
      icon={<Layers className="h-4 w-4" />}
      className={className}
    >
      <div className="h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={sorted}
            layout="vertical"
            margin={{ top: 2, right: 16, bottom: 2, left: 4 }}
            barCategoryGap="20%"
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
              dataKey="bodyType"
              width={120}
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              cursor={{ fill: 'hsl(var(--muted))', opacity: 0.3 }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0]?.payload as BodyTypeAnalysis | undefined;
                if (!d) return null;
                return (
                  <ChartTooltip
                    active
                    label={d.bodyType}
                    rows={[
                      { label: 'Vehicles', value: compactNumber(d.count), color: CHART_COLORS[0] },
                      { label: 'Avg Price', value: formatCurrency(d.averagePrice) },
                      { label: 'Share', value: `${d.percentage}%` },
                    ]}
                  />
                );
              }}
            />
            <Bar
              dataKey="count"
              radius={[0, 3, 3, 0]}
              maxBarSize={20}
            >
              {sorted.map((entry, index) => (
                <Cell
                  key={entry.bodyType}
                  fill={CHART_COLORS_HSL.primary}
                  fillOpacity={getBarOpacity(index)}
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
