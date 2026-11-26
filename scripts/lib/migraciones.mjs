/**
 * Lógica de `scripts/migrate-pending.mjs`, sin E/S para poder testearla.
 *
 * Una fila de `_prisma_migrations` cuenta como aplicada si terminó y no se revirtió
 * (`finished_at` con valor y `rolled_back_at` nulo), igual que en Prisma Migrate.
 */
import { createHash } from 'node:crypto';

/** Clave del advisory lock: dos corridas a la vez no aplican la misma migración. */
export const LOCK_MIGRACIONES = 728_461_903;

/** @typedef {{ migration_name: string, finished_at: Date | string | null, rolled_back_at: Date | string | null }} FilaMigracion */
/** @typedef {{ query: (texto: string, params?: unknown[]) => Promise<{ rows: Record<string, unknown>[] }> }} ClienteSql */

/** Mismo checksum que `apply-migration.mjs` y Prisma: sha256 del archivo, en hex. */
export function checksum(sql) {
  return createHash('sha256').update(sql).digest('hex');
}

/** Orden lexicográfico por bytes, el mismo que usa Prisma con el prefijo de fecha. */
export function ordenar(nombres) {
  return [...nombres].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
}

/**
 * @param {string[]} archivos nombres de directorio con `migration.sql`
 * @param {FilaMigracion[]} filas
 */
export function planificar(archivos, filas) {
  const ordenados = ordenar(archivos);
  const aplicadas = new Set(filas.filter((f) => f.finished_at != null && f.rolled_back_at == null).map((f) => f.migration_name));
  // Empezada y nunca terminada ni revertida: Prisma también se niega a seguir (P3009).
  const fallidas = ordenar(
    [...new Set(filas.filter((f) => f.finished_at == null && f.rolled_back_at == null).map((f) => f.migration_name))].filter(
      (n) => !aplicadas.has(n),
    ),
  );
  const ultimaAplicada = ordenar([...aplicadas]).at(-1) ?? null;
  const pendientes = ordenados.filter((n) => !aplicadas.has(n) && !fallidas.includes(n));
  const fueraDeOrden = ultimaAplicada ? pendientes.filter((n) => n < ultimaAplicada) : [];
  const enArchivos = new Set(ordenados);
  const sinArchivo = ordenar([...aplicadas].filter((n) => !enArchivos.has(n)));
  return { pendientes, fueraDeOrden, fallidas, sinArchivo, ultimaAplicada, aplicadas: aplicadas.size };
}

/**
 * Saca comentarios, cuerpos `$tag$…$tag$` e identificadores entre comillas dobles.
 * Con `conStrings: false` también vacía los literales `'…'`; si no, los deja.
 */
export function limpiarSql(sql, { conStrings = false } = {}) {
  let out = '';
  let i = 0;
  while (i < sql.length) {
    const c = sql[i];
    const sig = sql[i + 1];
    if (c === '-' && sig === '-') {
      const fin = sql.indexOf('\n', i);
      i = fin === -1 ? sql.length : fin;
      out += ' ';
    } else if (c === '/' && sig === '*') {
      let prof = 1;
      i += 2;
      while (i < sql.length && prof > 0) {
        if (sql[i] === '/' && sql[i + 1] === '*') { prof++; i += 2; }
        else if (sql[i] === '*' && sql[i + 1] === '/') { prof--; i += 2; }
        else i++;
      }
      out += ' ';
    } else if (c === "'") {
      const escapes = /[eE]/.test(sql[i - 1] ?? '') && !/[\w$]/.test(sql[i - 2] ?? '');
      let j = i + 1;
      while (j < sql.length) {
        if (escapes && sql[j] === '\\') { j += 2; continue; }
        if (sql[j] === "'") {
          if (sql[j + 1] === "'") { j += 2; continue; }
          break;
        }
        j++;
      }
      out += conStrings ? sql.slice(i, j + 1) : "''";
      i = j + 1;
    } else if (c === '"') {
      const fin = sql.indexOf('"', i + 1);
      i = fin === -1 ? sql.length : fin + 1;
      out += '""';
    } else if (c === '$' && !/[\w$]/.test(sql[i - 1] ?? '')) {
      const tag = /^\$([A-Za-z_][A-Za-z0-9_]*)?\$/.exec(sql.slice(i));
      if (!tag) { out += c; i++; continue; }
      const fin = sql.indexOf(tag[0], i + tag[0].length);
      i = fin === -1 ? sql.length : fin + tag[0].length;
      out += ' $$ ';
    } else {
      out += c;
      i++;
    }
  }
  return out;
}

const NO_TRANSACCIONABLES = [
  [/^CREATE\s+(UNIQUE\s+)?INDEX\s+CONCURRENTLY\b/, 'CREATE INDEX CONCURRENTLY'],
  [/^DROP\s+INDEX\s+CONCURRENTLY\b/, 'DROP INDEX CONCURRENTLY'],
  [/^REINDEX\b.*\bCONCURRENTLY\b/, 'REINDEX CONCURRENTLY'],
  [/^REINDEX\s+(\([^)]*\)\s*)?(SYSTEM|DATABASE)\b/, 'REINDEX SYSTEM/DATABASE'],
  [/^ALTER\s+TABLE\b.*\bDETACH\s+PARTITION\b.*\bCONCURRENTLY\b/, 'DETACH PARTITION CONCURRENTLY'],
  [/^VACUUM\b/, 'VACUUM'],
  [/^CLUSTER$/, 'CLUSTER sin tabla'],
  [/^(CREATE|DROP)\s+DATABASE\b/, 'CREATE/DROP DATABASE'],
  [/^ALTER\s+DATABASE\b.*\bSET\s+TABLESPACE\b/, 'ALTER DATABASE … SET TABLESPACE'],
  [/^(CREATE|DROP)\s+TABLESPACE\b/, 'CREATE/DROP TABLESPACE'],
  [/^ALTER\s+SYSTEM\b/, 'ALTER SYSTEM'],
  [/^(CREATE|DROP)\s+SUBSCRIPTION\b/, 'CREATE/DROP SUBSCRIPTION'],
  [/^(BEGIN|START\s+TRANSACTION|COMMIT|END|ROLLBACK|ABORT|SAVEPOINT|RELEASE|PREPARE\s+TRANSACTION)\b/, 'control de transacción propio'],
];

/**
 * Motivos por los que el archivo no puede correr dentro de una transacción.
 * `ALTER TYPE … ADD VALUE` sí puede desde PG 12, pero el valor nuevo no se puede
 * usar hasta el COMMIT ("unsafe use of new value"): se bloquea solo si el mismo
 * archivo vuelve a nombrar ese literal.
 */
export function detectarNoTransaccionables(sql) {
  const motivos = [];
  const sentencias = limpiarSql(sql)
    .split(';')
    .map((s) => s.replace(/\s+/g, ' ').trim().toUpperCase())
    .filter(Boolean);
  for (const s of sentencias) {
    for (const [patron, motivo] of NO_TRANSACCIONABLES) {
      if (patron.test(s) && !motivos.includes(motivo)) motivos.push(motivo);
    }
  }

  const conStrings = limpiarSql(sql, { conStrings: true });
  for (const m of conStrings.matchAll(/\bADD\s+VALUE\s+(?:IF\s+NOT\s+EXISTS\s+)?('(?:[^']|'')*')/gi)) {
    const usos = conStrings.split(m[1]).length - 1;
    if (usos > 1) motivos.push(`ALTER TYPE … ADD VALUE ${m[1]} y su uso en el mismo archivo`);
  }
  return motivos;
}

/**
 * Aplica una migración en su propia transacción: el archivo entero (no se parte por
 * `;`, así no se rompen los bloques `$$`) y su fila en `_prisma_migrations`.
 * @param {ClienteSql} cliente
 * @returns {Promise<'aplicada' | 'ya-aplicada'>}
 */
export async function aplicarMigracion(cliente, { nombre, sql }) {
  const inicio = new Date();
  await cliente.query('BEGIN');
  try {
    await cliente.query('SELECT pg_advisory_xact_lock($1)', [LOCK_MIGRACIONES]);
    const ya = await cliente.query(
      `SELECT 1 FROM "_prisma_migrations"
       WHERE migration_name = $1 AND finished_at IS NOT NULL AND rolled_back_at IS NULL`,
      [nombre],
    );
    if (ya.rows.length > 0) {
      await cliente.query('ROLLBACK');
      return 'ya-aplicada';
    }
    await cliente.query(sql);
    await cliente.query(
      `INSERT INTO "_prisma_migrations"
         (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
       VALUES (gen_random_uuid()::text, $1, clock_timestamp(), $2, NULL, NULL, $3, 1)`,
      [checksum(sql), nombre, inicio],
    );
    await cliente.query('COMMIT');
    return 'aplicada';
  } catch (err) {
    await cliente.query('ROLLBACK').catch(() => {});
    throw err;
  }
}

/**
 * Aplica en orden; corta en la primera que falla (las anteriores quedan aplicadas).
 * @param {ClienteSql} cliente
 * @param {{ nombre: string, sql: string }[]} migraciones
 */
export async function aplicarPendientes(cliente, migraciones, { log = console.log, reloj = () => performance.now() } = {}) {
  const resultado = { aplicadas: [], salteadas: [] };
  for (const m of migraciones) {
    const t0 = reloj();
    try {
      const estado = await aplicarMigracion(cliente, m);
      const ms = Math.round(reloj() - t0);
      if (estado === 'aplicada') {
        resultado.aplicadas.push(m.nombre);
        log(`  aplicada  ${m.nombre} (${ms} ms)`);
      } else {
        resultado.salteadas.push(m.nombre);
        log(`  salteada  ${m.nombre}: otro proceso ya la registró`);
      }
    } catch (err) {
      const error = new Error(`Falló ${m.nombre}; se hizo ROLLBACK de esa migración: ${err instanceof Error ? err.message : String(err)}`);
      error.migracion = m.nombre;
      error.resultado = resultado;
      throw error;
    }
  }
  return resultado;
}
