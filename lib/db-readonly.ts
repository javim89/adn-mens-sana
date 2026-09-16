/**
 * Cliente Prisma de solo lectura — la tercera capa de defensa de Insights.
 *
 * El módulo de Insights deja al admin ejecutar SQL contra la base. Las dos
 * primeras capas que lo contienen (el guard sintáctico de `sql-guard.ts` y la
 * transacción `SET TRANSACTION READ ONLY` de `run.ts`) son código propio: si
 * tienen un bug, la protección se cae con ellas.
 *
 * Esta capa no depende de código nuestro. Si `DATABASE_URL_READONLY` apunta a
 * un rol de Postgres que solo tiene `SELECT`, el motor rechaza cualquier
 * escritura aunque todo lo demás falle.
 *
 * Es OPCIONAL: sin la variable seteada se cae al cliente normal y las otras dos
 * capas siguen operando. `isReadOnlyConfigured()` permite saber si está activa,
 * porque una capa de seguridad que uno cree tener y no tiene es peor que no
 * tenerla.
 *
 * Para crearlo en Neon (una sola vez, con el usuario dueño de la base —
 * normalmente `neondb_owner`):
 *
 *   CREATE ROLE insights_ro WITH LOGIN PASSWORD '...';
 *   GRANT CONNECT ON DATABASE neondb TO insights_ro;
 *   GRANT USAGE ON SCHEMA public TO insights_ro;
 *   GRANT SELECT ON ALL TABLES IN SCHEMA public TO insights_ro;
 *   ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO insights_ro;
 *
 * Tres detalles que hacen fallar esto en el SQL Editor de Neon:
 *
 * 1. Ejecutar las sentencias DE A UNA. Corriendo el bloque entero, el GRANT no
 *    ve al rol todavía y falla con `role "insights_ro" does not exist`.
 * 2. La contraseña va entre comillas SIMPLES. Las dobles son para
 *    identificadores y dan `syntax error`.
 * 3. El `ALTER DEFAULT PRIVILEGES` solo aplica a las tablas que cree el rol que
 *    lo ejecuta. Si se corre con un usuario distinto al que aplica las
 *    migraciones, las tablas nuevas no quedan legibles y el módulo falla recién
 *    al agregar un modelo — un error silencioso y molesto de diagnosticar.
 *
 * La última sentencia es la que hace que las tablas futuras también queden
 * legibles sin repetir el GRANT en cada migración.
 */

import { PrismaNeon } from '@prisma/adapter-neon';
import { PrismaClient } from '@/lib/generated/prisma/client';
import { prisma } from '@/lib/db';

/**
 * `undefined` = todavía no se resolvió; `null` = se resolvió y no hay variable
 * configurada. Distinguirlos evita reintentar la construcción en cada llamada.
 */
const globalForReadOnly = globalThis as unknown as {
  prismaReadOnly?: PrismaClient | null;
};

function createReadOnlyClient(): PrismaClient | null {
  const connectionString = process.env.DATABASE_URL_READONLY;
  if (!connectionString) return null;

  const adapter = new PrismaNeon({ connectionString });
  return new PrismaClient({ adapter });
}

/**
 * Cliente para las lecturas de Insights.
 *
 * Devuelve el cliente de solo lectura si está configurado, y el singleton
 * normal si no. El resultado se cachea en `globalThis` por el mismo motivo que
 * en `lib/db.ts`: sin eso, cada recarga de HMR abriría un Pool nuevo y agotaría
 * el límite de conexiones.
 */
export function getReadOnlyPrisma(): PrismaClient {
  if (globalForReadOnly.prismaReadOnly === undefined) {
    globalForReadOnly.prismaReadOnly = createReadOnlyClient();
  }
  return globalForReadOnly.prismaReadOnly ?? prisma;
}

/** `true` si la capa extra está activa. Se usa para reportarlo, no para decidir. */
export function isReadOnlyConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL_READONLY);
}

/** Limpia el cache. Solo para tests. */
export function __resetReadOnlyPrisma(): void {
  globalForReadOnly.prismaReadOnly = undefined;
}
