'use client';

import type { ReactNode } from 'react';
import { CHART_TOKENS, formatValue } from '@/lib/insights/theme';
import type { ValueFormat } from '@/lib/insights/theme';

/**
 * Sub-conjunto del payload de recharts que consume el tooltip.
 *
 * `dataKey` admite además una función accessor porque así lo tipa recharts;
 * acá solo se usa como clave de texto, así que las funciones se descartan al
 * resolver el nombre de la serie.
 */
interface TooltipEntry {
  name?: string | number;
  value?: unknown;
  color?: string;
  dataKey?: string | number | ((obj: never) => unknown);
}

interface ChartTooltipProps {
  active?: boolean;
  payload?: ReadonlyArray<TooltipEntry>;
  /**
   * Recharts tipa `label` como `any` y le pasa al content ~30 props más. Se
   * acepta `unknown` y se estrecha al renderizar, así los call sites pueden
   * hacer `{...props}` sin pelearse con el tipo del paquete.
   */
  label?: unknown;
  format: ValueFormat;
  seriesLabels?: Record<string, string>;
}

/** Card blanca con borde suave, igual que el resto de las cards de la app. */
export function ChartTooltip({ active, payload, label, format, seriesLabels }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 px-3 py-2 text-xs">
      {(typeof label === 'string' || typeof label === 'number') && label !== '' && (
        <p className="font-medium text-[#1C1C1C] mb-1.5">{label}</p>
      )}
      <ul className="space-y-1">
        {payload.map((entry, i) => {
          const dataKey = typeof entry.dataKey === 'function' ? undefined : entry.dataKey;
          const key = String(dataKey ?? entry.name ?? i);
          return (
            <li key={key} className="flex items-center gap-2">
              <span
                className="inline-block w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-[#6B7280]">{seriesLabels?.[key] ?? entry.name ?? key}</span>
              <span className="ml-auto font-medium text-[#1C1C1C] tabular-nums">
                {formatValue(entry.value, format)}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export const AXIS_PROPS = {
  stroke: CHART_TOKENS.axis,
  tick: { fill: CHART_TOKENS.axisText, fontSize: CHART_TOKENS.axisFontSize },
  tickLine: false,
  axisLine: { stroke: CHART_TOKENS.axis },
} as const;

/** Leyenda abajo, chica, sin el cuadradito default gigante. */
export const LEGEND_PROPS = {
  verticalAlign: 'bottom',
  align: 'center',
  height: 28,
  iconType: 'circle',
  iconSize: 8,
  wrapperStyle: { fontSize: 11, color: CHART_TOKENS.axisText, paddingTop: 4 },
} as const;

export function ChartEmpty({ children = 'Sin datos para mostrar' }: { children?: ReactNode }) {
  return (
    <div className="h-full w-full flex items-center justify-center text-sm text-[#6B7280] px-4 text-center">
      {children}
    </div>
  );
}
