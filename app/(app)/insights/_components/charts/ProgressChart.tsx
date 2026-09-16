'use client';

import { formatValue } from '@/lib/insights/theme';
import { ChartEmpty } from './ChartChrome';
import { colorFor, resolveFormat, resolveSeriesColumns, toNumber } from './helpers';
import type { ChartProps } from './types';

export default function ProgressChart({ data, config, columns }: ChartProps) {
  const measure = resolveSeriesColumns(columns, config)[0];
  if (!measure || data.length === 0) return <ChartEmpty />;

  const value = toNumber(data[0][measure.id]);
  const format = resolveFormat(config, measure);
  // Sin objetivo configurado, 100 es el default razonable para porcentajes.
  const target = config.target ?? 100;
  const ratio = target === 0 ? 0 : value / target;
  const pct = Math.min(100, Math.max(0, ratio * 100));
  const color = colorFor(measure.id, 0, config);

  return (
    <div className="h-full w-full flex flex-col justify-center gap-3 px-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span
          className="text-3xl font-semibold text-[#121A61] tabular-nums leading-none"
          style={{ fontFamily: 'Oswald, sans-serif' }}
        >
          {formatValue(value, format)}
        </span>
        <span className="text-xs text-[#6B7280]">
          Objetivo: {formatValue(target, format)}
        </span>
      </div>

      <div
        className="h-3 w-full rounded-full bg-[#F3F4F6] overflow-hidden"
        role="progressbar"
        aria-label={config.label ?? measure.label}
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full rounded-full transition-[width] duration-300"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs text-[#6B7280]">{config.label ?? measure.label}</span>
        <span className="text-xs font-medium text-[#1C1C1C] tabular-nums">
          {formatValue(ratio * 100, 'percent')}
        </span>
      </div>
    </div>
  );
}
