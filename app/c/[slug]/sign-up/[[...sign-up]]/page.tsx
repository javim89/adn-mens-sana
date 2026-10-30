import { SignUp } from '@clerk/nextjs';
import { notFound } from 'next/navigation';
import { appearanceLogin, rutaLoginDelClub } from '@/lib/branding/login';
import { temaDelClub } from '@/lib/branding/tema';
import { getBrandingPublico } from '@/lib/tenant/clubes';

/**
 * Alta de cuenta desde una invitación del club (el link de Clerk trae el ticket).
 * Al terminar va a `/c/<slug>/entrar`, que acepta la invitación y entra al club.
 */
export default async function SignUpClubPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const club = await getBrandingPublico(slug);
  if (!club) notFound();

  return (
    <SignUp
      routing="path"
      path={rutaLoginDelClub(club.slug, 'sign-up')}
      signInUrl={rutaLoginDelClub(club.slug, 'sign-in')}
      forceRedirectUrl={rutaLoginDelClub(club.slug, 'entrar')}
      appearance={appearanceLogin(temaDelClub(club), { pantalla: 'sign-up', ocultarHeader: true })}
    />
  );
}
