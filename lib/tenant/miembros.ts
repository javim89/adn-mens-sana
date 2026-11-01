/**
 * Miembros de un club: `Membresia` (rol, club) cruzada con Clerk (nombre, mail).
 *
 * Reemplaza el patrón de listar todos los usuarios de Clerk y filtrar por
 * `publicMetadata.role`, que con varios clubes mezclaría profesionales de otros.
 * Se pregunta a Clerk solo por los userIds del club.
 */

import { clerkClient } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';
import type { AppRole, LugarRetiro } from '@/lib/generated/prisma/client';
import { getContextoClub } from './contexto';
import { SinContextoError } from './errores';

export type Miembro = {
  userId: string;
  rol: AppRole;
  lugarRetiro: LugarRetiro | null;
  activo: boolean;
  nombre: string;
  apellido: string;
  email: string;
  lastSignInAt: Date | null;
  createdAt: Date;
};

/** `getUserList` acepta hasta 500 ids; 100 por pedido es el `limit` habitual del repo. */
const IDS_POR_PEDIDO = 100;

type Opciones = {
  roles?: readonly AppRole[];
  /** Incluye las membresías desactivadas (la pantalla de usuarios las muestra). */
  incluirInactivos?: boolean;
  /** Por defecto, el club activo de la sesión. Explícito para cron y superadmin. */
  clubId?: string;
};

export async function getMiembrosDelClub(opciones: Opciones = {}): Promise<Miembro[]> {
  const clubId = opciones.clubId ?? (await getContextoClub())?.clubId;
  if (!clubId) throw new SinContextoError();

  const membresias = await prisma.membresia.findMany({
    where: {
      clubId,
      ...(opciones.incluirInactivos ? {} : { activo: true }),
      ...(opciones.roles ? { rol: { in: [...opciones.roles] } } : {}),
    },
    select: { userId: true, rol: true, lugarRetiro: true, activo: true },
  });
  if (membresias.length === 0) return [];

  const client = await clerkClient();
  const usuarios = new Map<string, Awaited<ReturnType<typeof client.users.getUser>>>();
  for (let i = 0; i < membresias.length; i += IDS_POR_PEDIDO) {
    const userId = membresias.slice(i, i + IDS_POR_PEDIDO).map((m) => m.userId);
    const { data } = await client.users.getUserList({ userId, limit: userId.length });
    for (const u of data) usuarios.set(u.id, u);
  }

  const miembros: Miembro[] = [];
  for (const m of membresias) {
    const u = usuarios.get(m.userId);
    // Una membresía sin usuario en Clerk (cuenta borrada) no se muestra.
    if (!u) continue;
    const meta = (u.publicMetadata ?? {}) as Record<string, unknown>;
    miembros.push({
      userId: m.userId,
      rol: m.rol,
      lugarRetiro: m.lugarRetiro,
      activo: m.activo,
      nombre: u.firstName || String(meta.firstName ?? ''),
      apellido: u.lastName || String(meta.lastName ?? ''),
      email: u.emailAddresses[0]?.emailAddress ?? '',
      lastSignInAt: u.lastSignInAt != null ? new Date(u.lastSignInAt) : null,
      createdAt: new Date(u.createdAt),
    });
  }

  return miembros.sort((a, b) =>
    `${a.apellido} ${a.nombre}`.localeCompare(`${b.apellido} ${b.nombre}`),
  );
}

/** "Nombre Apellido", o el mail, o el id si Clerk no tiene ninguno de los dos. */
export function nombreVisible(m: Pick<Miembro, 'userId' | 'nombre' | 'apellido' | 'email'>): string {
  return `${m.nombre} ${m.apellido}`.trim() || m.email || m.userId;
}

/**
 * Nombre visible de cada `userId` que aparece en datos del club (profesional de un
 * turno, entrenador de una sesión, autor de un seguimiento).
 *
 * Primero se resuelve con los miembros del club (incluye inactivos). Los ids que
 * quedan afuera son de alguien que ya no es miembro pero dejó registros: se
 * preguntan a Clerk uno por uno, porque el id sale de una fila del club y no de
 * un listado de usuarios. Si tampoco existe en Clerk, queda el id.
 */
export async function getNombresDeUsuarios(ids: readonly string[], clubId?: string): Promise<Record<string, string>> {
  const unicos = [...new Set(ids)].filter(Boolean);
  if (unicos.length === 0) return {};

  const nombres: Record<string, string> = {};
  const miembros = await getMiembrosDelClub({ incluirInactivos: true, clubId });
  for (const m of miembros) nombres[m.userId] = nombreVisible(m);

  const faltantes = unicos.filter((id) => !(id in nombres));
  if (faltantes.length > 0) {
    const client = await clerkClient();
    const usuarios = await Promise.all(faltantes.map((id) => client.users.getUser(id).catch(() => null)));
    for (const u of usuarios) {
      if (!u) continue;
      const meta = (u.publicMetadata ?? {}) as Record<string, unknown>;
      const nombre = u.firstName || String(meta.firstName ?? '');
      const apellido = u.lastName || String(meta.lastName ?? '');
      nombres[u.id] = `${nombre} ${apellido}`.trim() || u.emailAddresses?.[0]?.emailAddress || u.id;
    }
  }

  const resultado: Record<string, string> = {};
  for (const id of unicos) resultado[id] = nombres[id] ?? id;
  return resultado;
}
