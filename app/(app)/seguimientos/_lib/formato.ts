/** Iniciales para el avatar: primera letra del nombre y del apellido. */
export function inicialesDe(d: { nombre: string; apellido: string }): string {
  return `${d.nombre.trim().charAt(0)}${d.apellido.trim().charAt(0)}`.toUpperCase() || '?';
}

/**
 * Fecha corta de un `'YYYY-MM-DD'`: `'1/7'` dentro del año en curso y `'1/7/25'` si es
 * de otro año (sin el año, un seguimiento viejo se confundiría con uno reciente).
 */
export function fechaCorta(clave: string, hoy: Date = new Date()): string {
  const [anio, mes, dia] = clave.split('-').map(Number);
  if (!anio || !mes || !dia) return clave;
  const base = `${dia}/${mes}`;
  return anio === hoy.getFullYear() ? base : `${base}/${String(anio).slice(-2)}`;
}

/** `'01/07/2026'` de un `'YYYY-MM-DD'`, para el `title` de la fecha corta. */
export function fechaLarga(clave: string): string {
  const [anio, mes, dia] = clave.split('-');
  return anio && mes && dia ? `${dia}/${mes}/${anio}` : clave;
}
