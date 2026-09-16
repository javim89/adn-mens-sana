'use client';

import { ArrowDownRight, ArrowRight, ArrowUpRight } from 'lucide-react';
import { formatCompact, formatValue } from '@/lib/insights/theme';
import { ChartEmpty } from './ChartChrome';
import { findColumn, resolveFormat, resolveSeriesColumns, toNumber } from './helpers';
import type { ChartProps } from './types';

export default function ComparisonChart({ data, config, columns }: ChartProps) {
  const series = resolveSeriesColumns(columns, config);
  const current = series[0];
  const baseline = findColumn(columns, config.baselineKey) ?? series[1];

  if (!current || !baseline || data.length === 0) return <ChartEmpty />;

  const row = data[0];
  const currentValue = toNumber(row[current.id]);
  const baselineValue = toNumber(row[baseline.id]);
  const format = resolveFormat(config, current);

  const delta = currentValue - baselineValue;
  const pct = baselineValue === 0 ? null : (delta / Math.abs(baselineValue)) * 100;

  const isFlat = delta === 0;
  const isGood = config.invertDelta ? delta < 0 : delta > 0;
  const tone = isFlat ? 'text-[#6B7280]' : isGood ? 'text-green-700' : 'text-red-700';
  const Arrow = isFlat ? ArrowRight : delta > 0 ? ArrowUpRight : ArrowDownRight;

  return (
    <div className="h-full w-full flex flex-col items-center justify-center gap-2 px-4 text-center">
      <p
        className="text-4xl md:text-5xl font-semibold text-[#121A61] tabular-nums leading-none"
        style={{ fontFamily: 'Oswald, sans-serif' }}
      >
        {formatCompact(currentValue, format)}
      </p>
      <p className="text-xs md:text-sm text-[#6B7280]">{config.label ?? current.label}</p>

      <div className={`flex items-center gap-1 text-sm font-medium ${tone}`}>
        <Arrow size={16} aria-hidden />
        <span className="tabular-nums">
          {pct === null ? formatValue(delta, format) : formatValue(pct, 'percent')}
        </span>
      </div>
      <p className="text-xs text-[#6B7280]">
        vs. {baseline.label}: {formatValue(baselineValue, format)}
      </p>
    </div>
  );
}
