#!/usr/bin/env node
/**
 * Aplica las migraciones de prisma/migrations que falten en la base, en orden y cada
 * una en su transacción, por WebSocket (puerto 443) con @neondatabase/serverless: no
 * usa el TCP 5432 que falla con IPv6.
 *
 *   pnpm db:migrate              # aplica
 *   pnpm db:migrate --dry-run    # solo informa
 *
 * Con Docker: make run CMD="pnpm db:migrate --dry-run"
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { Pool } from '@neondatabase/serverless';
import { config } from 'dotenv';
import { aplicarPendientes, detectarNoTransaccionables, planificar } from './lib/migraciones.mjs';

const DIR = 'prisma/migrations';
const args = process.argv.slice(2);
const desconocidos = args.filter((a) => a !== '--dry-run');
if (desconocidos.length) {
  console.error(`Opción desconocida: ${desconocidos.join(' ')}\nUso: node scripts/migrate-pending.mjs [--dry-run]`);
  process.exit(2);
}
const dryRun = args.includes('--dry-run');

config({ path: '.env.local', quiet: true });
const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!url) {
  console.error('Falta DATABASE_URL_UNPOOLED (o DATABASE_URL).');
  process.exit(1);
}
const variable = process.env.DATABASE_URL_UNPOOLED ? 'DATABASE_URL_UNPOOLED' : 'DATABASE_URL';

function sinSecretos(texto) {
  let t = String(texto).split(url).join('<db>');
  try {
    const { hostname, password } = new URL(url);
    if (hostname) t = t.split(hostname).join('<db-host>');
    if (password) t = t.split(decodeURIComponent(password)).join('<password>');
  } catch {}
  return t;
}

function fallar(mensaje) {
  console.error(sinSecretos(mensaje));
  process.exitCode = 1;
}

const archivos = readdirSync(DIR, { withFileTypes: true })
  .filter((d) => d.isDirectory() && existsSync(path.join(DIR, d.name, 'migration.sql')))
  .map((d) => d.name);
const leer = (nombre) => readFileSync(path.join(DIR, nombre, 'migration.sql'), 'utf8');

const pool = new Pool({ connectionString: url });
pool.on('error', (err) => console.error(sinSecretos(`Error de conexión: ${err.message}`)));

async function main() {
  console.log(`${dryRun ? '[dry-run] ' : ''}Migraciones en ${DIR}: ${archivos.length}. Base: ${variable}.`);
  const cliente = await pool.connect();
  try {
    const tabla = await cliente.query(`SELECT to_regclass('"_prisma_migrations"') IS NOT NULL AS existe`);
    if (!tabla.rows[0].existe) {
      fallar('La tabla _prisma_migrations no existe en esta base. No se aplica nada.');
      return;
    }
    const { rows } = await cliente.query('SELECT migration_name, finished_at, rolled_back_at FROM "_prisma_migrations"');
    const plan = planificar(archivos, rows);

    console.log(`Registradas como aplicadas: ${plan.aplicadas}. Última: ${plan.ultimaAplicada ?? '(ninguna)'}.`);
    if (plan.sinArchivo.length) {
      console.log(`Aviso: registradas sin directorio en ${DIR}: ${plan.sinArchivo.join(', ')}`);
    }

    const bloqueos = [];
    if (plan.fallidas.length) {
      bloqueos.push(
        `Migraciones empezadas y sin terminar en _prisma_migrations (finished_at y rolled_back_at nulos):\n` +
          plan.fallidas.map((n) => `  - ${n}`).join('\n') +
          `\n  Revisar el estado real de la base y marcarlas a mano (terminada o revertida).`,
      );
    }
    if (plan.fueraDeOrden.length) {
      bloqueos.push(
        `Pendientes anteriores a la última aplicada (${plan.ultimaAplicada}):\n` +
          plan.fueraDeOrden.map((n) => `  - ${n}`).join('\n') +
          `\n  Probablemente se aplicaron sin registrarse, o se agregaron tarde. Verificar a mano si su SQL ya` +
          `\n  está en la base: si está, registrarlas en _prisma_migrations; si no, aplicarlas a mano.`,
      );
    }
    const migraciones = plan.pendientes.map((nombre) => ({ nombre, sql: leer(nombre) }));
    for (const m of migraciones) {
      const motivos = detectarNoTransaccionables(m.sql);
      if (motivos.length) {
        bloqueos.push(`${m.nombre} no puede correr en una transacción: ${motivos.join('; ')}. Aplicarla a mano.`);
      }
    }

    console.log(
      plan.pendientes.length
        ? `Pendientes (${plan.pendientes.length}):\n${plan.pendientes.map((n) => `  - ${n}`).join('\n')}`
        : 'Pendientes: 0.',
    );
    if (bloqueos.length) {
      fallar(`\nBLOQUEADO, no se aplica nada:\n${bloqueos.join('\n')}`);
      return;
    }
    if (dryRun || migraciones.length === 0) {
      console.log(dryRun ? 'dry-run: no se escribió nada.' : 'La base está al día.');
      return;
    }

    const t0 = performance.now();
    const { aplicadas, salteadas } = await aplicarPendientes(cliente, migraciones);
    console.log(
      `Listo: ${aplicadas.length} aplicadas${salteadas.length ? `, ${salteadas.length} salteadas` : ''} en ${Math.round(performance.now() - t0)} ms.`,
    );
  } catch (err) {
    const previas = err.resultado?.aplicadas ?? [];
    fallar(
      `${err instanceof Error ? err.message : String(err)}` +
        (previas.length ? `\nQuedaron aplicadas antes del error: ${previas.join(', ')}` : ''),
    );
  } finally {
    cliente.release();
  }
}

await main();
await pool.end();
