'use client';

import {
  Bar,
  CartesianGrid,
  Cell,
  LabelList,
  Legend,
  BarChart as RechartsBarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { CHART_TOKENS, formatCompact, formatValue } from '@/lib/insights/theme';
import { AXIS_PROPS, ChartEmpty, ChartTooltip, LEGEND_PROPS } from './ChartChrome';
import {
  X_KEY,
  buildChartData,
  colorFor,
  resolveBreakdownColumn,
  resolveFormat,
  resolveSeriesColumns,
  resolveXColumn,
  toPercentStack,
} from './helpers';
import type { ChartProps } from './types';

export type BarVariant = 'simple' | 'grouped' | 'stacked' | 'percent';

/**
 * Las cuatro variantes de barra comparten ejes, tooltip y leyenda; lo único que
 * cambia es de dónde salen las series y cómo se apilan, así que viven en un solo
 * componente parametrizado en lugar de cuatro archivos casi idénticos.
 *
 * - `simple`: una serie por medida, sin apilar.
 * - `grouped` / `stacked`: la segunda dimensión abre las series (pivot).
 * - `percent`: como `stacked`, pero cada fila normalizada a 100%.
 */
export function BarChartBase({
  data,
  config,
  columns,
  variant,
}: ChartProps & { variant: BarVariant }) {
  const xColumn = resolveXColumn(columns, config);
  const seriesColumns = resolveSeriesColumns(columns, config);

  // La variante simple nunca pivotea: si hay una segunda dimensión se ignora y
  // se grafica una serie por medida.
  const breakdownColumn =
    variant === 'simple' ? undefined : resolveBreakdownColumn(columns, config);

  const built = buildChartData(data, xColumn, seriesColumns, breakdownColumn);
  const { seriesKeys, seriesLabels } = built;
  const rows = variant === 'percent' ? toPercentStack(built.rows, seriesKeys) : built.rows;

  if (rows.length === 0 || seriesKeys.length === 0) return <ChartEmpty />;

  // En porcentual el eje siempre es 0–100, sin importar el formato de la medida.
  const format = variant === 'percent' ? 'percent' : resolveFormat(config, seriesColumns[0]);
  const stackId = variant === 'stacked' || variant === 'percent' ? 'stack' : undefined;
  const showLegend = config.showLegend ?? seriesKeys.length > 1;
  const horizontal = config.orientation === 'horizontal';

  // Una sola serie sin breakdown: se colorea por categoría, que es lo que se
  // espera al mirar "deportistas por disciplina" o un eje de niveles de triage.
  const colorByCategory = !breakdownColumn && seriesKeys.length === 1;

  const categoryAxis = <XAxis dataKey={X_KEY} {...AXIS_PROPS} />;
  const valueAxis = (
    <YAxis
      {...AXIS_PROPS}
      width={48}
      domain={variant === 'percent' ? [0, 100] : undefined}
      tickFormatter={(v) => formatCompact(v, format)}
    />
  );

  return (
    <ResponsiveContainer width="100%" height="100%">
      <RechartsBarChart
        data={rows}
        layout={horizontal ? 'vertical' : 'horizontal'}
        margin={{ top: 8, right: 12, left: 0, bottom: 0 }}
      >
        {(config.showGrid ?? true) && (
          <CartesianGrid stroke={CHART_TOKENS.grid} vertical={horizontal} horizontal={!horizontal} />
        )}
        {horizontal ? (
          <>
            <XAxis
              type="number"
              {...AXIS_PROPS}
              domain={variant === 'percent' ? [0, 100] : undefined}
              tickFormatter={(v) => formatCompact(v, format)}
            />
            <YAxis type="category" dataKey={X_KEY} {...AXIS_PROPS} width={120} />
          </>
        ) : (
          <>
            {categoryAxis}
            {valueAxis}
          </>
        )}
        <Tooltip
          cursor={{ fill: CHART_TOKENS.cursor }}
          content={(props) => (
            <ChartTooltip {...props} format={format} seriesLabels={seriesLabels} />
          )}
        />
        {showLegend && <Legend {...LEGEND_PROPS} />}
        {seriesKeys.map((key, i) => (
          <Bar
            key={key}
            dataKey={key}
            name={seriesLabels[key] ?? key}
            stackId={stackId}
            fill={colorFor(key, i, config)}
            radius={stackId ? 0 : [4, 4, 0, 0]}
            isAnimationActive={false}
          >
            {colorByCategory &&
              rows.map((row, idx) => (
                <Cell
                  key={String(row[X_KEY])}
                  fill={colorFor(String(row[X_KEY]), idx, config)}
                />
              ))}
            {config.showDataLabels && (
              <LabelList
                dataKey={key}
                position={stackId ? 'center' : 'top'}
                formatter={(v: unknown) => formatValue(v, format)}
                style={{ fontSize: 11, fill: CHART_TOKENS.axisText }}
              />
            )}
          </Bar>
        ))}
      </RechartsBarChart>
    </ResponsiveContainer>
  );
}

export default function BarChart(props: ChartProps) {
  return <BarChartBase {...props} variant="simple" />;
}
