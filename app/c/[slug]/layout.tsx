/**
 * Login con la marca de un club: `/c/<slug>/sign-in` y `/sign-up` (públicas, ver
 * `proxy.ts`). Se ve antes de iniciar sesión, así que solo usa el branding público
 * del club (nombre, logo y colores); un club inexistente o desactivado da 404.
 */

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import TemaClub from '@/app/components/branding/TemaClub';
import MarcaClub from '@/app/components/branding/MarcaClub';
import { temaDelClub } from '@/lib/branding/tema';
import { urlIconoDelClub, urlLogoDelClub } from '@/lib/branding/marca';
import { getBrandingPublico } from '@/lib/tenant/clubes';

export const dynamic = 'force-dynamic';

type Props = { children: React.ReactNode; params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Pick<Props, 'params'>): Promise<Metadata> {
  const { slug } = await params;
  const club = await getBrandingPublico(slug);
  if (!club) return {};
  return {
    title: `Ingresar · ${club.nombre}`,
    icons: {
      icon: [{ url: urlIconoDelClub(club, 32), sizes: '32x32', type: 'image/png' }],
      apple: [{ url: urlIconoDelClub(club, 180), sizes: '180x180', type: 'image/png' }],
    },
  };
}

export default async function LoginClubLayout({ children, params }: Props) {
  const { slug } = await params;
  const club = await getBrandingPublico(slug);
  if (!club) notFound();

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-linear-to-br from-primario-hover to-primario">
      <TemaClub tema={temaDelClub(club)} />
      <main className="flex w-full flex-col items-center gap-6 px-4 py-12">
        <div className="flex flex-col items-center gap-2 text-center text-white">
          {/* El nombre visible es el de la marca; el lector de pantalla lee "Ingresá a <Club>". */}
          <h1 className="flex items-center">
            <span className="sr-only">Ingresá a</span>{' '}
            <MarcaClub nombre={club.nombre} logoSrc={urlLogoDelClub(club)} tamanio="lg" />
          </h1>
          <p className="text-sm text-white">Ingresá con tu cuenta del club</p>
        </div>
        {children}
      </main>
    </div>
  );
}
