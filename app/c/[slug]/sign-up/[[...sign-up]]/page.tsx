import { SignUp } from '@clerk/nextjs';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { appearanceLogin, rutaLoginDelClub } from '@/lib/branding/login';
import { temaDelClub } from '@/lib/branding/tema';
import { getBrandingPublico } from '@/lib/tenant/clubes';
import { HEADER_CLUB_SLUG } from '@/lib/tenant/host';

/**
 * Alta de cuenta desde una invitación del club (el link de Clerk trae el ticket).
 * Al terminar va a `/c/<slug>/entrar`, que acepta la invitación y entra al club.
 */
export default async function SignUpClubPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const club = await getBrandingPublico(slug);
  if (!club) notFound();
  // En `<slug>.<raíz>/sign-up` el proxy reescribió a esta ruta: Clerk navega con las del subdominio.
  const enSubdominio = (await headers()).get(HEADER_CLUB_SLUG) === club.slug;

  return (
    <SignUp
      routing="path"
      path={rutaLoginDelClub(club.slug, 'sign-up', { enSubdominio })}
      signInUrl={rutaLoginDelClub(club.slug, 'sign-in', { enSubdominio })}
      forceRedirectUrl={rutaLoginDelClub(club.slug, 'entrar')}
      appearance={appearanceLogin(temaDelClub(club), { pantalla: 'sign-up', ocultarHeader: true })}
    />
  );
}
