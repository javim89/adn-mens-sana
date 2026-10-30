/**
 * Destino del login de un club (`forceRedirectUrl` de su `<SignIn>` / `<SignUp>`).
 * Exige sesión (`proxy.ts`). Acepta las invitaciones pendientes (típicamente: acaba
 * de crear la cuenta desde la del club) y, si el usuario puede entrar al club, lo
 * deja como activo y sigue a `/dashboard` (la de su subdominio, si hay). Si no, `/bienvenida` decide: otro club
 * suyo o "sin acceso".
 */

import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { rutaLoginDelClub } from '@/lib/branding/login';
import { aceptarInvitacionesPendientes } from '@/lib/tenant/invitaciones';
import { getBrandingPublico, guardarClubActivo, puedeEntrarAlClub } from '@/lib/tenant/clubes';
import { urlDelClub } from '@/lib/tenant/host';

export const dynamic = 'force-dynamic';

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { userId } = await auth();
  if (!userId) redirect(rutaLoginDelClub(slug, 'sign-in'));

  try {
    await aceptarInvitacionesPendientes(userId);
  } catch (error) {
    // Como en /bienvenida: si Clerk o la base fallan, puede que ya tenga acceso igual.
    console.error('entrar: no se pudieron aceptar las invitaciones:', error);
  }

  // `redirect` tira: va fuera del try.
  const club = await getBrandingPublico(slug);
  if (club && (await puedeEntrarAlClub(userId, club.id))) {
    await guardarClubActivo(club.id);
    redirect(urlDelClub(club.slug, '/dashboard') ?? '/dashboard');
  }
  redirect('/bienvenida');
}
