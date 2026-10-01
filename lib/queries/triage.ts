import { prisma } from '@/lib/db';
import { Prisma } from '@/lib/generated/prisma/client';
import type { NivelTriage } from '@/lib/generated/prisma/enums';
import { NIVEL_TRIAGE_LABELS } from '@/lib/utils/enum-labels';

/**
 * `DISTINCT ON` + este `ORDER BY` son un par indivisible: el `DISTINCT ON` se
 * queda con la PRIMERA fila de cada grupo según el `ORDER BY`, así que
 * `deportista_id` tiene que ir primero (para que el DISTINCT sea válido) y
 * `calculated_at DESC` segundo (para que la fila que sobrevive sea la más
 * reciente). Invertirlos devuelve el snapshot más viejo en silencio.
 *
 * Están extraídos porque los usan `getNivelTriageActual` y los dos CTEs de
 * `getDistribucionTriage`: tres copias del mismo par eran tres lugares donde
 * podía driftear.
 */
const SQL_SNAPSHOT_VIGENTE = Prisma.sql`DISTINCT ON (triage.deportista_id)`;
const SQL_ORDEN_SNAPSHOT_VIGENTE = Prisma.sql`ORDER BY triage.deportista_id, triage.calculated_at DESC`;

/**
 * `triage` es una tabla append-only de snapshots: cada recálculo agrega una fila.
 * El nivel "actual" es la última fila por deportista, algo que no se puede expresar
 * con un `where` de relación de Prisma, así que va en SQL crudo con `DISTINCT ON`
 * (mismo patrón que el dataset `triage_ultimo` de insights, y aprovecha el índice
 * `(deportista_id, calculated_at)`).
 */
export async function getNivelTriageActual(
  deportistaIds?: string[],
): Promise<Map<string, NivelTriage>> {
  // `Prisma.join([])` lanza error, y un filtro vacío no tiene resultados posibles.
  if (deportistaIds && deportistaIds.length === 0) {
    return new Map();
  }

  const whereClause = deportistaIds
    ? Prisma.sql`WHERE triage.deportista_id IN (${Prisma.join(deportistaIds)})`
    : Prisma.empty;

  const rows = await prisma.$queryRaw<{ deportista_id: string; nivel: NivelTriage }[]>(
    Prisma.sql`
      SELECT ${SQL_SNAPSHOT_VIGENTE}
        triage.deportista_id,
        triage.nivel
      FROM triage
      ${whereClause}
      ${SQL_ORDEN_SNAPSHOT_VIGENTE}
    `,
  );

  return new Map(rows.map((row) => [row.deportista_id, row.nivel]));
}

/** Los 4 niveles, siempre presentes y en cero si no hay filas. */
export type ConteoPorNivel = Record<NivelTriage, number>;

export interface DistribucionTriage {
  /** Nivel vigente hoy: última fila por deportista ACTIVO. Los 4 niveles, con zero-fill. */
  actual: ConteoPorNivel;
  /**
   * La foto tal como estaba al cerrar la semana pasada, o `null` si NO HAY BASE.
   *
   * `null` y "todo en cero" son cosas distintas y no se pueden confundir: con la
   * base sin seed de triage el cron escribe filas *dentro* de la semana actual, así
   * que `null` es el camino por defecto del día 1. La UI tiene que decir "sin
   * comparación previa" — nunca 0%, nunca `NaN`, nunca `Infinity`.
   */
  previo: ConteoPorNivel | null;
  /** `MAX(calculated_at)` del baseline: si el cron falló una semana, la UI dice "vs. 9 de marzo". */
  ultimoPrevio: Date | null;
  /** Deportistas ACTIVOS con al menos un snapshot. */
  totalConTriage: number;
  /**
   * Deportistas ACTIVOS sin ningún snapshot. Es OBLIGATORIO mostrarlo: sin este
   * bucket, con la base sin seed la distribución muestra 0/0/0/0 y esconde que hay
   * ~250 deportistas sin calcular, que es justamente la información útil.
   */
  sinCalcular: number;
  /** Denominador de la barra: todos los deportistas ACTIVOS. */
  totalActivos: number;
}

type FilaDistribucion = {
  nivel: NivelTriage;
  actual: number;
  previo: number;
  total_previo: number;
  ultimo_previo: Date | null;
};

function conteoVacio(): ConteoPorNivel {
  // Zero-fill desde las claves de NIVEL_TRIAGE_LABELS y no con `enum_range` de
  // Postgres: menos supuestos sobre cómo se llama el tipo en la base, y mockeable.
  return Object.fromEntries(
    Object.keys(NIVEL_TRIAGE_LABELS).map((nivel) => [nivel, 0]),
  ) as ConteoPorNivel;
}

/**
 * Distribución de triage de los deportistas ACTIVOS, hoy y al cierre del corte.
 *
 * **Por qué compara snapshots y no "las dos últimas filas por deportista":**
 * además de la corrida semanal del cron hay recálculos ad-hoc (`recomputeOne` vía
 * `recomputeTriageAction`), así que "las dos últimas filas" daría un baseline
 * arbitrario. La definición es: nivel vigente = última fila; nivel previo = última
 * fila con `calculated_at < corte`, o sea la foto tal como estaba al cerrar la
 * semana pasada, sin importar cuántos recálculos ad-hoc hubo en el medio.
 *
 * **`corteInstante` es `desdeInstante`, NO `desdeDb`**: `calculated_at` es un
 * timestamp real (`now()`), no una fecha. Pasar el borde de fecha correría el corte
 * 3 horas y mal-clasificaría una corrida del cron entre 00:00 y 03:00 ART.
 *
 * **Solo cuenta ACTIVOS, y eso no es opcional**: la card linkea a
 * `?filter[nivelTriage]=X&filter[estado]=ACTIVO`, y el número tiene que coincidir
 * con el listado que abre. `getDeportistas` con `filter[nivelTriage]` NO filtra por
 * estado, así que el estado va explícito en los dos lados.
 *
 * **`::int` en todos los `COUNT(*)`**: sin el cast Postgres devuelve `bigint`,
 * Prisma lo entrega como `BigInt` y el render / `JSON.stringify` explotan. El repo
 * ya se comió esto en `lib/insights/run.ts:29`.
 */
export async function getDistribucionTriage(
  corteInstante: Date,
): Promise<DistribucionTriage> {
  const [filas, totalActivos] = await Promise.all([
    prisma.$queryRaw<FilaDistribucion[]>(Prisma.sql`
      WITH activos AS (
        SELECT id FROM deportistas WHERE estado = 'ACTIVO'
      ),
      vigente AS (
        SELECT ${SQL_SNAPSHOT_VIGENTE}
          triage.deportista_id,
          triage.nivel
        FROM triage
        JOIN activos ON activos.id = triage.deportista_id
        ${SQL_ORDEN_SNAPSHOT_VIGENTE}
      ),
      previo AS (
        SELECT ${SQL_SNAPSHOT_VIGENTE}
          triage.deportista_id,
          triage.nivel,
          triage.calculated_at
        FROM triage
        JOIN activos ON activos.id = triage.deportista_id
        WHERE triage.calculated_at < ${corteInstante}
        ${SQL_ORDEN_SNAPSHOT_VIGENTE}
      ),
      conteo_actual AS (
        SELECT nivel, COUNT(*)::int AS cantidad FROM vigente GROUP BY nivel
      ),
      conteo_previo AS (
        SELECT nivel, COUNT(*)::int AS cantidad FROM previo GROUP BY nivel
      ),
      meta AS (
        SELECT COUNT(*)::int AS total_previo, MAX(calculated_at) AS ultimo_previo FROM previo
      )
      SELECT COALESCE(a.nivel, p.nivel)::text AS nivel,
             COALESCE(a.cantidad, 0) AS actual,
             COALESCE(p.cantidad, 0) AS previo,
             meta.total_previo,
             meta.ultimo_previo
      FROM conteo_actual a
      FULL OUTER JOIN conteo_previo p ON p.nivel = a.nivel
      CROSS JOIN meta
    `),
    prisma.deportista.count({ where: { estado: 'ACTIVO' } }),
  ]);

  const actual = conteoVacio();
  const previo = conteoVacio();
  let totalPrevio = 0;
  let ultimoPrevio: Date | null = null;
  let totalConTriage = 0;

  for (const fila of filas) {
    // Un nivel que no esté en el catálogo de TS se ignora en vez de romper el
    // render: la barra prefiere quedar corta antes que tirar la página entera.
    if (!(fila.nivel in actual)) continue;
    actual[fila.nivel] = fila.actual;
    previo[fila.nivel] = fila.previo;
    totalConTriage += fila.actual;
    totalPrevio = fila.total_previo;
    if (fila.ultimo_previo) ultimoPrevio = fila.ultimo_previo;
  }

  return {
    actual,
    // Sin ninguna fila antes del corte no hay base: `null`, no un objeto en cero.
    previo: totalPrevio > 0 ? previo : null,
    ultimoPrevio: totalPrevio > 0 ? ultimoPrevio : null,
    totalConTriage,
    sinCalcular: Math.max(0, totalActivos - totalConTriage),
    totalActivos,
  };
}
