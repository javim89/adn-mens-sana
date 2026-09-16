/**
 * Export a CSV de los datos ya resueltos de un widget.
 *
 * Trabaja sobre lo que el widget tiene en memoria: no vuelve a consultar, así
 * que lo que se descarga es exactamente lo que se está viendo.
 */

import { formatValue } from './theme';
import type { ColumnMeta, Row } from './types';

/** Un campo va entre comillas si trae separador, comilla o salto de línea. */
function escapeCell(value: string): string {
  if (/[";\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Traduce un valor de dimensión a su label visible.
 *
 * Mismo criterio que `formatCategory` de los charts: los enums salen en
 * español y los vacíos como "Sin dato", para que el CSV diga lo mismo que la
 * pantalla.
 */
function cellLabel(value: unknown, column: ColumnMeta): string {
  if (value === null || value === undefined || value === '') return 'Sin dato';
  if (typeof value === 'boolean') return value ? 'Sí' : 'No';

  const raw = String(value);
  if (column.role === 'measure') {
    return formatValue(value, column.format ?? 'decimal');
  }
  if (column.enumLabels?.[raw]) return column.enumLabels[raw];
  if (column.type === 'date') {
    const d = new Date(raw);
    if (!Number.isNaN(d.getTime())) {
      // `timeZone: 'UTC'` es obligatorio: las fechas del motor son fechas de
      // calendario (columnas `date` y `date_trunc`), que llegan como medianoche
      // UTC. Formatearlas en la zona local (UTC-3) las correría un día para
      // atrás y el 08/03 se mostraría como 07/03.
      return new Intl.DateTimeFormat('es-AR', {
        timeZone: 'UTC',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }).format(d);
    }
  }
  return raw;
}

/**
 * Serializa a CSV.
 *
 * Separador `;` y no `,`: el formato es es-AR, donde el decimal es la coma
 * (`22,85`), y con separador `,` Excel parte los números al medio. `;` es lo
 * que Excel espera en configuración regional española.
 */
export function toCsv(data: Row[], columns: ColumnMeta[]): string {
  const header = columns.map((c) => escapeCell(c.label)).join(';');
  const rows = data.map((row) =>
    columns.map((col) => escapeCell(cellLabel(row[col.id], col))).join(';'),
  );
  return [header, ...rows].join('\r\n');
}

/** Nombre de archivo seguro a partir del título del widget. */
export function csvFilename(titulo: string): string {
  const base = titulo
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
  const fecha = new Date().toISOString().slice(0, 10);
  return `${base || 'insights'}-${fecha}.csv`;
}

/**
 * Dispara la descarga en el browser.
 *
 * El BOM inicial es necesario para que Excel abra el archivo como UTF-8; sin
 * él, los acentos y las eñes salen corruptos.
 */
export function downloadCsv(titulo: string, data: Row[], columns: ColumnMeta[]): void {
  const csv = toCsv(data, columns);
  const blob = new Blob(['﻿', csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = csvFilename(titulo);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
