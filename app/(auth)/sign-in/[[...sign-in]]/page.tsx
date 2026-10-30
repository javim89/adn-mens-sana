import { SignIn } from '@clerk/nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { appearanceLogin, destinoLoginDelClub } from '@/lib/branding/login';
import { TEMA_NEUTRO } from '@/lib/branding/tokens';
import { CLUB_SLUG_COOKIE, getBrandingPublico } from '@/lib/tenant/clubes';

const appearance = appearanceLogin(TEMA_NEUTRO, { pantalla: 'sign-in', ocultarHeader: false });

type Props = {
  params: Promise<{ 'sign-in'?: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function SignInPage({ params, searchParams }: Props) {
  // Solo la entrada (`/sign-in`): un paso intermedio del flujo de Clerk no se corta.
  const { 'sign-in': pasos } = await params;
  if (!pasos?.length) {
    const store = await cookies();
    const destino = await destinoLoginDelClub(
      'sign-in',
      store.get(CLUB_SLUG_COOKIE)?.value,
      getBrandingPublico,
      await searchParams,
    );
    if (destino) redirect(destino);
  }
  return <SignIn appearance={appearance} />;
}
