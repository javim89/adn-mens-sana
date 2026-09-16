'use client';

import {
  Bar,
  CartesianGrid,
  Legend,
  Line,
  ComposedChart as RechartsComposedChart,
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

/**
 * Barras + línea sobre el mismo eje de categorías.
 *
 * Convención: la última medida se dibuja como línea y el resto como barras. Es
 * el caso típico de "cantidad (barras) contra porcentaje (línea)". Cuando las
 * dos series tienen formatos distintos, la línea va contra un eje Y derecho
 * propio, porque compartir escala entre un conteo y un porcentaje aplana la
 * serie chica hasta volverla ilegible.
 */
export default function ComposedChart({ data, config, columns }: ChartProps) {
  const xColumn = resolveXColumn(columns, config);
  const seriesColumns = resolveSeriesColumns(columns, config);
  const { rows, seriesKeys, seriesLabels } = buildChartData(data, xColumn, seriesColumns);

  if (rows.length === 0 || seriesKeys.length === 0) return <ChartEmpty />;

  const lineIndex = seriesKeys.length > 1 ? seriesKeys.length - 1 : -1;
  const barColumns = seriesColumns.filter((_, i) => i !== lineIndex);
  const lineColumn = lineIndex >= 0 ? seriesColumns[lineIndex] : undefined;

  const barFormat = resolveFormat(config, barColumns[0] ?? seriesColumns[0]);
  const lineFormat = resolveFormat(config, lineColumn);
  const needsRightAxis = !!lineColumn && lineFormat !== barFormat;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <RechartsComposedChart data={rows} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
        {(config.showGrid ?? true) && (
          <CartesianGrid stroke={CHART_TOKENS.grid} vertical={false} />
        )}
        <XAxis dataKey={X_KEY} {...AXIS_PROPS} />
        <YAxis
          yAxisId="left"
          {...AXIS_PROPS}
          width={48}
          tickFormatter={(v) => formatCompact(v, barFormat)}
        />
        {needsRightAxis && (
          <YAxis
            yAxisId="right"
            orientation="right"
            {...AXIS_PROPS}
            width={48}
            domain={lineFormat === 'percent' ? [0, 100] : undefined}
            tickFormatter={(v) => formatCompact(v, lineFormat)}
          />
        )}
        <Tooltip
          cursor={{ fill: CHART_TOKENS.cursor }}
          content={(props) => (
            <ChartTooltip {...props} format={barFormat} seriesLabels={seriesLabels} />
          )}
        />
        {(config.showLegend ?? true) && <Legend {...LEGEND_PROPS} />}
        {seriesKeys.map((key, i) =>
          i === lineIndex ? null : (
            <Bar
              key={key}
              yAxisId="left"
              dataKey={key}
              name={seriesLabels[key] ?? key}
              fill={colorFor(key, i, config)}
              radius={[4, 4, 0, 0]}
              isAnimationActive={false}
            />
          ),
        )}
        {lineColumn && (
          <Line
            yAxisId={needsRightAxis ? 'right' : 'left'}
            type="monotone"
            dataKey={seriesKeys[lineIndex]}
            name={seriesLabels[seriesKeys[lineIndex]] ?? seriesKeys[lineIndex]}
            stroke={colorFor(seriesKeys[lineIndex], lineIndex, config)}
            strokeWidth={2}
            dot={rows.length <= 30}
            isAnimationActive={false}
          />
        )}
      </RechartsComposedChart>
    </ResponsiveContainer>
  );
}
