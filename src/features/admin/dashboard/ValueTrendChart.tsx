import { useId, useMemo, useState } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { ChartCard, ChartTooltip } from './ChartCard';
import { CustomSelect } from '@components/ui';
import { useVehicleHierarchy, useValueTrendAnalytics } from '@hooks';
import { formatCurrency, compactNumber } from '@utils';
import { CHART_COLORS, CHART_COLORS_HSL } from '@utils/colors';
import type { PriceByYear } from '@types';
import { Activity } from 'lucide-react';

interface ValueTrendChartProps {
  data: PriceByYear[];
  className?: string;
}

export function ValueTrendChart({ data, className }: ValueTrendChartProps) {
  const gradientId = useId();
  const [selectedMake, setSelectedMake] = useState<string>();
  const [selectedModel, setSelectedModel] = useState<string>();
  const { data: hierarchy } = useVehicleHierarchy();
  const { valueTrend: filteredValueTrend, isLoading: isFiltering } = useValueTrendAnalytics(
    selectedMake,
    selectedModel,
  );

  const makeOptions = useMemo(() => {
    if (!hierarchy) return [];
    const makes = new Set(Object.values(hierarchy.makes).flat());
    return [...makes]
      .sort((a, b) => a.localeCompare(b))
      .map((make) => ({ value: make, label: make }));
  }, [hierarchy]);

  const modelOptions = useMemo(() => {
    if (!hierarchy || !selectedMake) return [];
    const makeSuffix = `-${selectedMake.toLowerCase()}`;
    const models = new Set(
      Object.entries(hierarchy.models)
        .filter(([key]) => key.endsWith(makeSuffix))
        .flatMap(([, values]) => values),
    );
    return [...models]
      .sort((a, b) => a.localeCompare(b))
      .map((model) => ({ value: model, label: model }));
  }, [hierarchy, selectedMake]);

  const chartData = selectedMake
    ? filteredValueTrend.length > 0
      ? filteredValueTrend
      : isFiltering
        ? data
        : []
    : data;

  if (!data.length) {
    return (
      <ChartCard
        title="Price by Model Year"
        subtitle="Average market value trend"
        icon={<Activity className="h-4 w-4" />}
        isEmpty
        emptyTitle="No value trend data available"
        className={className}
      />
    );
  }

  return (
    <ChartCard
      title="Price by Model Year"
      subtitle={isFiltering
        ? 'Updating price trend...'
        : `${chartData.length} model years · ${selectedModel ?? selectedMake ?? 'all vehicles'}`}
      icon={<Activity className="h-4 w-4" />}
      className={className}
      headerAction={
        <div className="flex items-center gap-2">
          <CustomSelect
            placeholder="All makes"
            value={selectedMake}
            onChange={(value) => {
              setSelectedMake(value);
              setSelectedModel(undefined);
            }}
            options={makeOptions}
            placement="bottom-end"
            className="h-8 w-40 rounded-lg border-border bg-background px-2.5 text-sm font-medium hover:border-primary/40"
            dropdownClassName="border-border"
          />
          <CustomSelect
            placeholder="All models"
            value={selectedModel}
            onChange={setSelectedModel}
            options={modelOptions}
            disabled={!selectedMake}
            placement="bottom-end"
            className="h-8 w-44 rounded-lg border-border bg-background px-2.5 text-sm font-medium hover:border-primary/40"
            dropdownClassName="border-border"
          />
        </div>
      }
    >
      <div className="h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{ top: 4, right: 12, bottom: 4, left: 4 }}
          >
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={CHART_COLORS_HSL.primary} stopOpacity={0.3} />
                <stop offset="100%" stopColor={CHART_COLORS_HSL.primary} stopOpacity={0.03} />
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
                      { label: 'Average', value: formatCurrency(d.averagePrice), color: CHART_COLORS[0] },
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
              stroke={CHART_COLORS_HSL.primary}
              strokeWidth={2.5}
              fill={`url(#${gradientId})`}
              dot={false}
              activeDot={{
                r: 4,
                fill: CHART_COLORS_HSL.primary,
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
