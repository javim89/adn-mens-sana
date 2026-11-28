import { resumirPorCategoria } from '@/lib/utils/turnos';
import { diaCortoYFechaDb } from '../../dashboard/_lib/formato';

/** "MIÉ 30/9" desde una clave `'YYYY-MM-DD'`, para la línea chica del `TileFecha`. */
export function diaDelTile(clave: string): string {
  return diaCortoYFechaDb(new Date(`${clave}T00:00:00.000Z`));
}

/** "6ta división (12) · 5ta división (3)"; "Sin deportistas" si no hay. */
export function resumenCategorias(
  deportistas: readonly { categoria?: { nombre: string } | null }[],
): string {
  if (deportistas.length === 0) return 'Sin deportistas';
  return resumirPorCategoria(deportistas)
    .map((r) => `${r.categoria} (${r.cantidad})`)
    .join(' · ');
}
