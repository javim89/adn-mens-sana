'use client';

import { ArrowDownRight, ArrowRight, ArrowUpRight } from 'lucide-react';
import { formatCompact } from '@/lib/insights/theme';
import { ChartEmpty } from './ChartChrome';
import { resolveFormat, resolveSeriesColumns, toNumber } from './helpers';
import { formatearDelta } from '../widget-resumen';
import type { ChartProps } from './types';

export interface KpiChartProps extends ChartProps {
  /**
   * Valor del período anterior (`vizConfig.compararPeriodo`). `undefined` = sin
   * comparación; `null` = se pidió pero todavía no hay dato (no se muestra nada).
   */
  anterior?: number | null;
}

export default function KpiChart({ data, config, columns, anterior }: KpiChartProps) {
  const measure = resolveSeriesColumns(columns, config)[0];
  if (!measure || data.length === 0) return <ChartEmpty />;

  const value = data[0][measure.id];
  const format = resolveFormat(config, measure);

  let variacion = null;
  if (anterior !== undefined && anterior !== null) {
    const delta = toNumber(value) - anterior;
    const bueno = config.invertDelta ? delta < 0 : delta > 0;
    const tono = delta === 0 ? 'text-muted-foreground' : bueno ? 'text-green-700' : 'text-red-700';
    const Flecha = delta === 0 ? ArrowRight : delta > 0 ? ArrowUpRight : ArrowDownRight;
    variacion = (
      <p className={`flex items-center gap-1 text-xs font-medium ${tono}`}>
        <Flecha size={14} aria-hidden />
        <span className="tabular-nums">{formatearDelta(delta, format)}</span>
        <span className="font-normal text-muted-foreground">vs. período anterior</span>
      </p>
    );
  }

  return (
    <div className="h-full w-full flex flex-col items-center justify-center gap-1 px-4 text-center">
      <p className="font-[family-name:var(--font-oswald)] text-4xl md:text-5xl font-semibold text-primario tabular-nums leading-none">
        {formatCompact(value, format)}
      </p>
      <p className="text-xs md:text-sm text-muted-foreground">{config.label ?? measure.label}</p>
      {variacion}
    </div>
  );
}
