/**
 * Clubes de un usuario, cookie del club activo y branding del club.
 *
 * Como `contexto.ts`, lee el cliente base: las membresías de un usuario cruzan
 * clubes, y un superadmin puede entrar a cualquiera. `Club` es global (no tiene
 * `clubId`), así que su branding también se lee y escribe acá.
 */

import { cache } from 'react';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/db';
import { normalizarHex } from '@/lib/branding/colores';
import { CLUB_COOKIE } from './contexto';

export type ClubDeUsuario = { id: string; nombre: string; slug: string };

/**
 * Cookie con el slug del último club activo. No da acceso a nada: solo sirve para
 * mandar el login genérico al login con la marca del club.
 */
export const CLUB_SLUG_COOKIE = 'bt_club_slug';

/** Lo que se puede mostrar de un club sin sesión: login, logo e íconos. */
export type BrandingPublico = {
  id: string;
  nombre: string;
  slug: string;
  logoKey: string | null;
  colorPrimario: string | null;
  colorSecundario: string | null;
  colorAcento: string | null;
};

const SELECT_BRANDING = {
  id: true,
  nombre: true,
  slug: true,
  logoKey: true,
  colorPrimario: true,
  colorSecundario: true,
  colorAcento: true,
} as const;

/** La cookie dura un año: es una preferencia, se revalida en cada request. */
const UN_ANIO_SEG = 60 * 60 * 24 * 365;

/** Clubes activos donde el usuario tiene una membresía activa, en orden de alta. */
export async function getMisClubes(userId: string): Promise<ClubDeUsuario[]> {
  const membresias = await prisma.membresia.findMany({
    where: { userId, activo: true, club: { activo: true } },
    select: { club: { select: { id: true, nombre: true, slug: true } } },
    orderBy: { createdAt: 'asc' },
  });
  return membresias.map((m) => m.club);
}

export async function esSuperadmin(userId: string): Promise<boolean> {
  const fila = await prisma.superadmin.findUnique({ where: { userId }, select: { userId: true } });
  return fila !== null;
}

/** El usuario puede operar en el club: es miembro activo, o superadmin y el club está activo. */
export async function puedeEntrarAlClub(userId: string, clubId: string): Promise<boolean> {
  const membresia = await prisma.membresia.findFirst({
    where: { userId, clubId, activo: true, club: { activo: true } },
    select: { id: true },
  });
  if (membresia) return true;
  if (!(await esSuperadmin(userId))) return false;
  const club = await prisma.club.findFirst({ where: { id: clubId, activo: true }, select: { id: true } });
  return club !== null;
}

/**
 * Guarda el club activo. Solo lo llaman actions que ya validaron el acceso; igual
 * `getContextoClub` vuelve a validar la cookie en cada request.
 */
export async function guardarClubActivo(clubId: string): Promise<void> {
  const store = await cookies();
  const opciones = {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: UN_ANIO_SEG,
  } as const;
  store.set(CLUB_COOKIE, clubId, opciones);

  const club = await prisma.club.findUnique({ where: { id: clubId }, select: { slug: true } });
  if (club) store.set(CLUB_SLUG_COOKIE, club.slug, opciones);
  else store.delete(CLUB_SLUG_COOKIE);
}

/** Branding de un club activo por su slug, o `null` si no existe o está desactivado. */
export const getBrandingPublico = cache(async (slug: string): Promise<BrandingPublico | null> => {
  if (!slug) return null;
  return prisma.club.findFirst({ where: { slug, activo: true }, select: SELECT_BRANDING });
});

export type DatosBranding = {
  nombre?: string;
  logoKey?: string | null;
  colorPrimario?: string | null;
  colorSecundario?: string | null;
  colorAcento?: string | null;
};

const CAMPOS_COLOR = ['colorPrimario', 'colorSecundario', 'colorAcento'] as const;

/**
 * Actualiza el branding de un club. Llamar SOLO con `ctx.clubId` (el club de la
 * sesión): esta función no valida acceso. Los colores se guardan normalizados
 * (`#rrggbb` en minúscula, lo que exige el CHECK de la base); uno inválido tira.
 * Los campos ausentes no se tocan; `null` vuelve al default.
 */
export async function actualizarBrandingDelClub(clubId: string, datos: DatosBranding): Promise<BrandingPublico> {
  if (!clubId) throw new Error('Falta el club');
  const data: DatosBranding = {};
  if (datos.nombre !== undefined) data.nombre = datos.nombre.trim();
  if (datos.logoKey !== undefined) data.logoKey = datos.logoKey;
  for (const campo of CAMPOS_COLOR) {
    const valor = datos[campo];
    if (valor === undefined) continue;
    if (valor === null) {
      data[campo] = null;
      continue;
    }
    const hex = normalizarHex(valor);
    if (!hex) throw new Error(`Color inválido: ${campo}`);
    data[campo] = hex;
  }
  return prisma.club.update({ where: { id: clubId }, data, select: SELECT_BRANDING });
}
