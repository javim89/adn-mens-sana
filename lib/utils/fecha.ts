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

/** Fecha + hora del club en un solo `formatToParts`, para derivar el offset UTC. */
const FORMATO_INSTANTE = new Intl.DateTimeFormat('en-US', {
  timeZone: TZ_CLUB,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
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

// ---------------------------------------------------------------------------
// Semana ISO del club (lunes → domingo)
// ---------------------------------------------------------------------------

/**
 * CONVIVEN DOS NOCIONES DE SEMANA EN EL REPO, Y ES A PROPÓSITO.
 *
 * - `weekWindow()` (`lib/triage/data.ts`) es **rolling 7 días** y alimenta el
 *   scoring de ausencias del triage. Cambiarla movería puntajes históricos.
 * - Lo de acá abajo es la semana **ISO de reporte**, anclada a lunes en la zona
 *   del club, porque cuando el usuario dice "esta semana" / "la semana anterior"
 *   se refiere a la semana calendario.
 *
 * NO unificarlas: si el dashboard usara la ventana rolling, su número dejaría de
 * coincidir con el del listado y con el del scoring. Quedan alineadas por
 * construcción porque el cron de triage corre `"0 11 * * 1"` (lunes 11:00 UTC =
 * 08:00 ART), o sea que el snapshot semanal cae dentro de la semana ISO en ART.
 */
export interface RangoSemana {
  /** `'YYYY-MM-DD'` del lunes. */
  desdeClave: string;
  /** `'YYYY-MM-DD'` del domingo. INCLUSIVO, y existe solo para mostrar. */
  hastaClave: string;
  /** Lunes a medianoche UTC → para columnas de FECHA (`@db.Date` o fecha por convención). */
  desdeDb: Date;
  /** Lunes+7 a medianoche UTC → borde superior EXCLUSIVO de las columnas de fecha. */
  finExclusivoDb: Date;
  /** El instante en que empieza el lunes EN EL CLUB → para columnas de TIMESTAMP real. */
  desdeInstante: Date;
  /** El instante en que empieza el lunes siguiente. Borde superior EXCLUSIVO. */
  finExclusivoInstante: Date;
}

/**
 * Minutos de offset respecto de UTC que tiene la zona del club en el instante `d`
 * (Argentina: siempre `-180`, pero no se hardcodea).
 *
 * Se leen las partes en `TZ_CLUB` y se reinterpretan con `Date.UTC`. NO se usa
 * `timeZoneName: 'longOffset'` por la misma razón que el resto del archivo no
 * concatena el `format()` de un locale: parsear `'GMT-03:00'` es depender de un
 * string de formato que un bump de ICU puede cambiar en silencio.
 */
function offsetMinutos(d: Date): number {
  const p = FORMATO_INSTANTE.formatToParts(d);
  const comoSiFueraUtc = Date.UTC(
    Number(parte(p, 'year')),
    Number(parte(p, 'month')) - 1,
    Number(parte(p, 'day')),
    Number(parte(p, 'hour')),
    Number(parte(p, 'minute')),
    Number(parte(p, 'second')),
  );
  // El instante se trunca al segundo porque las partes no traen milisegundos:
  // sin truncar, el resto se colaría como un offset de fracción de minuto.
  return (comoSiFueraUtc - Math.floor(d.getTime() / 1000) * 1000) / 60_000;
}

/**
 * El instante exacto en que arranca el día `clave` EN EL CLUB.
 *
 * Dos pasadas: la primera estima el offset mirando la medianoche UTC del día, la
 * segunda lo revalida sobre el candidato. En Argentina las dos dan lo mismo
 * (no hay DST), pero la revalidación es lo que haría correcto el cálculo si
 * alguna vez volviera el horario de verano.
 */
function instanteMedianocheClub(clave: string): Date {
  const base = fechaDbDesdeClave(clave).getTime();
  const primero = offsetMinutos(new Date(base));
  const candidato = base - primero * 60_000;
  const segundo = offsetMinutos(new Date(candidato));
  return new Date(segundo === primero ? candidato : base - segundo * 60_000);
}

/**
 * Suma (o resta) días a una clave `'YYYY-MM-DD'`.
 *
 * Es exacto porque la clave se materializa a medianoche UTC y en UTC no hay DST,
 * así que un día son siempre 86.400.000 ms.
 */
export function sumarDiasClave(clave: string, dias: number): string {
  const d = new Date(fechaDbDesdeClave(clave).getTime() + dias * 86_400_000);
  return d.toISOString().slice(0, 10);
}

/** Día de la semana ISO de una clave: lunes = 1 … domingo = 7. */
export function diaSemanaIso(clave: string): number {
  const dia = fechaDbDesdeClave(clave).getUTCDay(); // 0 = domingo
  return dia === 0 ? 7 : dia;
}

/** La semana ISO (lunes → domingo) que contiene al día `clave`. */
export function semanaDeClave(clave: string): RangoSemana {
  const lunes = sumarDiasClave(clave, 1 - diaSemanaIso(clave));
  const lunesSiguiente = sumarDiasClave(lunes, 7);

  return {
    desdeClave: lunes,
    hastaClave: sumarDiasClave(lunes, 6),
    desdeDb: fechaDbDesdeClave(lunes),
    finExclusivoDb: fechaDbDesdeClave(lunesSiguiente),
    desdeInstante: instanteMedianocheClub(lunes),
    finExclusivoInstante: instanteMedianocheClub(lunesSiguiente),
  };
}

/**
 * La semana en curso, según el día del club.
 *
 * El `now` explícito no es solo para los tests: el caso que justifica todo este
 * bloque es `'2026-03-16T02:30:00Z'`, que es **lunes en UTC** pero domingo 23:30
 * en ART, así que la semana correcta es la que arranca el 2026-03-09. Cualquier
 * implementación con getters UTC devuelve la semana equivocada ahí.
 */
export function semanaActual(now: Date = new Date()): RangoSemana {
  return semanaDeClave(hoyEnArgentina(now));
}

/** La semana anterior a la en curso. Es el baseline de comparación del dashboard. */
export function semanaAnterior(now: Date = new Date()): RangoSemana {
  return semanaDeClave(sumarDiasClave(hoyEnArgentina(now), -7));
}
