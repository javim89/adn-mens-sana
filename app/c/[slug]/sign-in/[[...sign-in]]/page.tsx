import { SignIn } from '@clerk/nextjs';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { appearanceLogin, rutaLoginDelClub } from '@/lib/branding/login';
import { temaDelClub } from '@/lib/branding/tema';
import { getBrandingPublico } from '@/lib/tenant/clubes';
import { HEADER_CLUB_SLUG } from '@/lib/tenant/host';

/**
 * Al terminar, Clerk siempre va a `/c/<slug>/entrar`, que deja este club como activo
 * (si el usuario puede entrar) y sigue a `/dashboard`.
 */
export default async function SignInClubPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const club = await getBrandingPublico(slug);
  if (!club) notFound();
  // En `<slug>.<raíz>/sign-in` el proxy reescribió a esta ruta: Clerk navega con las del subdominio.
  const enSubdominio = (await headers()).get(HEADER_CLUB_SLUG) === club.slug;

  return (
    <SignIn
      routing="path"
      path={rutaLoginDelClub(club.slug, 'sign-in', { enSubdominio })}
      signUpUrl={rutaLoginDelClub(club.slug, 'sign-up', { enSubdominio })}
      forceRedirectUrl={rutaLoginDelClub(club.slug, 'entrar')}
      appearance={appearanceLogin(temaDelClub(club), { pantalla: 'sign-in', ocultarHeader: true })}
    />
  );
}
