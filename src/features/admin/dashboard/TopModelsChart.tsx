import { useId } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts';
import { ChartCard, ChartTooltip } from './ChartCard';
import { formatCurrency, compactNumber } from '@utils';
import type { VehicleCountByModel } from '@types';
import { GitFork } from 'lucide-react';

const COLORS = ['#19b8a5', '#8fb6cc', '#d8e7ef', '#0b7f78', '#b8d2de', '#eaf2f6'];

interface TopModelsChartProps {
  data: VehicleCountByModel[];
  className?: string;
}

function formatModelLabel(make: string, model: string): string {
  const cleanMake = make.trim();
  const cleanModel = model.trim();
  if (!cleanMake) {
    return cleanModel;
  }
  if (cleanModel.toLowerCase().startsWith(`${cleanMake.toLowerCase()} `)) {
    return cleanModel;
  }
  return `${cleanMake} ${cleanModel}`;
}

export function TopModelsChart({ data, className }: TopModelsChartProps) {
  const uid = useId();

  // Sort by count, take top 5, and avoid labels like "Porsche Porsche 911".
  const sorted = [...data]
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
    .map((d) => ({
      ...d,
      label: formatModelLabel(d.make, d.model),
    }));

  if (!sorted.length) {
    return (
      <ChartCard
        title="Top Models"
        subtitle="Most represented vehicle models"
        icon={<GitFork className="h-4 w-4" />}
        accent="from-[#19b8a5] to-[#8fb6cc]"
        isEmpty
        emptyTitle="No model data available"
        className={className}
      />
    );
  }

  const totalVehicles = sorted.reduce((s: number, d) => s + d.count, 0);

  return (
    <ChartCard
      title="Top Models"
      subtitle={`${sorted.length} models · ${compactNumber(totalVehicles)} vehicles`}
      icon={<GitFork className="h-4 w-4" />}
      accent="from-[#19b8a5] to-[#8fb6cc]"
      className={className}
    >
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={sorted}
            layout="vertical"
            margin={{ top: 4, right: 14, bottom: 4, left: -18 }}
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
              dataKey="label"
              width={122}
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
                const d = payload[0]?.payload as (VehicleCountByModel & { label: string }) | undefined;
                if (!d) {
                  return null;
                }
                const idx = sorted.indexOf(d);
                return (
                  <ChartTooltip
                    active
                    label={d.label}
                    rows={[
                      { label: 'Vehicles', value: compactNumber(d.count), color: COLORS[idx % COLORS.length] },
                      { label: 'Avg Price', value: formatCurrency(d.averagePrice) },
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
              {sorted.map((entry, i) => (
                <Cell
                  key={entry.label}
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
