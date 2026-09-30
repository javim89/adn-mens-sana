/**
 * Fechas en la zona horaria del club.
 *
 * El módulo de viandas registra la cena entre las 20 y las 22 ART, que en UTC ya
 * es el día siguiente: `new Date().toISOString().slice(0, 10)` guardaría la cena
 * del sábado como del domingo. Tampoco alcanza con los getters locales, porque la
 * TZ del proceso (Netlify corre en UTC) no es la del club.
 *
 * De ahí que todo pase por `Intl.DateTimeFormat` con `timeZone` explícito.
 */
export const TZ_CLUB = 'America/Argentina/Buenos_Aires';

/**
 * Armamos la clave leyendo `formatToParts()` por tipo en vez de concatenar el
 * `format()` de un locale como `'en-CA'`. Depender de que ese locale emita los
 * literales en orden `YYYY-MM-DD` es una suposición que se rompe EN SILENCIO con
 * un bump de ICU, y el síntoma sería registrar el día equivocado — justo el bug
 * que este archivo existe para evitar. Mismo criterio que los getters UTC
 * explícitos de `toDateString` (`lib/queries/calendario.ts`) y `utcDateKey`.
 */
const FORMATO_FECHA = new Intl.DateTimeFormat('en-US', {
  timeZone: TZ_CLUB,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** `hourCycle: 'h23'` y no `hour12: false`: este último puede devolver `'24'` a medianoche. */
const FORMATO_HORA = new Intl.DateTimeFormat('en-US', {
  timeZone: TZ_CLUB,
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

function parte(partes: Intl.DateTimeFormatPart[], tipo: Intl.DateTimeFormatPartTypes): string {
  const encontrada = partes.find((p) => p.type === tipo);
  if (!encontrada) throw new Error(`Intl no devolvió la parte "${tipo}" de la fecha`);
  return encontrada.value;
}

/** `'YYYY-MM-DD'` del día en curso EN LA ZONA DEL CLUB, sea cual sea la TZ del proceso. */
export function hoyEnArgentina(now: Date = new Date()): string {
  const partes = FORMATO_FECHA.formatToParts(now);
  return `${parte(partes, 'year')}-${parte(partes, 'month')}-${parte(partes, 'day')}`;
}

/**
 * ¿`valor` es una clave `'YYYY-MM-DD'` de un día que existe?
 *
 * La regex sola no alcanza: `'2026-02-31'` la pasa y `fechaDbDesdeClave` devolvería
 * el 3 de marzo — leer un día que nadie pidió. El round-trip por `toISOString` lo
 * descarta. Devuelve booleano y no `throw` porque el llamador recibe input de la
 * URL y tiene que poder degradar a hoy en vez de romper el render.
 */
export function esClaveFechaValida(valor: unknown): valor is string {
  if (typeof valor !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;
  const d = new Date(`${valor}T00:00:00.000Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === valor;
}

/**
 * Qué día tiene que mostrar `/viandas`, a partir del `?fecha=` de la URL.
 *
 * Las tres reglas del histórico, en un solo lugar y sin tocar Clerk ni la base,
 * así se pueden testear sin sesión:
 *
 * 1. **Admin-only.** Si no es admin el param se ignora, aunque sea válido. Un
 *    `responsable_viandas` que arma la URL a mano ve hoy.
 * 2. **Nunca futura ni inválida.** La comparación `<=` es lexicográfica y es
 *    correcta porque el formato es ISO.
 * 3. **Degrada a hoy**, no tira ni redirige: una fecha basura en la URL no
 *    amerita una pantalla de error, y así `fechaDbDesdeClave` (que TIRA) nunca
 *    ve un string sin validar.
 *
 * `param` es `unknown` porque viene de `searchParams`, donde puede ser un array.
 */
export function resolverFechaActiva(isAdmin: boolean, param: unknown, hoy: string): string {
  return isAdmin && esClaveFechaValida(param) && param <= hoy ? param : hoy;
}

/**
 * `'YYYY-MM-DD'` → `Date` a medianoche UTC, que es lo que Prisma escribe y lee en
 * una columna `@db.Date`. Es el inverso explícito de `toDateString`.
 */
export function fechaDbDesdeClave(clave: string): Date {
  if (!esClaveFechaValida(clave)) {
    throw new Error(`Clave de fecha inválida: "${clave}" (se espera YYYY-MM-DD)`);
  }
  return new Date(`${clave}T00:00:00.000Z`);
}

/** `'HH:mm'` en la zona del club, para mostrar el `createdAt` de una entrega. */
export function horaEnArgentina(d: Date): string {
  const partes = FORMATO_HORA.formatToParts(d);
  return `${parte(partes, 'hour')}:${parte(partes, 'minute')}`;
}

/** `'dd/mm/yyyy'` legible desde una clave `'YYYY-MM-DD'`. */
export function formatearClaveFecha(clave: string): string {
  const [anio, mes, dia] = clave.split('-');
  return `${dia}/${mes}/${anio}`;
}
