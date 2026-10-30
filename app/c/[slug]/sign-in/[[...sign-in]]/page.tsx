import { SignIn } from '@clerk/nextjs';
import { notFound } from 'next/navigation';
import { appearanceLogin, rutaLoginDelClub } from '@/lib/branding/login';
import { temaDelClub } from '@/lib/branding/tema';
import { getBrandingPublico } from '@/lib/tenant/clubes';

/**
 * Al terminar, Clerk siempre va a `/c/<slug>/entrar`, que deja este club como activo
 * (si el usuario puede entrar) y sigue a `/dashboard`.
 */
export default async function SignInClubPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const club = await getBrandingPublico(slug);
  if (!club) notFound();

  return (
    <SignIn
      routing="path"
      path={rutaLoginDelClub(club.slug, 'sign-in')}
      signUpUrl={rutaLoginDelClub(club.slug, 'sign-up')}
      forceRedirectUrl={rutaLoginDelClub(club.slug, 'entrar')}
      appearance={appearanceLogin(temaDelClub(club), { pantalla: 'sign-in', ocultarHeader: true })}
    />
  );
}
