'use server';

/**
 * Cambio de club activo desde el selector del Sidebar.
 *
 * La cookie solo propone el club: `getContextoClub` la vuelve a validar en cada
 * request. Con subdominios por club, el cambio es navegar al subdominio del otro. Igual se valida acá para no guardar un club al que no se puede entrar
 * y poder avisarlo.
 */

import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { guardarClubActivo, puedeEntrarAlClub } from '@/lib/tenant/clubes';
import { urlDelClub } from '@/lib/tenant/host';

type Resultado = { ok: false; error: string };

export async function cambiarClubActivo(clubId: string): Promise<Resultado> {
  const { userId } = await auth();
  if (!userId) return { ok: false, error: 'No autorizado' };
  if (typeof clubId !== 'string' || !clubId) return { ok: false, error: 'Club inválido' };

  if (!(await puedeEntrarAlClub(userId, clubId))) {
    return { ok: false, error: 'No tenés acceso a ese club' };
  }

  const slug = await guardarClubActivo(clubId);
  // Con subdominios se va al del club elegido (ahí el host decide el club, no la
  // cookie). `redirect` tira: con éxito la action no devuelve.
  redirect((slug && urlDelClub(slug, '/dashboard')) || '/dashboard');
}
