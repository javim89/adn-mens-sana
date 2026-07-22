/**
 * Convierte un marcador de fecha de FullCalendar (medianoche UTC del día) a
 * clave `YYYY-MM-DD`. Usa getters UTC a propósito: leer con getters locales
 * corre la fecha un día para atrás en zonas horarias detrás de UTC (p. ej.
 * Argentina, UTC-3) y rompe el coloreo de celdas del calendario.
 */
export function utcDateKey(date: Date): string {
  const y = date.getUTCFullYear();
  const mo = String(date.getUTCMonth() + 1).padStart(2, '0');
  const da = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${mo}-${da}`;
}
