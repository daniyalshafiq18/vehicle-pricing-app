import { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell, Legend,
  ScatterChart, Scatter, ZAxis,
} from 'recharts';
import { formatCurrency, formatNumber } from '@utils';
import type { VehicleCountByMake, PriceDistribution, PriceByYear } from '@types';
import type { ScatterDataPoint, AgeDistribution } from '@types';

// ─── Color Palette ─────────────────────────────────────
const COLORS = [
  'hsl(var(--primary))', '#F59E0B', '#10B981', '#8B5CF6', '#EC4899',
  '#06B6D4', '#F97316', '#14B8A6', '#A855F7', '#E11D48',
];
const CHART_HEIGHT = 280;

const tooltipStyle = {
  background: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: '8px',
  fontSize: '12px',
};

// ─── Make all charts clickable ─────────────────────────

interface ChartClickProps {
  onVehicleSelect?: (vehicleId: string) => void;
}

// ═══════════════════════════════════════════════════════
// SECTION 1 — Top Vehicle Makes
// ═══════════════════════════════════════════════════════

interface TopMakesChartProps extends ChartClickProps {
  data: VehicleCountByMake[];
  onBarClick?: (make: string) => void;
}

export function TopMakesChart({ data, onBarClick, height = CHART_HEIGHT }: TopMakesChartProps & { height?: number }) {
  if (!data || data.length === 0) {
    return <EmptyState />;
  }
  const topData = data.slice(0, 10);
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={topData} layout="vertical" margin={{ top: 5, right: 20, left: 70, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
        <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} />
        <YAxis type="category" dataKey="make" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} width={70} />
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(_: number, name: string) => [name === 'count' ? formatNumber(_) : formatCurrency(_), name === 'count' ? 'Count' : 'Avg Price']}
        />
        <Bar
          dataKey="count"
          fill="hsl(var(--primary))"
          radius={[0, 4, 4, 0]}
          cursor="pointer"
          onClick={(entry: any) => onBarClick?.(entry.make)}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ═══════════════════════════════════════════════════════
// SECTION 2 — Price Distribution
// ═══════════════════════════════════════════════════════

interface PriceDistributionChartProps extends ChartClickProps {
  data: PriceDistribution[];
  onBarClick?: (range: string) => void;
}

export function PriceDistributionChart({ data, onBarClick, height = CHART_HEIGHT }: PriceDistributionChartProps & { height?: number }) {
  if (!data || data.length === 0) {
    return <EmptyState />;
  }
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis dataKey="range" stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} angle={-20} textAnchor="end" height={50} />
        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} />
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(value: number) => [formatNumber(value), 'Count']}
        />
        <Bar
          dataKey="count"
          fill="hsl(var(--primary))"
          radius={[4, 4, 0, 0]}
          cursor="pointer"
          onClick={(entry: any) => onBarClick?.(entry.range)}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ═══════════════════════════════════════════════════════
// SECTION 3 — Vehicle Value Trend (Line Chart)
// ═══════════════════════════════════════════════════════

interface ValueTrendChartProps extends ChartClickProps {
  data: PriceByYear[];
  onDotClick?: (year: number) => void;
}

export function ValueTrendChart({ data, onDotClick, height = CHART_HEIGHT }: ValueTrendChartProps & { height?: number }) {
  if (!data || data.length === 0) {
    return <EmptyState />;
  }
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="valueTrendGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.2} />
            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis dataKey="year" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} />
        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} />
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(value: number) => [formatCurrency(value), 'Avg Price']}
        />
        <Area
          type="monotone"
          dataKey="averagePrice"
          stroke="hsl(var(--primary))"
          strokeWidth={2}
          fill="url(#valueTrendGrad)"
          activeDot={{ r: 6, cursor: 'pointer', onClick: (_: any, payload: any) => onDotClick?.(payload.payload.year) }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ═══════════════════════════════════════════════════════
// SECTION 4 — Powertrain Composition (Donut)
// ═══════════════════════════════════════════════════════

export function PowertrainDonutChart({
  data,
  height = CHART_HEIGHT,
}: {
  data: { powertrain: string; count: number; percentage: number }[];
  height?: number;
}) {
  if (!data || data.length === 0) {
    return <EmptyState />;
  }
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          dataKey="count"
          nameKey="powertrain"
          cx="50%"
          cy="50%"
          outerRadius={100}
          innerRadius={60}
          paddingAngle={2}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(value: number, name: string) => [formatNumber(value), name]}
        />
        <Legend
          formatter={(value: string) => <span className="text-xs text-muted-foreground">{value}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

// ═══════════════════════════════════════════════════════
// SECTION 5 — Performance vs Value (Scatter)
// ═══════════════════════════════════════════════════════

interface PerformanceScatterChartProps extends ChartClickProps {
  data: ScatterDataPoint[];
  onDotClick?: (vehicleId: string) => void;
}

export function PerformanceScatterChart({ data, onDotClick, height = CHART_HEIGHT }: PerformanceScatterChartProps & { height?: number }) {
  if (!data || data.length === 0) {
    return <EmptyState />;
  }

  // Stable deterministic sampling — same data always produces the same sample
  const sampled = useMemo(() => {
    if (data.length <= 2000) return data;
    // Take every Nth item for a stable sample of ~1000 points
    const step = Math.ceil(data.length / 1000);
    return data.filter((_, i) => i % step === 0);
  }, [data]);

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ScatterChart margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis
          dataKey="horsepower"
          name="Horsepower"
          stroke="hsl(var(--muted-foreground))"
          fontSize={11}
          tickLine={false}
          type="number"
        />
        <YAxis
          dataKey="averagePrice"
          name="Avg Price"
          stroke="hsl(var(--muted-foreground))"
          fontSize={11}
          tickLine={false}
          tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`}
        />
        <ZAxis range={[16, 16]} />
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(value: number, name: string) => [
            name === 'averagePrice' ? formatCurrency(value) : value,
            name === 'averagePrice' ? 'Avg Price' : 'Horsepower',
          ]}
          labelFormatter={(_: any, payload: any[]) => {
            const d = payload[0]?.payload;
            return d ? `${d.make} ${d.model} ${d.spec}`.trim() : '';
          }}
        />
        <Scatter
          data={sampled}
          fill="hsl(var(--primary))"
          opacity={0.5}
          cursor="pointer"
          onClick={(entry: any) => onDotClick?.(entry.vehicleId)}
        />
      </ScatterChart>
    </ResponsiveContainer>
  );
}

// ═══════════════════════════════════════════════════════
// SECTION 6 — Vehicle Category Distribution (Body Type)
// ═══════════════════════════════════════════════════════

export function BodyTypeBarChart({
  data,
  height = CHART_HEIGHT,
}: {
  data: { bodyType: string; count: number; percentage: number; averagePrice: number }[];
  height?: number;
}) {
  if (!data || data.length === 0) {
    return <EmptyState />;
  }
  const topData = data.slice(0, 10);
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={topData} layout="vertical" margin={{ top: 5, right: 20, left: 80, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
        <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} />
        <YAxis type="category" dataKey="bodyType" stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} width={80} />
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(value: number, name: string) => [name === 'count' ? formatNumber(value) : `${value}%`, name === 'count' ? 'Count' : name]}
        />
        <Bar dataKey="count" fill="#10B981" radius={[0, 4, 4, 0]} barSize={16} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ═══════════════════════════════════════════════════════
// SECTION 7 — Vehicle Age Distribution (Area Chart)
// ═══════════════════════════════════════════════════════

interface AgeDistributionChartProps extends ChartClickProps {
  data: AgeDistribution[];
  onDotClick?: (year: number) => void;
}

export function AgeDistributionChart({ data, onDotClick, height = CHART_HEIGHT }: AgeDistributionChartProps & { height?: number }) {
  if (!data || data.length === 0) {
    return <EmptyState />;
  }
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="ageDistGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#06B6D4" stopOpacity={0.25} />
            <stop offset="95%" stopColor="#06B6D4" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis dataKey="year" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} />
        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} tickFormatter={(v: number) => formatNumber(v)} />
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(value: number) => [formatNumber(value), 'Count']}
        />
        <Area
          type="monotone"
          dataKey="count"
          stroke="#06B6D4"
          strokeWidth={2}
          fill="url(#ageDistGrad)"
          activeDot={{ r: 5, cursor: 'pointer', onClick: (_: any, payload: any) => onDotClick?.(payload.payload.year) }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ═══════════════════════════════════════════════════════
// SECTION 8 — Price Volatility Analysis (Box Plot style)
// ═══════════════════════════════════════════════════════

export function VolatilityBoxChart({
  data,
  height = CHART_HEIGHT,
}: {
  data: { category: string; min: number; q1: number; median: number; q3: number; max: number }[];
  height?: number;
}) {
  if (!data || data.length === 0) {
    return <EmptyState />;
  }
  const topData = data.slice(0, 8);
  const maxVal = Math.max(...topData.map((d) => d.max));
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={topData} layout="vertical" margin={{ top: 10, right: 20, left: 100, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
        <XAxis
          type="number"
          domain={[0, maxVal * 1.1]}
          stroke="hsl(var(--muted-foreground))"
          fontSize={11}
          tickLine={false}
          tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`}
        />
        <YAxis type="category" dataKey="category" stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} width={95} />
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(_: number, name: string) => [formatCurrency(_), name]}
          labelFormatter={(label: string) => `Category: ${label}`}
        />
        {/* Grouped bars showing min, avg, max */}
        <Bar dataKey="min" fill="#8B5CF6" opacity={0.7} radius={[0, 4, 4, 0]} barSize={8} name="Min Price" />
        <Bar dataKey="median" fill="#F59E0B" radius={[0, 4, 4, 0]} barSize={8} name="Median Price" />
        <Bar dataKey="max" fill="#EC4899" opacity={0.7} radius={[0, 4, 4, 0]} barSize={8} name="Max Price" />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ═══════════════════════════════════════════════════════
// SECTION 9 — Top Vehicle Models
// ═══════════════════════════════════════════════════════

interface TopModelsChartProps extends ChartClickProps {
  data: { model: string; make: string; count: number; averagePrice: number }[];
  onBarClick?: (model: string) => void;
}

export function TopModelsChart({ data, onBarClick, height = CHART_HEIGHT }: TopModelsChartProps & { height?: number }) {
  if (!data || data.length === 0) {
    return <EmptyState />;
  }
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ top: 5, right: 20, left: 100, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
        <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} />
        <YAxis type="category" dataKey="model" stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} width={95} />
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(value: number, name: string) => [name === 'count' ? formatNumber(value) : formatCurrency(value), name === 'count' ? 'Count' : 'Avg Price']}
          labelFormatter={(label: string) => label}
        />
        <Bar
          dataKey="count"
          fill="#F59E0B"
          radius={[0, 4, 4, 0]}
          barSize={16}
          cursor="pointer"
          onClick={(entry: any) => onBarClick?.(entry.model)}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ─── Empty State ───────────────────────────────────────
function EmptyState() {
  return (
    <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
      No data available
    </div>
  );
}
