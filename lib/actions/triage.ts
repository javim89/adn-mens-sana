'use server';

import { revalidatePath } from 'next/cache';
import { recomputeOne } from '@/lib/triage/recompute';
import { contextoAccion } from '@/lib/tenant/contexto';
import { dbDelClub } from '@/lib/tenant/db';
import { mensajeDeError } from '@/lib/tenant/errores';

export async function recomputeTriageAction(
  deportistaId: string,
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const acceso = await contextoAccion();
    if (!acceso.ok) throw new Error(acceso.error);

    if (!deportistaId?.trim()) {
      return { success: false, error: 'El deportista es requerido' };
    }

    await recomputeOne(dbDelClub(acceso.contexto.clubId), deportistaId);

    revalidatePath('/deportistas/' + deportistaId);
    return { success: true };
  } catch (error) {
    console.error('recomputeTriageAction error:', error);
    return { success: false, error: mensajeDeError(error, 'Error al recalcular el triage') };
  }
}
