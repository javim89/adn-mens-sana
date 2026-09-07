'use server';

import { auth } from '@clerk/nextjs/server';
import { revalidatePath } from 'next/cache';
import { recomputeOne } from '@/lib/triage/recompute';

export async function recomputeTriageAction(
  deportistaId: string,
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error('No autorizado');

    if (!deportistaId?.trim()) {
      return { success: false, error: 'El deportista es requerido' };
    }

    await recomputeOne(deportistaId);

    revalidatePath('/deportistas/' + deportistaId);
    return { success: true };
  } catch (error) {
    console.error('recomputeTriageAction error:', error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'Error al recalcular el triage' };
  }
}
