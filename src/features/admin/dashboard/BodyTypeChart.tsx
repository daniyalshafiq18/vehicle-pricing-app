import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts';
import { ChartCard, ChartTooltip } from './ChartCard';
import { formatCurrency, compactNumber } from '@utils';
import type { BodyTypeAnalysis } from '@types';
import { Layers } from 'lucide-react';

// ─── Warm Amber monochromatic palette ───────────────────
const COLORS = ['#19b8a5', '#8fb6cc', '#d8e7ef', '#0b7f78', '#b8d2de', '#eaf2f6'];

interface BodyTypeChartProps {
  data: BodyTypeAnalysis[];
  className?: string;
}

export function BodyTypeChart({ data, className }: BodyTypeChartProps) {
  const sorted = [...data]
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  if (!sorted.length) {
    return (
      <ChartCard
        title="Body Types"
        subtitle="Vehicle body type distribution"
        icon={<Layers className="h-4 w-4" />}
        accent="from-[#19b8a5] to-[#8fb6cc]"
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
      accent="from-[#19b8a5] to-[#8fb6cc]"
      className={className}
    >
      <div className="h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={sorted}
            layout="vertical"
            margin={{ top: 4, right: 14, bottom: 4, left: 0 }}
            barCategoryGap="34%"
            barGap={0}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#eaf1f5"
              horizontal={false}
            />
            <XAxis
              type="number"
              tick={{ fill: '#8aa0ad', fontSize: 11, fontWeight: 600 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={compactNumber}
            />
            <YAxis
              type="category"
              dataKey="bodyType"
              width={112}
              tick={{ fill: '#647887', fontSize: 11, fontWeight: 600 }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              cursor={{ fill: '#eef5f8', opacity: 0.8 }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) {
                  return null;
                }
                const d = payload[0]?.payload as BodyTypeAnalysis | undefined;
                if (!d) {
                  return null;
                }
                return (
                  <ChartTooltip
                    active
                    label={d.bodyType}
                    rows={[
                      { label: 'Vehicles', value: compactNumber(d.count), color: COLORS[sorted.indexOf(d) % COLORS.length] },
                      { label: 'Avg Price', value: formatCurrency(d.averagePrice) },
                      { label: 'Share', value: `${d.percentage}%` },
                    ]}
                  />
                );
              }}
            />
            <Bar
              dataKey="count"
              radius={[0, 7, 7, 0]}
              maxBarSize={22}
            >
              {sorted.map((entry, index) => (
                <Cell
                  key={entry.bodyType}
                  fill={COLORS[index % COLORS.length]}
                  fillOpacity={0.85}
                  className="transition-opacity duration-200 hover:fill-opacity-100"
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}
