import {
  PieChart, Pie, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { ChartCard, ChartTooltip } from './ChartCard';
import { formatCurrency, compactNumber } from '@utils';
import type { PowertrainAnalysis } from '@types';
import { Zap } from 'lucide-react';

// ─── Warm Amber monochromatic palette ───────────────────
const PT_COLORS: Record<string, string> = {
  'Petrol/Diesel': '#19b8a5',
  Hybrid: '#8fb6cc',
  Electric: '#d8e7ef',
};

const FALLBACK_COLORS = ['#19b8a5', '#8fb6cc', '#d8e7ef', '#eef5f8'];

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
        accent="from-[#19b8a5] to-[#8fb6cc]"
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
      accent="from-[#19b8a5] to-[#8fb6cc]"
      className={className}
    >
      {/* Flex column: donut SVG takes available space, legend sits below */}
      <div className="flex h-[300px] flex-col">
        <div className="flex-1 min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              {/* Center total label */}
              <text
                x="50%"
                y="47%"
                textAnchor="middle"
                dominantBaseline="middle"
                fill="#071936"
                style={{ fontSize: 22, fontWeight: 700 }}
              >
                {compactNumber(total)}
              </text>
              <text
                x="50%"
                y="57%"
                textAnchor="middle"
                dominantBaseline="middle"
                fill="#8aa0ad"
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
                stroke="#ffffff"
                strokeWidth={3}
                cornerRadius={5}
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
                  if (!active || !payload?.length) {
                    return null;
                  }
                  const d = payload[0]?.payload as PowertrainAnalysis | undefined;
                  if (!d) {
                    return null;
                  }
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
        <div className="flex shrink-0 flex-wrap justify-center gap-x-5 gap-y-1 pb-0.5 pt-1">
          {sorted.map((entry) => {
            const color = PT_COLORS[entry.powertrain]
              ?? FALLBACK_COLORS[sorted.indexOf(entry) % FALLBACK_COLORS.length];
            return (
              <div key={entry.powertrain} className="flex items-center gap-1.5 text-[11px]">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: color }}
                />
                <span className="text-[#7e95a3]">{entry.powertrain}</span>
                <span className="font-semibold text-[#071936]">{entry.percentage}%</span>
              </div>
            );
          })}
        </div>
      </div>
    </ChartCard>
  );
}
