'use client';

import { formatValue } from '@/lib/insights/theme';
import { ChartEmpty } from './ChartChrome';
import { formatCategory, resolveFormat, toNumber } from './helpers';
import type { ChartProps } from './types';

/**
 * Tabla de resultados.
 *
 * Scrollea dentro de su propia card (el widget vive en una grilla de alto fijo),
 * con el header pegado arriba. Las medidas van alineadas a la derecha y en
 * cifras tabulares para que las columnas de números se puedan comparar de un
 * vistazo; las dimensiones pasan por `formatCategory`, que traduce enums y
 * fechas al español.
 */
export default function DataTable({ data, config, columns }: ChartProps) {
  if (columns.length === 0 || data.length === 0) return <ChartEmpty />;

  return (
    <div className="h-full w-full overflow-auto">
      <table className="w-full text-sm border-collapse">
        <thead className="sticky top-0 z-10">
          <tr className="bg-[#F3F4F6]">
            {columns.map((col) => (
              <th
                key={col.id}
                scope="col"
                className={`px-3 py-2 font-medium text-[#1C1C1C] whitespace-nowrap border-b border-gray-100 ${
                  col.role === 'measure' ? 'text-right' : 'text-left'
                }`}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i} className="border-b border-gray-50 last:border-0 hover:bg-[#F9FAFB]">
              {columns.map((col) => {
                const value = row[col.id];
                const isMeasure = col.role === 'measure';
                return (
                  <td
                    key={col.id}
                    className={`px-3 py-2 whitespace-nowrap ${
                      isMeasure
                        ? 'text-right tabular-nums text-[#1C1C1C]'
                        : 'text-left text-[#6B7280]'
                    }`}
                  >
                    {isMeasure
                      ? formatValue(toNumber(value), resolveFormat(config, col))
                      : formatCategory(value, col)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
