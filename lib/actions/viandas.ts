'use server';

import { auth, currentUser } from '@clerk/nextjs/server';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { getPlantelViandas } from '@/lib/queries/viandas';
import { fechaDbDesdeClave, hoyEnArgentina, horaEnArgentina } from '@/lib/utils/fecha';
import { esLugarRetiro, esTipoComida } from '@/lib/utils/viandas';
import { LUGAR_RETIRO_LABELS, TIPO_COMIDA_LABELS } from '@/lib/utils/enum-labels';
import type { DeportistaVianda, EntregaView } from '@/lib/types/viandas';
import type { LugarRetiro, TipoComida } from '@/lib/generated/prisma/enums';

const ROLES_VIANDAS = ['admin', 'responsable_viandas'];

const SIN_LUGAR_ASIGNADO =
  'Tu usuario no tiene un lugar de retiro asignado. Pedile a un administrador que lo configure en Usuarios.';

/**
 * Toda respuesta lleva la `fecha` que usó el servidor. La UI la compara con la
 * suya para detectar el cruce de medianoche: una pestaña abierta desde ayer
 * marcaría sobre un día que ya no es el que muestra.
 */
type Resultado =
  | { success: true; fecha: string; entrega: EntregaView }
  | { success: false; fecha: string; error: string; entrega?: EntregaView };

type ResultadoBorrado =
  | { success: true; fecha: string }
  | { success: false; fecha: string; error: string };

async function getCallerInfo() {
  const { userId } = await auth();
  if (!userId) return { userId: null, role: null, lugarRetiro: null };
  const user = await currentUser();
  const meta = (user?.publicMetadata ?? {}) as Record<string, unknown>;
  return {
    userId,
    role: String(meta.role ?? ''),
    lugarRetiro: esLugarRetiro(meta.lugarRetiro) ? meta.lugarRetiro : null,
  };
}

/**
 * Resuelve quién marca y DÓNDE.
 *
 * Para el responsable el lugar sale de su `publicMetadata` y `lugarSolicitado` se
 * IGNORA: si el cliente pudiera elegirlo, la trazabilidad por lugar —que es la
 * razón de ser del módulo— no valdría nada. El admin sí lo elige, porque puede
 * cubrir cualquiera de los tres puestos.
 */
type Contexto =
  | { ok: true; userId: string; isAdmin: boolean; lugar: LugarRetiro }
  | { ok: false; error: string };

async function resolverContexto(lugarSolicitado?: string): Promise<Contexto> {
  const { userId, role, lugarRetiro } = await getCallerInfo();
  if (!userId) return { ok: false, error: 'No autorizado' };
  if (!ROLES_VIANDAS.includes(role)) return { ok: false, error: 'Acceso denegado' };

  const isAdmin = role === 'admin';

  if (!isAdmin) {
    if (!lugarRetiro) return { ok: false, error: SIN_LUGAR_ASIGNADO };
    return { ok: true, userId, isAdmin, lugar: lugarRetiro };
  }

  if (!lugarSolicitado) {
    return { ok: false, error: 'Elegí un lugar de retiro antes de marcar.' };
  }
  if (!esLugarRetiro(lugarSolicitado)) {
    return { ok: false, error: 'Lugar de retiro inválido' };
  }
  return { ok: true, userId, isAdmin, lugar: lugarSolicitado };
}

export async function marcarRetiro(input: {
  deportistaId: string;
  comida: string;
  lugar?: string;
}): Promise<Resultado> {
  // El input NO tiene campo fecha, a propósito: la regla "solo hoy" se cumple
  // por construcción, no por validación.
  const fecha = hoyEnArgentina();

  const ctx = await resolverContexto(input.lugar);
  if (!ctx.ok) return { success: false, fecha, error: ctx.error };

  if (!esTipoComida(input.comida)) {
    return { success: false, fecha, error: 'Comida inválida' };
  }
  const comida: TipoComida = input.comida;

  // NO se valida elegibilidad. `recibeAlmuerzo` / `recibeCena` son lo que la
  // ficha del deportista dice que *debería* recibir, no un permiso: la ficha
  // puede estar incompleta o desactualizada, y el responsable que está
  // entregando en el momento no puede quedar bloqueado por eso. Registrar la
  // entrega real aunque contradiga la ficha es justamente lo que hace visible
  // el desvío en Insights (cruce `comida` x `recibe_*`).

  try {
    const creada = await prisma.entregaComida.create({
      data: {
        deportistaId: input.deportistaId,
        fecha: fechaDbDesdeClave(fecha),
        comida,
        lugar: ctx.lugar,
        entregadoPor: ctx.userId,
      },
      select: { lugar: true, entregadoPor: true, createdAt: true },
    });

    revalidatePath('/viandas');
    return {
      success: true,
      fecha,
      entrega: {
        lugar: creada.lugar,
        entregadoPor: creada.entregadoPor,
        createdAt: creada.createdAt.toISOString(),
      },
    };
  } catch (error) {
    // El unique (deportista, fecha, comida) es la propiedad anti-fraude del
    // modelo, así que su violación no es un error a esconder: es LA señal.
    // Devolvemos dónde y a qué hora ya retiró, y la entrega existente para que
    // la UI la adopte en lugar de revertir el optimismo.
    if (esViolacionDeUnique(error)) {
      const existente = await prisma.entregaComida.findUnique({
        where: {
          deportistaId_fecha_comida: {
            deportistaId: input.deportistaId,
            fecha: fechaDbDesdeClave(fecha),
            comida,
          },
        },
        select: { lugar: true, entregadoPor: true, createdAt: true },
      });

      if (!existente) {
        return { success: false, fecha, error: 'Esa comida ya fue registrada hoy.' };
      }

      return {
        success: false,
        fecha,
        error: `Ya retiró ${TIPO_COMIDA_LABELS[comida].toLowerCase()} en ${LUGAR_RETIRO_LABELS[existente.lugar]} a las ${horaEnArgentina(existente.createdAt)}.`,
        entrega: {
          lugar: existente.lugar,
          entregadoPor: existente.entregadoPor,
          createdAt: existente.createdAt.toISOString(),
        },
      };
    }

    return { success: false, fecha, error: 'No se pudo registrar el retiro.' };
  }
}

/**
 * Corrección de un marcado equivocado, acotada al día en curso.
 *
 * Es un DELETE duro, o sea que borra rastro de auditoría — justo lo que el módulo
 * produce. Se acepta en v1 porque el alcance está limitado a hoy y, para el
 * responsable, a su propio lugar. El camino de v2 es `anulada_at`/`anulada_por`
 * más un índice único parcial (`WHERE anulada_at IS NULL`).
 */
export async function desmarcarRetiro(input: {
  deportistaId: string;
  comida: string;
}): Promise<ResultadoBorrado> {
  const fecha = hoyEnArgentina();

  const { userId, role, lugarRetiro } = await getCallerInfo();
  if (!userId) return { success: false, fecha, error: 'No autorizado' };
  if (!ROLES_VIANDAS.includes(role)) {
    return { success: false, fecha, error: 'Acceso denegado' };
  }
  const isAdmin = role === 'admin';
  // El admin borra en cualquier puesto; el responsable solo en el suyo, así que
  // para él el lugar es parte obligatoria del filtro.
  let lugarFiltro: LugarRetiro | undefined;
  if (!isAdmin) {
    if (!lugarRetiro) return { success: false, fecha, error: SIN_LUGAR_ASIGNADO };
    lugarFiltro = lugarRetiro;
  }

  if (!esTipoComida(input.comida)) {
    return { success: false, fecha, error: 'Comida inválida' };
  }

  // La autorización va DENTRO del `where`, no en un `if` previo: así no hay
  // ventana entre leer y borrar, y un responsable no puede tocar la entrega de
  // otro puesto ni con una request armada a mano.
  const { count } = await prisma.entregaComida.deleteMany({
    where: {
      deportistaId: input.deportistaId,
      comida: input.comida,
      fecha: fechaDbDesdeClave(fecha),
      ...(lugarFiltro ? { lugar: lugarFiltro } : {}),
    },
  });

  if (count === 0) {
    return {
      success: false,
      fecha,
      error:
        'No se pudo desmarcar: la entrega no existe, es de otro día o fue registrada en otro lugar.',
    };
  }

  revalidatePath('/viandas');
  return { success: true, fecha };
}

export async function getPlantelViandasAction(
  disciplinaId: string,
  categoriaId: string,
): Promise<DeportistaVianda[]> {
  const { userId, role } = await getCallerInfo();
  if (!userId || !ROLES_VIANDAS.includes(role)) return [];
  if (!disciplinaId || !categoriaId) return [];
  return getPlantelViandas(disciplinaId, categoriaId, hoyEnArgentina());
}

function esViolacionDeUnique(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code: unknown }).code === 'P2002'
  );
}
