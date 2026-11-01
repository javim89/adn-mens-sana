import { SignUp } from '@clerk/nextjs';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { appearanceLogin, destinoLoginDelClub } from '@/lib/branding/login';
import { TEMA_NEUTRO } from '@/lib/branding/tokens';
import { CLUB_SLUG_COOKIE, getBrandingPublico } from '@/lib/tenant/clubes';
import { esDominioRaiz } from '@/lib/tenant/host';

const appearance = appearanceLogin(TEMA_NEUTRO, { pantalla: 'sign-up', ocultarHeader: false });

type Props = {
  params: Promise<{ 'sign-up'?: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function SignUpPage({ params, searchParams }: Props) {
  // Solo la entrada (`/sign-up`): un paso intermedio del flujo de Clerk no se corta.
  const { 'sign-up': pasos } = await params;
  if (!pasos?.length) {
    const store = await cookies();
    const destino = await destinoLoginDelClub(
      'sign-up',
      store.get(CLUB_SLUG_COOKIE)?.value,
      getBrandingPublico,
      await searchParams,
      { enDominioRaiz: esDominioRaiz((await headers()).get('host')) },
    );
    if (destino) redirect(destino);
  }
  return <SignUp appearance={appearance} />;
}
