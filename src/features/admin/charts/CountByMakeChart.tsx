import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { VehicleCountByMake } from '@types';
import { formatNumber } from '@utils';

interface CountByMakeChartProps {
  data: VehicleCountByMake[];
  height?: number;
}

export function CountByMakeChart({ data, height = 300 }: CountByMakeChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
        No data available
      </div>
    );
  }

  // Take top 10 makes
  const topData = data.slice(0, 10);

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={topData} layout="vertical" margin={{ top: 5, right: 30, left: 60, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
        <XAxis
          type="number"
          stroke="hsl(var(--muted-foreground))"
          fontSize={12}
          tickLine={false}
        />
        <YAxis
          type="category"
          dataKey="make"
          stroke="hsl(var(--muted-foreground))"
          fontSize={11}
          tickLine={false}
          width={80}
        />
        <Tooltip
          contentStyle={{
            background: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '8px',
          }}
          formatter={(value: number) => [formatNumber(value), 'Count']}
        />
        <Bar
          dataKey="count"
          fill="hsl(var(--primary))"
          radius={[0, 4, 4, 0]}
          barSize={20}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
