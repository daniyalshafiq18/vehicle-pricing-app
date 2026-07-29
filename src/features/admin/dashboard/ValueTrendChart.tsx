import { useId, useMemo, useState } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { ChartCard, ChartTooltip } from './ChartCard';
import { CustomSelect } from '@components/ui';
import { useVehicleHierarchy, useValueTrendAnalytics } from '@hooks';
import { formatCurrency, compactNumber } from '@utils';
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
    if (!hierarchy) {
      return [];
    }
    const makes = new Set(Object.values(hierarchy.makes).flat());
    return [...makes]
      .sort((a, b) => a.localeCompare(b))
      .map((make) => ({ value: make, label: make }));
  }, [hierarchy]);

  const modelOptions = useMemo(() => {
    if (!hierarchy || !selectedMake) {
      return [];
    }
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
        accent="from-[#19b8a5] to-[#8fb6cc]"
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
      accent="from-[#19b8a5] to-[#8fb6cc]"
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
            className="h-8 w-36 rounded-[8px] border-0 bg-[#f4f8fb] px-2.5 text-[11px] font-semibold text-[#071936] shadow-none hover:bg-[#eaf2f6] focus-visible:ring-[#19b8a5]/30 sm:w-40"
            dropdownClassName="border-[#dce8ee] bg-white"
          />
          <CustomSelect
            placeholder="All models"
            value={selectedModel}
            onChange={setSelectedModel}
            options={modelOptions}
            disabled={!selectedMake}
            placement="bottom-end"
            className="h-8 w-36 rounded-[8px] border-0 bg-[#f4f8fb] px-2.5 text-[11px] font-semibold text-[#071936] shadow-none hover:bg-[#eaf2f6] focus-visible:ring-[#19b8a5]/30 sm:w-44"
            dropdownClassName="border-[#dce8ee] bg-white"
          />
        </div>
      }
    >
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{ top: 4, right: 12, bottom: 4, left: 4 }}
          >
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#19b8a5" stopOpacity={0.28} />
                <stop offset="100%" stopColor="#19b8a5" stopOpacity={0.03} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#eaf1f5"
              vertical={false}
            />
            <XAxis
              dataKey="year"
              tick={{ fill: '#8aa0ad', fontSize: 11, fontWeight: 600 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(y: number) => String(y).slice(2)}
            />
            <YAxis
              tick={{ fill: '#8aa0ad', fontSize: 11, fontWeight: 600 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={compactNumber}
              width={60}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) {
                  return null;
                }
                const d = payload[0]?.payload as PriceByYear | undefined;
                if (!d) {
                  return null;
                }
                return (
                  <ChartTooltip
                    active
                    label={String(d.year)}
                    rows={[
                      { label: 'Average', value: formatCurrency(d.averagePrice), color: '#19b8a5' },
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
              stroke="#19b8a5"
              strokeWidth={2.5}
              fill={`url(#${gradientId})`}
              dot={false}
              activeDot={{
                r: 4,
                fill: '#19b8a5',
                stroke: '#ffffff',
                strokeWidth: 2,
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}
