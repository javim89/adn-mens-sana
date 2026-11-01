/**
 * Tokens efímeros de Insights (`insights_sesiones`).
 *
 * Las RLS del rol `insights_ro` no confían en un GUC con el `clubId`: cualquier
 * SELECT puede llamar a `set_config`, así que un SQL crudo podría cambiarse de
 * club. En cambio, el runner inserta (con el cliente base) un token aleatorio de
 * 32 bytes atado al club, y dentro de la transacción read-only hace
 * `set_config('app.insights_token', token, true)`. La función SECURITY DEFINER
 * `insights_club_actual()` resuelve el token al club solo si existe y no venció.
 * `insights_ro` no puede leer la tabla, así que no tiene de dónde sacar el token
 * de otro club.
 *
 * El token va siempre como parámetro (`$1`), nunca en el texto del SQL: así no
 * aparece en `pg_stat_activity`.
 */

import { randomBytes } from 'node:crypto';
import { cache } from 'react';
import { prisma } from '@/lib/db';

/** Vida de un token. Alcanza de sobra para una query con timeout de 10 s. */
export const TTL_SESION_MS = 60_000;

/** Margen: un token cacheado al que le queda menos que esto se reemplaza. */
const MARGEN_MS = 20_000;

type SesionCacheada = { token: string; expira: number };

/**
 * Cache por request (React `cache`): un dashboard que resuelve varios widgets en
 * el mismo render reutiliza el token. Fuera de un render no memoiza y cada
 * llamada crea el suyo, que es igual de correcto.
 */
const cacheDelClub = cache((clubId: string): { actual: SesionCacheada | null; clubId: string } => ({
  actual: null,
  clubId,
}));

async function crearSesion(clubId: string): Promise<SesionCacheada> {
  const token = randomBytes(32).toString('hex');
  const expira = new Date(Date.now() + TTL_SESION_MS);
  await prisma.insightsSesion.create({ data: { token, clubId, expira } });
  return { token, expira: expira.getTime() };
}

/** Token vigente para ejecutar Insights como `clubId`. */
export async function tokenDeInsights(clubId: string): Promise<string> {
  const holder = cacheDelClub(clubId);
  if (!holder.actual || holder.actual.expira - Date.now() < MARGEN_MS) {
    holder.actual = await crearSesion(clubId);
  }
  return holder.actual.token;
}

/** Borra los tokens vencidos. Lo llama el cron. */
export async function limpiarSesionesInsightsVencidas(now: Date = new Date()): Promise<number> {
  const { count } = await prisma.insightsSesion.deleteMany({ where: { expira: { lt: now } } });
  return count;
}
