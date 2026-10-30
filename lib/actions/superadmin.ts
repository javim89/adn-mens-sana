'use server';

/**
 * Administración de clubes por el staff de BioTeam (tabla `superadmins`).
 *
 * Es uno de los pocos lugares que usa el cliente base (`@/lib/db`): opera sobre
 * TODOS los clubes. Cada action valida primero que quien llama sea superadmin.
 */

import { randomUUID } from 'crypto';
import { auth } from '@clerk/nextjs/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import type { Prisma } from '@/lib/generated/prisma/client';
import { esViolacionDeUnique } from '@/lib/utils/prisma-errores';
import { guardarClubActivo, esSuperadmin } from '@/lib/tenant/clubes';
import { DIAS_INVITACION, buscarCuentaVerificada, invitacionClerkPara, venceEn } from '@/lib/tenant/cuentas';
import { nuevoTokenInvitacion } from '@/lib/tenant/invitaciones';
import {
  CATEGORIAS_DEFAULT,
  DISCIPLINAS_CON_TODAS_LAS_CATEGORIAS,
  DISCIPLINAS_DEFAULT,
} from '@/lib/catalogos/catalogos-default';
import { DASHBOARDS_SISTEMA } from '@/lib/insights/dashboards-sistema';
import { SLUG_MAX, SLUG_MIN, SLUG_REGEX } from '@/lib/utils/slug';

const NO_AUTORIZADO = 'No autorizado';
const SLUG_EN_USO = 'Ya existe un club con ese slug';

type Error_ = { ok: false; error: string; campos?: Partial<Record<keyof CrearClubInput, string>> };

async function superadminActual(): Promise<string | null> {
  const { userId } = await auth();
  if (!userId) return null;
  return (await esSuperadmin(userId)) ? userId : null;
}

export type ClubListado = {
  id: string;
  nombre: string;
  slug: string;
  activo: boolean;
  miembros: number;
  deportistas: number;
  createdAt: Date;
};

export async function getClubes(): Promise<ClubListado[]> {
  if (!(await superadminActual())) throw new Error(NO_AUTORIZADO);

  const clubes = await prisma.club.findMany({
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      nombre: true,
      slug: true,
      activo: true,
      createdAt: true,
      _count: { select: { membresias: { where: { activo: true } }, deportistas: true } },
    },
  });
  return clubes.map(({ _count, ...club }) => ({
    ...club,
    miembros: _count.membresias,
    deportistas: _count.deportistas,
  }));
}

const crearClubSchema = z.object({
  nombre: z.string().trim().min(2, 'El nombre es requerido').max(120, 'El nombre es demasiado largo'),
  slug: z
    .string()
    .trim()
    .min(SLUG_MIN, `El slug necesita al menos ${SLUG_MIN} caracteres`)
    .max(SLUG_MAX, `El slug admite hasta ${SLUG_MAX} caracteres`)
    .regex(SLUG_REGEX, 'Solo minúsculas, números y guiones (ej.: club-atletico)'),
  adminEmail: z.string().trim().toLowerCase().email('El email no es válido'),
  adminNombre: z.string().trim().min(1, 'El nombre es requerido'),
  adminApellido: z.string().trim().min(1, 'El apellido es requerido'),
  copiarCatalogos: z.boolean(),
});

export type CrearClubInput = z.input<typeof crearClubSchema>;

export type ResultadoCrearClub =
  | { ok: true; clubId: string; admin: 'miembro' | 'invitado' }
  | Error_;

/**
 * Da de alta un club con su primer admin.
 *
 * Todo lo de la DB va en una transacción: el club, los catálogos default (si se
 * pidieron), los dashboards de sistema de Insights y el acceso del admin. Si el
 * mail ya tiene cuenta de Clerk se crea la `Membresia`; si no, una `Invitacion`
 * más la invitación de Clerk para crear la cuenta (la misma lógica que invitar
 * desde /usuarios, `lib/tenant/cuentas.ts`).
 *
 * Las llamadas a Clerk van ANTES de la transacción (no se puede deshacer un mail,
 * y no conviene tener la tx abierta esperando una API externa). Si después la tx
 * falla, la invitación de Clerk queda pendiente y se reutiliza en el próximo
 * intento: es una por mail, no por club.
 */
export async function crearClub(input: CrearClubInput): Promise<ResultadoCrearClub> {
  const userId = await superadminActual();
  if (!userId) return { ok: false, error: NO_AUTORIZADO };

  const parsed = crearClubSchema.safeParse(input);
  if (!parsed.success) {
    const campos: Error_['campos'] = {};
    for (const issue of parsed.error.issues) {
      const campo = issue.path[0] as keyof CrearClubInput;
      campos[campo] ??= issue.message;
    }
    return { ok: false, error: 'Revisá los datos del formulario', campos };
  }
  const datos = parsed.data;

  try {
    const existente = await prisma.club.findUnique({ where: { slug: datos.slug }, select: { id: true } });
    if (existente) return { ok: false, error: SLUG_EN_USO, campos: { slug: SLUG_EN_USO } };

    const cuentaAdmin = await buscarCuentaVerificada(datos.adminEmail);
    const clerkInvitationId = cuentaAdmin ? null : await invitacionClerkPara(datos.adminEmail);

    const club = await prisma.$transaction(
      async (tx) => {
        const club = await tx.club.create({
          data: { nombre: datos.nombre, slug: datos.slug },
          select: { id: true },
        });

        if (datos.copiarCatalogos) {
          const categorias = CATEGORIAS_DEFAULT.map((c) => ({ id: randomUUID(), clubId: club.id, ...c }));
          const disciplinas = DISCIPLINAS_DEFAULT.map((d) => ({ id: randomUUID(), clubId: club.id, ...d }));
          await tx.categoria.createMany({ data: categorias });
          await tx.disciplina.createMany({ data: disciplinas });
          const vinculos = disciplinas
            .filter((d) => DISCIPLINAS_CON_TODAS_LAS_CATEGORIAS.includes(d.codigo))
            .flatMap((d) => categorias.map((c) => ({ disciplinaId: d.id, categoriaId: c.id })));
          if (vinculos.length > 0) await tx.disciplinaCategoria.createMany({ data: vinculos });
        }

        for (const dashboard of DASHBOARDS_SISTEMA) {
          await tx.insightsDashboard.create({
            data: {
              clubId: club.id,
              slug: dashboard.slug,
              nombre: dashboard.nombre,
              descripcion: dashboard.descripcion,
              orden: dashboard.orden,
              esSistema: true,
              creadoPor: userId,
              widgets: {
                create: dashboard.widgets.map((w) => ({
                  titulo: w.titulo,
                  descripcion: w.descripcion,
                  tipo: w.tipo,
                  querySpec: w.querySpec as Prisma.InputJsonValue,
                  vizConfig: w.vizConfig as Prisma.InputJsonValue,
                  x: w.x,
                  y: w.y,
                  w: w.w,
                  h: w.h,
                })),
              },
            },
          });
        }

        if (cuentaAdmin) {
          await tx.membresia.create({ data: { userId: cuentaAdmin, clubId: club.id, rol: 'admin' } });
        } else {
          await tx.invitacion.create({
            data: {
              clubId: club.id,
              email: datos.adminEmail,
              nombre: datos.adminNombre,
              apellido: datos.adminApellido,
              rol: 'admin',
              tokenHash: nuevoTokenInvitacion().tokenHash,
              clerkInvitationId,
              invitadoPor: userId,
              expira: venceEn(DIAS_INVITACION),
            },
          });
        }

        return club;
      },
      { timeout: 20_000 },
    );

    revalidatePath('/superadmin/clubes');
    return { ok: true, clubId: club.id, admin: cuentaAdmin ? 'miembro' : 'invitado' };
  } catch (error) {
    if (esViolacionDeUnique(error, 'slug')) return { ok: false, error: SLUG_EN_USO, campos: { slug: SLUG_EN_USO } };
    console.error('crearClub:', error);
    return { ok: false, error: 'No se pudo crear el club' };
  }
}

/**
 * Entra a un club como superadmin: guarda la cookie y el contexto queda en
 * `comoSuperadmin` (opera como admin) salvo que además sea miembro.
 */
export async function entrarAClub(clubId: string): Promise<Error_> {
  if (!(await superadminActual())) return { ok: false, error: NO_AUTORIZADO };

  const club = await prisma.club.findFirst({ where: { id: clubId, activo: true }, select: { id: true } });
  if (!club) return { ok: false, error: 'El club no existe o está desactivado' };

  await guardarClubActivo(club.id);
  redirect('/dashboard');
}

/** Activa o desactiva un club. Desactivado, nadie entra (ni sus miembros ni el cron). */
export async function setClubActivo(clubId: string, activo: boolean): Promise<{ ok: true } | Error_> {
  if (!(await superadminActual())) return { ok: false, error: NO_AUTORIZADO };

  const { count } = await prisma.club.updateMany({ where: { id: clubId }, data: { activo } });
  if (count === 0) return { ok: false, error: 'Club no encontrado' };

  revalidatePath('/superadmin/clubes');
  return { ok: true };
}
