import {
  PieChart, Pie, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { ChartCard, ChartTooltip } from './ChartCard';
import { formatCurrency, compactNumber } from '@utils';
import type { PowertrainAnalysis } from '@types';
import { Zap } from 'lucide-react';

// ─── Colors ──────────────────────────────────────────────
const PT_COLORS: Record<string, string> = {
  'Petrol/Diesel': '#6366f1', // indigo-500 (brand primary)
  'Hybrid': '#14b8a6',       // teal-500
  'Electric': '#8b5cf6',     // violet-500
};

const FALLBACK_COLORS = ['#6366f1', '#14b8a6', '#8b5cf6', '#f59e0b'];

interface PowertrainChartProps {
  data: PowertrainAnalysis[];
  className?: string;
}

export function PowertrainChart({ data, className }: PowertrainChartProps) {
  const sorted = [...data].sort((a, b) => b.count - a.count);

  if (!sorted.length) {
    return (
      <ChartCard
        title="Powertrain"
        subtitle="Fuel / powertrain type breakdown"
        icon={<Zap className="h-4 w-4" />}
        accent="from-indigo-500/60 to-amber-500/60"
        isEmpty
        emptyTitle="No powertrain data available"
        className={className}
      />
    );
  }

  const total = sorted.reduce((s: number, d) => s + d.count, 0);

  return (
    <ChartCard
      title="Powertrain"
      subtitle={`${compactNumber(total)} vehicles across ${sorted.length} types`}
      icon={<Zap className="h-4 w-4" />}
      accent="from-blue-500/60 to-emerald-500/60"
      className={className}
    >
      {/* Flex column: donut SVG takes available space, legend sits below */}
      <div className="flex h-[320px] flex-col">
        <div className="flex-1 min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              {/* Center total label */}
              <text
                x="50%"
                y="47%"
                textAnchor="middle"
                dominantBaseline="middle"
                className="fill-foreground"
                style={{ fontSize: 22, fontWeight: 700 }}
              >
                {compactNumber(total)}
              </text>
              <text
                x="50%"
                y="57%"
                textAnchor="middle"
                dominantBaseline="middle"
                className="fill-muted-foreground"
                style={{ fontSize: 11 }}
              >
                Vehicles
              </text>

              <Pie
                data={sorted}
                dataKey="count"
                nameKey="powertrain"
                cx="50%"
                cy="47%"
                innerRadius={60}
                outerRadius={105}
                paddingAngle={3}
                strokeWidth={0}
                cornerRadius={4}
              >
                {sorted.map((entry) => {
                  const color = PT_COLORS[entry.powertrain]
                    ?? FALLBACK_COLORS[sorted.indexOf(entry) % FALLBACK_COLORS.length];
                  return (
                    <Cell
                      key={entry.powertrain}
                      fill={color}
                      fillOpacity={0.9}
                      className="transition-all duration-200 hover:fill-opacity-100"
                    />
                  );
                })}
              </Pie>

              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0]?.payload as PowertrainAnalysis | undefined;
                  if (!d) return null;
                  return (
                    <ChartTooltip
                      active
                      label={d.powertrain}
                      rows={[
                        { label: 'Vehicles', value: compactNumber(d.count), color: PT_COLORS[d.powertrain] ?? FALLBACK_COLORS[0] },
                        { label: 'Avg Price', value: formatCurrency(d.averagePrice) },
                        { label: 'Share', value: `${d.percentage}%` },
                      ]}
                    />
                  );
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* ── Legend (inside the flex, takes natural height) ── */}
        <div className="flex-shrink-0 flex flex-wrap justify-center gap-x-5 gap-y-1 pt-1 pb-0.5">
          {sorted.map((entry) => {
            const color = PT_COLORS[entry.powertrain]
              ?? FALLBACK_COLORS[sorted.indexOf(entry) % FALLBACK_COLORS.length];
            return (
              <div key={entry.powertrain} className="flex items-center gap-1.5 text-xs">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: color }}
                />
                <span className="text-muted-foreground">{entry.powertrain}</span>
                <span className="font-medium text-foreground">{entry.percentage}%</span>
              </div>
            );
          })}
        </div>
      </div>
    </ChartCard>
  );
}
