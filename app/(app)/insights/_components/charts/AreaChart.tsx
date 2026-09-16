'use client';

import {
  Area,
  AreaChart as RechartsAreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { CHART_TOKENS, formatCompact } from '@/lib/insights/theme';
import { AXIS_PROPS, ChartEmpty, ChartTooltip, LEGEND_PROPS } from './ChartChrome';
import {
  X_KEY,
  buildChartData,
  colorFor,
  resolveFormat,
  resolveSeriesColumns,
  resolveXColumn,
} from './helpers';
import type { ChartProps } from './types';

export default function AreaChart({ data, config, columns }: ChartProps) {
  const xColumn = resolveXColumn(columns, config);
  const seriesColumns = resolveSeriesColumns(columns, config);
  const { rows, seriesKeys, seriesLabels } = buildChartData(data, xColumn, seriesColumns);

  if (rows.length === 0 || seriesKeys.length === 0) return <ChartEmpty />;

  const format = resolveFormat(config, seriesColumns[0]);
  const showLegend = config.showLegend ?? seriesKeys.length > 1;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <RechartsAreaChart data={rows} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
        <defs>
          {seriesKeys.map((key, i) => (
            <linearGradient key={key} id={`insights-area-${key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={colorFor(key, i, config)} stopOpacity={0.28} />
              <stop offset="100%" stopColor={colorFor(key, i, config)} stopOpacity={0.02} />
            </linearGradient>
          ))}
        </defs>
        {(config.showGrid ?? true) && (
          <CartesianGrid stroke={CHART_TOKENS.grid} vertical={false} />
        )}
        <XAxis dataKey={X_KEY} {...AXIS_PROPS} />
        <YAxis {...AXIS_PROPS} tickFormatter={(v) => formatCompact(v, format)} width={48} />
        <Tooltip
          cursor={{ stroke: CHART_TOKENS.axis }}
          content={(props) => (
            <ChartTooltip {...props} format={format} seriesLabels={seriesLabels} />
          )}
        />
        {showLegend && <Legend {...LEGEND_PROPS} />}
        {seriesKeys.map((key, i) => (
          <Area
            key={key}
            type="monotone"
            dataKey={key}
            name={seriesLabels[key] ?? key}
            stroke={colorFor(key, i, config)}
            strokeWidth={2}
            fill={`url(#insights-area-${key})`}
            isAnimationActive={false}
          />
        ))}
      </RechartsAreaChart>
    </ResponsiveContainer>
  );
}
