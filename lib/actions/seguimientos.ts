'use server';

import { auth, currentUser, clerkClient } from '@clerk/nextjs/server';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import type {
  SeguimientoFormData,
  Profesional,
  TipoSeguimiento,
  DatosEspecificosSeguimiento,
  AntropometriaData,
} from '@/lib/types/seguimientos';
import { computeAntropometriaSumatorias } from '@/lib/utils/antropometria';

const HEALTH_ROLES = ['medico', 'kinesiologo', 'nutricionista', 'psicologo', 'cardiologo'];
// 'social' puede crear/editar/eliminar únicamente seguimientos de tipo GENERICO propios.
const CAN_WRITE_ROLES = ['admin', ...HEALTH_ROLES, 'social'];

// Tipos permitidos por rol de profesional
const TIPOS_POR_ROL: Record<string, TipoSeguimiento[]> = {
  medico: ['GENERICO', 'TRAUMATOLOGIA', 'HISTORIA_CLINICA'],
  psicologo: ['GENERICO', 'EVALUACION_PSICOLOGICA'],
  cardiologo: ['GENERICO', 'EVALUACION_CARDIOLOGICA'],
  nutricionista: ['GENERICO', 'ANTROPOMETRIA'],
  social: ['GENERICO'],
};

function getTiposPermitidos(role: string): TipoSeguimiento[] {
  if (role === 'admin') {
    return [
      'GENERICO',
      'TRAUMATOLOGIA',
      'HISTORIA_CLINICA',
      'EVALUACION_PSICOLOGICA',
      'EVALUACION_CARDIOLOGICA',
      'ANTROPOMETRIA',
    ];
  }
  return TIPOS_POR_ROL[role] ?? ['GENERICO'];
}

async function getCallerInfo() {
  const { userId } = await auth();
  if (!userId) return { userId: null, role: null, isAdmin: false };
  const user = await currentUser();
  const role = String(user?.publicMetadata?.role ?? '');
  const isAdmin = role === 'admin';
  return { userId, role, isAdmin };
}

type PrismaTx = Omit<typeof prisma, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>;

/**
 * Construye el payload persistible de antropometría recalculando imc/sumatoriaPliegues
 * server-side. Los valores enviados por el cliente para las sumatorias se descartan.
 */
function buildAntropometriaPayload(datos: AntropometriaData) {
  // Descartamos imc/sumatoriaPliegues del cliente: son fuente de verdad server-side.
  const mediciones: Omit<AntropometriaData, 'imc' | 'sumatoriaPliegues'> = { ...datos };
  delete (mediciones as AntropometriaData).imc;
  delete (mediciones as AntropometriaData).sumatoriaPliegues;
  const { imc, sumatoriaPliegues } = computeAntropometriaSumatorias(mediciones);
  return {
    ...mediciones,
    imc: imc ?? null,
    sumatoriaPliegues: sumatoriaPliegues ?? null,
  };
}

async function createDatosEspecificos(
  tx: PrismaTx,
  seguimientoId: string,
  datosEspecificos: DatosEspecificosSeguimiento,
): Promise<void> {
  switch (datosEspecificos.tipo) {
    case 'TRAUMATOLOGIA':
      await tx.seguimientoTraumatologia.create({
        data: {
          seguimientoId,
          ...datosEspecificos.datos,
        },
      });
      break;
    case 'HISTORIA_CLINICA':
      await tx.seguimientoHistoriaClinica.create({
        data: {
          seguimientoId,
          ...datosEspecificos.datos,
        },
      });
      break;
    case 'EVALUACION_PSICOLOGICA': {
      const d = datosEspecificos.datos;
      validateCprdRange(d.cprdControlEstres);
      validateCprdRange(d.cprdInfluenciaEvaluacion);
      validateCprdRange(d.cprdMotivacion);
      validateCprdRange(d.cprdHabilidadMental);
      validateCprdRange(d.cprdCohesionEquipo);
      validateStaiRange(d.staiRasgo);
      validateStaiRange(d.staiEstado);
      await tx.seguimientoEvaluacionPsicologica.create({
        data: {
          seguimientoId,
          ...d,
        },
      });
      break;
    }
    case 'EVALUACION_CARDIOLOGICA':
      await tx.seguimientoEvaluacionCardiologica.create({
        data: {
          seguimientoId,
          ...datosEspecificos.datos,
        },
      });
      break;
    case 'ANTROPOMETRIA':
      await tx.seguimientoAntropometria.create({
        data: {
          seguimientoId,
          ...buildAntropometriaPayload(datosEspecificos.datos),
        },
      });
      break;
    case 'GENERICO':
      break;
  }
}

async function upsertDatosEspecificos(
  tx: PrismaTx,
  seguimientoId: string,
  datosEspecificos: DatosEspecificosSeguimiento,
  previousTipo: TipoSeguimiento | null,
): Promise<void> {
  // If the type changed, delete the old satellite record before creating the new one
  if (previousTipo && previousTipo !== datosEspecificos.tipo && previousTipo !== 'GENERICO') {
    await deleteOldSatellite(tx, seguimientoId, previousTipo);
  }

  if (datosEspecificos.tipo === 'GENERICO') return;

  switch (datosEspecificos.tipo) {
    case 'TRAUMATOLOGIA':
      await tx.seguimientoTraumatologia.upsert({
        where: { seguimientoId },
        create: { seguimientoId, ...datosEspecificos.datos },
        update: { ...datosEspecificos.datos },
      });
      break;
    case 'HISTORIA_CLINICA':
      await tx.seguimientoHistoriaClinica.upsert({
        where: { seguimientoId },
        create: { seguimientoId, ...datosEspecificos.datos },
        update: { ...datosEspecificos.datos },
      });
      break;
    case 'EVALUACION_PSICOLOGICA': {
      const d = datosEspecificos.datos;
      validateCprdRange(d.cprdControlEstres);
      validateCprdRange(d.cprdInfluenciaEvaluacion);
      validateCprdRange(d.cprdMotivacion);
      validateCprdRange(d.cprdHabilidadMental);
      validateCprdRange(d.cprdCohesionEquipo);
      validateStaiRange(d.staiRasgo);
      validateStaiRange(d.staiEstado);
      await tx.seguimientoEvaluacionPsicologica.upsert({
        where: { seguimientoId },
        create: { seguimientoId, ...d },
        update: { ...d },
      });
      break;
    }
    case 'EVALUACION_CARDIOLOGICA':
      await tx.seguimientoEvaluacionCardiologica.upsert({
        where: { seguimientoId },
        create: { seguimientoId, ...datosEspecificos.datos },
        update: { ...datosEspecificos.datos },
      });
      break;
    case 'ANTROPOMETRIA': {
      const payload = buildAntropometriaPayload(datosEspecificos.datos);
      await tx.seguimientoAntropometria.upsert({
        where: { seguimientoId },
        create: { seguimientoId, ...payload },
        update: { ...payload },
      });
      break;
    }
  }
}

async function deleteOldSatellite(
  tx: PrismaTx,
  seguimientoId: string,
  tipo: TipoSeguimiento,
): Promise<void> {
  switch (tipo) {
    case 'TRAUMATOLOGIA':
      await tx.seguimientoTraumatologia.deleteMany({ where: { seguimientoId } });
      break;
    case 'HISTORIA_CLINICA':
      await tx.seguimientoHistoriaClinica.deleteMany({ where: { seguimientoId } });
      break;
    case 'EVALUACION_PSICOLOGICA':
      await tx.seguimientoEvaluacionPsicologica.deleteMany({ where: { seguimientoId } });
      break;
    case 'EVALUACION_CARDIOLOGICA':
      await tx.seguimientoEvaluacionCardiologica.deleteMany({ where: { seguimientoId } });
      break;
    case 'ANTROPOMETRIA':
      await tx.seguimientoAntropometria.deleteMany({ where: { seguimientoId } });
      break;
    case 'GENERICO':
      break;
  }
}

function validateCprdRange(value: number | undefined): void {
  if (value !== undefined && value !== null && (value < 0 || value > 36)) {
    throw new Error(`El valor CPRD debe estar entre 0 y 36 (recibido: ${value})`);
  }
}

function validateStaiRange(value: number | undefined): void {
  if (value !== undefined && value !== null && (value < 0 || value > 80)) {
    throw new Error(`El valor STAI debe estar entre 0 y 80 (recibido: ${value})`);
  }
}

export async function getProfesionalesSeguimientos(): Promise<Profesional[]> {
  const { isAdmin } = await getCallerInfo();
  if (!isAdmin) return [];

  const client = await clerkClient();
  const response = await client.users.getUserList({ limit: 100 });

  return response.data
    .filter((u) => {
      const r = String((u.publicMetadata as Record<string, unknown>)?.role ?? '');
      return HEALTH_ROLES.includes(r);
    })
    .map((u) => {
      const meta = (u.publicMetadata ?? {}) as Record<string, unknown>;
      return {
        id: u.id,
        nombre: u.firstName || String(meta.firstName ?? ''),
        apellido: u.lastName || String(meta.lastName ?? ''),
        rol: String(meta.role ?? ''),
      };
    })
    .sort((a, b) => `${a.apellido} ${a.nombre}`.localeCompare(`${b.apellido} ${b.nombre}`));
}

export async function createSeguimiento(
  data: SeguimientoFormData,
): Promise<{ success: true; id: string } | { success: false; error: string }> {
  try {
    const { userId, role, isAdmin } = await getCallerInfo();
    if (!userId) return { success: false, error: 'No autorizado' };

    if (!CAN_WRITE_ROLES.includes(role ?? '')) {
      return { success: false, error: 'No autorizado' };
    }

    if (!data.titulo?.trim()) return { success: false, error: 'El título es requerido' };
    if (!data.fecha) return { success: false, error: 'La fecha es requerida' };
    if (!data.deportistaId) return { success: false, error: 'El deportista es requerido' };

    // Validate tipo compatibility with caller role
    const tipoSeguimiento = data.tipoSeguimiento ?? null;
    const tiposPermitidos = getTiposPermitidos(role ?? '');
    if (tipoSeguimiento && tipoSeguimiento !== 'GENERICO') {
      if (!tiposPermitidos.includes(tipoSeguimiento)) {
        return {
          success: false,
          error: `El rol "${role}" no puede crear seguimientos de tipo "${tipoSeguimiento}"`,
        };
      }
    }

    // Blindaje: rechazar datosEspecificos de un tipo no permitido para el rol,
    // aunque el cliente haya enviado un tipoSeguimiento base/nulo.
    const datosTipo = data.datosEspecificos?.tipo;
    if (datosTipo && datosTipo !== 'GENERICO' && !tiposPermitidos.includes(datosTipo)) {
      return {
        success: false,
        error: `El rol "${role}" no puede crear seguimientos de tipo "${datosTipo}"`,
      };
    }

    // Ownership rule: admin can assign a different profesionalId; health professionals always use their own userId
    const profesionalId = isAdmin ? data.profesionalId : userId;
    if (!profesionalId) return { success: false, error: 'El profesional es requerido' };

    const prioridad = data.prioridad || 'MEDIA';

    const proximaCita =
      data.proximaCita && data.proximaCita.trim()
        ? new Date(data.proximaCita)
        : null;

    const result = await prisma.$transaction(async (tx) => {
      const seguimiento = await tx.seguimiento.create({
        data: {
          deportistaId: data.deportistaId,
          profesionalId,
          fecha: new Date(data.fecha),
          titulo: data.titulo.trim(),
          descripcion: data.descripcion?.trim() || null,
          recomendaciones: data.recomendaciones?.trim() || null,
          resultadosEvaluacion: data.resultadosEvaluacion?.trim() || null,
          prioridad,
          proximaCita,
          alertaSeguimiento: data.alertaSeguimiento?.trim() || null,
          tipoSeguimiento,
        },
      });

      if (data.datosEspecificos && tipoSeguimiento !== 'GENERICO') {
        await createDatosEspecificos(tx as unknown as PrismaTx, seguimiento.id, data.datosEspecificos);
      }

      return seguimiento;
    });

    revalidatePath('/seguimientos');
    return { success: true, id: result.id };
  } catch (error) {
    console.error('createSeguimiento error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al crear el seguimiento',
    };
  }
}

export async function updateSeguimiento(
  id: string,
  data: SeguimientoFormData,
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const { userId, role, isAdmin } = await getCallerInfo();
    if (!userId) return { success: false, error: 'No autorizado' };

    const existing = await prisma.seguimiento.findUnique({ where: { id } });
    if (!existing) return { success: false, error: 'Seguimiento no encontrado' };

    // Ownership rule: only the owner or admin can edit
    const isOwner = existing.profesionalId === userId;
    const canModify = isAdmin || isOwner;
    if (!canModify) {
      return {
        success: false,
        error:
          'No autorizado — solo el profesional que creó este seguimiento o un administrador puede editarlo',
      };
    }

    // Validate tipo compatibility with caller role
    const tipoSeguimiento = data.tipoSeguimiento ?? null;
    const tiposPermitidos = getTiposPermitidos(role ?? '');
    if (tipoSeguimiento && tipoSeguimiento !== 'GENERICO') {
      if (!tiposPermitidos.includes(tipoSeguimiento)) {
        return {
          success: false,
          error: `El rol "${role}" no puede crear seguimientos de tipo "${tipoSeguimiento}"`,
        };
      }
    }

    // Blindaje: rechazar datosEspecificos de un tipo no permitido para el rol.
    const datosTipo = data.datosEspecificos?.tipo;
    if (datosTipo && datosTipo !== 'GENERICO' && !tiposPermitidos.includes(datosTipo)) {
      return {
        success: false,
        error: `El rol "${role}" no puede crear seguimientos de tipo "${datosTipo}"`,
      };
    }

    // Admin can reassign the professional; the owner keeps their own profesionalId
    const profesionalId = isAdmin ? data.profesionalId : existing.profesionalId;

    const proximaCita =
      data.proximaCita && data.proximaCita.trim()
        ? new Date(data.proximaCita)
        : null;

    const previousTipo = (existing.tipoSeguimiento as TipoSeguimiento | null) ?? null;

    await prisma.$transaction(async (tx) => {
      await tx.seguimiento.update({
        where: { id },
        data: {
          deportistaId: data.deportistaId,
          profesionalId,
          fecha: new Date(data.fecha),
          titulo: data.titulo.trim(),
          descripcion: data.descripcion?.trim() || null,
          recomendaciones: data.recomendaciones?.trim() || null,
          resultadosEvaluacion: data.resultadosEvaluacion?.trim() || null,
          prioridad: data.prioridad || 'MEDIA',
          proximaCita,
          alertaSeguimiento: data.alertaSeguimiento?.trim() || null,
          tipoSeguimiento,
        },
      });

      if (data.datosEspecificos) {
        await upsertDatosEspecificos(
          tx as unknown as PrismaTx,
          id,
          data.datosEspecificos,
          previousTipo,
        );
      } else if (tipoSeguimiento === 'GENERICO' && previousTipo && previousTipo !== 'GENERICO') {
        // If switching to GENERICO without datosEspecificos, clean up old satellite
        await deleteOldSatellite(tx as unknown as PrismaTx, id, previousTipo);
      }
    });

    revalidatePath('/seguimientos');
    return { success: true };
  } catch (error) {
    console.error('updateSeguimiento error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al actualizar el seguimiento',
    };
  }
}

export async function deleteSeguimiento(
  id: string,
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const { userId, isAdmin } = await getCallerInfo();
    if (!userId) return { success: false, error: 'No autorizado' };

    const existing = await prisma.seguimiento.findUnique({ where: { id } });
    if (!existing) return { success: false, error: 'Seguimiento no encontrado' };

    // Ownership rule: only the owner or admin can delete
    const isOwner = existing.profesionalId === userId;
    const canModify = isAdmin || isOwner;
    if (!canModify) {
      return {
        success: false,
        error:
          'No autorizado — solo el profesional que creó este seguimiento o un administrador puede eliminarlo',
      };
    }

    await prisma.seguimiento.delete({ where: { id } });

    revalidatePath('/seguimientos');
    return { success: true };
  } catch (error) {
    console.error('deleteSeguimiento error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al eliminar el seguimiento',
    };
  }
}
