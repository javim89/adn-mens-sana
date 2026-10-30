/**
 * Clubes de un usuario y cookie del club activo.
 *
 * Como `contexto.ts`, lee el cliente base: las membresías de un usuario cruzan
 * clubes, y un superadmin puede entrar a cualquiera.
 */

import { cookies } from 'next/headers';
import { prisma } from '@/lib/db';
import { CLUB_COOKIE } from './contexto';

export type ClubDeUsuario = { id: string; nombre: string; slug: string };

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
  store.set(CLUB_COOKIE, clubId, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: UN_ANIO_SEG,
  });
}
