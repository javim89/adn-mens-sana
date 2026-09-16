'use client';

import {
  Cell,
  Legend,
  Pie,
  PieChart as RechartsPieChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { formatValue } from '@/lib/insights/theme';
import { ChartEmpty, ChartTooltip, LEGEND_PROPS } from './ChartChrome';
import {
  colorFor,
  formatCategory,
  resolveFormat,
  resolveSeriesColumns,
  resolveXColumn,
  toNumber,
} from './helpers';
import type { ChartProps } from './types';

/**
 * Torta y dona comparten todo salvo el radio interno, así que se parametriza.
 * Ambas grafican UNA medida repartida por UNA dimensión.
 */
export function PieChartBase({
  data,
  config,
  columns,
  donut,
}: ChartProps & { donut: boolean }) {
  const xColumn = resolveXColumn(columns, config);
  const measure = resolveSeriesColumns(columns, config)[0];

  if (!measure) return <ChartEmpty />;

  const slices = data
    .map((row) => ({
      name: formatCategory(xColumn ? row[xColumn.id] : null, xColumn),
      value: toNumber(row[measure.id]),
    }))
    // Un sector de valor 0 no se ve pero igual ocupa un color y una entrada en
    // la leyenda; se descarta para que la leyenda diga la verdad.
    .filter((s) => s.value > 0);

  if (slices.length === 0) return <ChartEmpty />;

  const format = resolveFormat(config, measure);
  const total = slices.reduce((acc, s) => acc + s.value, 0);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <RechartsPieChart margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
        <Pie
          data={slices}
          dataKey="value"
          nameKey="name"
          innerRadius={donut ? '55%' : 0}
          outerRadius="80%"
          paddingAngle={slices.length > 1 ? 1 : 0}
          isAnimationActive={false}
          label={
            config.showDataLabels
              ? ({ name, value }: { name?: string; value?: number }) =>
                  `${name}: ${formatValue(value, format)}`
              : undefined
          }
          labelLine={config.showDataLabels ?? false}
        >
          {slices.map((slice, i) => (
            <Cell key={slice.name} fill={colorFor(slice.name, i, config)} />
          ))}
        </Pie>
        <Tooltip
          content={(props) => (
            <ChartTooltip
              {...props}
              format={format}
              // El tooltip de torta rotula por sector, no por serie: el label de
              // cada entrada ya es el nombre de la categoría.
              seriesLabels={Object.fromEntries(slices.map((s) => [s.name, s.name]))}
            />
          )}
        />
        {(config.showLegend ?? true) && <Legend {...LEGEND_PROPS} />}
        {donut && total > 0 && (
          <text
            x="50%"
            y="45%"
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-[#121A61]"
            style={{ fontFamily: 'Oswald, sans-serif', fontSize: 20, fontWeight: 600 }}
          >
            {formatValue(total, format)}
          </text>
        )}
      </RechartsPieChart>
    </ResponsiveContainer>
  );
}

export default function PieChart(props: ChartProps) {
  return <PieChartBase {...props} donut={false} />;
}
