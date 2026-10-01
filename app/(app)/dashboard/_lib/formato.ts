/**
 * Formateo de fechas para las filas del dashboard.
 *
 * **La distinción que importa:** las columnas "de fecha" (`@db.Date`, y también
 * `turnos.fecha` / `proxima_cita`, que se escriben con `new Date('YYYY-MM-DD')`)
 * llegan como medianoche UTC y se tienen que leer con getters **UTC**: pasarlas por
 * un formateador con `timeZone: TZ_CLUB` las correría al día anterior, porque
 * medianoche UTC son las 21:00 del día previo en Argentina. Es el mismo criterio que
 * `toDateString` en `lib/queries/calendario.ts`.
 *
 * Los timestamps reales (`triage.calculated_at`) son el caso opuesto y sí van por
 * `TZ_CLUB`.
 */
import { TZ_CLUB, formatearClaveFecha } from '@/lib/utils/fecha';

const MESES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

const DIAS_CORTOS = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'];

/** `'YYYY-MM-DD'` de una columna de fecha, sin corrimiento de zona. */
export function claveDesdeFechaDb(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** `'dd/mm/yyyy'` de una columna de fecha. */
export function fechaDb(d: Date): string {
  return formatearClaveFecha(claveDesdeFechaDb(d));
}

/** `'9 de marzo'` de una columna de fecha. Para rangos y subtítulos. */
export function diaYMesDb(d: Date): string {
  return `${d.getUTCDate()} de ${MESES[d.getUTCMonth()]}`;
}

/** `'lunes 9/3'` de una columna de fecha. Para las filas de turnos y eventos. */
export function diaSemanaYFechaDb(d: Date): string {
  return `${DIAS[d.getUTCDay()]} ${d.getUTCDate()}/${d.getUTCMonth() + 1}`;
}

/** `'MIÉ 30/9'` de una columna de fecha. Para el bloque de fecha de los tiles. */
export function diaCortoYFechaDb(d: Date): string {
  return `${DIAS_CORTOS[d.getUTCDay()]} ${d.getUTCDate()}/${d.getUTCMonth() + 1}`;
}

/** `'MIÉ'` de una columna de fecha. */
export function diaCortoDb(d: Date): string {
  return DIAS_CORTOS[d.getUTCDay()];
}

/** `'30/9'` de una columna de fecha. */
export function diaYMesCortoDb(d: Date): string {
  return `${d.getUTCDate()}/${d.getUTCMonth() + 1}`;
}

/**
 * `'9 de marzo'` de un TIMESTAMP REAL, leído en la zona del club.
 *
 * Es el único formateador de este archivo que usa `TZ_CLUB`, y se usa solo para
 * `triage.calculated_at`: una corrida del cron a las 02:00 ART es del día anterior en
 * UTC, y decir el día equivocado en "comparado con el snapshot del …" haría dudar del
 * número entero.
 */
export function diaYMesInstante(d: Date): string {
  const partes = new Intl.DateTimeFormat('en-US', {
    timeZone: TZ_CLUB,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(d);
  const valor = (tipo: string) => partes.find((p) => p.type === tipo)?.value ?? '';
  return `${Number(valor('day'))} de ${MESES[Number(valor('month')) - 1]}`;
}

/** `'del 9 al 15 de marzo'` — el subtítulo de la semana. */
export function rangoSemana(desdeClave: string, hastaClave: string): string {
  const desde = new Date(`${desdeClave}T00:00:00.000Z`);
  const hasta = new Date(`${hastaClave}T00:00:00.000Z`);
  // Mismo mes: no se repite el nombre ("del 9 al 15 de marzo").
  if (desde.getUTCMonth() === hasta.getUTCMonth()) {
    return `del ${desde.getUTCDate()} al ${diaYMesDb(hasta)}`;
  }
  return `del ${diaYMesDb(desde)} al ${diaYMesDb(hasta)}`;
}

/** `'Ana Torres'` o `'Ana Torres y 2 más'`, para no romper el layout de una fila. */
export function listaDeportistas(
  deportistas: { nombre: string; apellido: string }[],
  visibles = 1,
): string {
  if (deportistas.length === 0) return 'Sin deportistas';
  const nombres = deportistas
    .slice(0, visibles)
    .map((d) => `${d.nombre} ${d.apellido}`.trim());
  const resto = deportistas.length - visibles;
  return resto > 0 ? `${nombres.join(', ')} y ${resto} más` : nombres.join(', ');
}
