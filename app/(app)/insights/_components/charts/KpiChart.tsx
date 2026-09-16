'use client';

import { formatCompact } from '@/lib/insights/theme';
import { ChartEmpty } from './ChartChrome';
import { resolveFormat, resolveSeriesColumns } from './helpers';
import type { ChartProps } from './types';

export default function KpiChart({ data, config, columns }: ChartProps) {
  const measure = resolveSeriesColumns(columns, config)[0];
  if (!measure || data.length === 0) return <ChartEmpty />;

  const value = data[0][measure.id];
  const format = resolveFormat(config, measure);

  return (
    <div className="h-full w-full flex flex-col items-center justify-center gap-1 px-4 text-center">
      <p
        className="text-4xl md:text-5xl font-semibold text-[#121A61] tabular-nums leading-none"
        style={{ fontFamily: 'Oswald, sans-serif' }}
      >
        {formatCompact(value, format)}
      </p>
      <p className="text-xs md:text-sm text-[#6B7280]">{config.label ?? measure.label}</p>
    </div>
  );
}
