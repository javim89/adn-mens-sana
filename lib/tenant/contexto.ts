/**
 * Club activo de la sesión y rol del usuario en ese club.
 *
 * El rol ya no sale de Clerk (`publicMetadata.role`): vive en `Membresia`, que es
 * por club. El club activo lo elige la cookie `bt_club`, pero la cookie solo
 * propone: se valida contra las membresías activas del usuario (o contra
 * `Superadmin`). Si no valida, se cae en la primera membresía; sin ninguna, no
 * hay contexto (`null`).
 *
 * `getContextoClub` lee siempre el cliente base: las membresías de un usuario
 * cruzan clubes, que es justo lo que el cliente acotado no deja ver.
 */

import { cache } from 'react';
import { auth } from '@clerk/nextjs/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import type { AppRole, Club, LugarRetiro } from '@/lib/generated/prisma/client';
import type { JsonApiErrors } from '@/lib/types/jsonapi';

/** Cookie httpOnly con el id del club activo. La setea `cambiarClubActivo`. */
export const CLUB_COOKIE = 'bt_club';

export type ClubDelContexto = Pick<
  Club,
  'id' | 'nombre' | 'slug' | 'logoKey' | 'logoUrl' | 'colorPrimario' | 'colorSecundario'
>;

export type ContextoClub = {
  userId: string;
  clubId: string;
  rol: AppRole;
  lugarRetiro: LugarRetiro | null;
  club: ClubDelContexto;
  /** El usuario es staff de BioTeam (tabla `superadmins`). */
  esSuperadmin: boolean;
  /** Entró a un club del que no es miembro, como superadmin: opera como admin. */
  comoSuperadmin: boolean;
};

const SELECT_CLUB = {
  id: true,
  nombre: true,
  slug: true,
  logoKey: true,
  logoUrl: true,
  colorPrimario: true,
  colorSecundario: true,
} as const;

async function resolverContexto(userId: string, clubPedido: string | undefined): Promise<ContextoClub | null> {
  const [membresias, superadmin] = await Promise.all([
    prisma.membresia.findMany({
      where: { userId, activo: true, club: { activo: true } },
      select: { clubId: true, rol: true, lugarRetiro: true, club: { select: SELECT_CLUB } },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.superadmin.findUnique({ where: { userId }, select: { userId: true } }),
  ]);
  const esSuperadmin = superadmin !== null;

  const desdeMembresia = (m: (typeof membresias)[number]): ContextoClub => ({
    userId,
    clubId: m.clubId,
    rol: m.rol,
    lugarRetiro: m.lugarRetiro,
    club: m.club,
    esSuperadmin,
    comoSuperadmin: false,
  });

  if (clubPedido) {
    const membresia = membresias.find((m) => m.clubId === clubPedido);
    if (membresia) return desdeMembresia(membresia);

    if (esSuperadmin) {
      const club = await prisma.club.findFirst({
        where: { id: clubPedido, activo: true },
        select: SELECT_CLUB,
      });
      if (club) {
        return {
          userId,
          clubId: club.id,
          rol: 'admin',
          lugarRetiro: null,
          club,
          esSuperadmin,
          comoSuperadmin: true,
        };
      }
    }
  }

  return membresias[0] ? desdeMembresia(membresias[0]) : null;
}

/** Contexto de la request, o `null` sin sesión o sin ningún club accesible. */
export const getContextoClub = cache(async (): Promise<ContextoClub | null> => {
  const { userId } = await auth();
  if (!userId) return null;
  const store = await cookies();
  return resolverContexto(userId, store.get(CLUB_COOKIE)?.value);
});

/**
 * Para páginas y layouts. Sin contexto manda a `/bienvenida` (que acepta
 * invitaciones o avisa que no hay acceso); con un rol no permitido, a `/dashboard`.
 */
export async function requireContexto(roles?: readonly AppRole[]): Promise<ContextoClub> {
  const contexto = await getContextoClub();
  if (!contexto) redirect('/bienvenida');
  if (roles && !roles.includes(contexto.rol)) redirect('/dashboard');
  return contexto;
}

export type ResultadoAccion = { ok: true; contexto: ContextoClub } | { ok: false; error: string };

/** Para server actions: devuelve el error en vez de redirigir. */
export async function contextoAccion(roles?: readonly AppRole[]): Promise<ResultadoAccion> {
  const contexto = await getContextoClub();
  if (!contexto) return { ok: false, error: 'No autorizado' };
  if (roles && !roles.includes(contexto.rol)) return { ok: false, error: 'Acceso denegado' };
  return { ok: true, contexto };
}

export type ResultadoApi = { ok: true; contexto: ContextoClub } | { ok: false; response: Response };

function errorJsonApi(status: 401 | 403, code: string, title: string): Response {
  const body: JsonApiErrors = { errors: [{ status: String(status), code, title }] };
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/vnd.api+json' },
  });
}

/** Para route handlers: 401 sin sesión, 403 sin club o con un rol no permitido. */
export async function contextoApi(roles?: readonly AppRole[]): Promise<ResultadoApi> {
  const contexto = await getContextoClub();
  if (!contexto) {
    const { userId } = await auth();
    return {
      ok: false,
      response: userId
        ? errorJsonApi(403, 'NO_CLUB', 'No tenés acceso a ningún club')
        : errorJsonApi(401, 'UNAUTHENTICATED', 'No autorizado'),
    };
  }
  if (roles && !roles.includes(contexto.rol)) {
    return { ok: false, response: errorJsonApi(403, 'FORBIDDEN', 'Acceso denegado') };
  }
  return { ok: true, contexto };
}
