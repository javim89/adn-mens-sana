'use server';

import { getVistaRapidaDeportista, type VistaRapidaDeportista } from '@/lib/queries/deportistas';
import { contextoAccion } from '@/lib/tenant/contexto';

export async function obtenerVistaRapida(deportistaId: string): Promise<VistaRapidaDeportista> {
  const contexto = await contextoAccion();
  if (!contexto.ok) throw new Error(contexto.error);
  const { rol, userId } = contexto.contexto;
  // Igual que /turnos: el admin ve todos los turnos; el resto, solo los propios.
  return getVistaRapidaDeportista(deportistaId, new Date(), rol === 'admin' ? undefined : userId);
}
