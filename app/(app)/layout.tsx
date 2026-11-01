import type { Metadata } from 'next';
import { getNavItemsForRole } from '../../lib/roles';
import { getContextoClub, requireContexto } from '@/lib/tenant/contexto';
import { getMisClubes } from '@/lib/tenant/clubes';
import { temaDelClub } from '@/lib/branding/tema';
import { urlIconoDelClub, urlLogoDelClub } from '@/lib/branding/marca';
import TemaClub from '@/app/components/branding/TemaClub';
import Providers from './providers';
import AppShell from './_components/AppShell';

export const dynamic = 'force-dynamic';

/**
 * Adentro de la app la marca es la del club: título "<Sección> · <Club>" y favicon
 * del club. Estos íconos solo ganan porque en `app/` no hay archivos `icon.*`,
 * `apple-icon.*` ni `favicon.ico` (los de BioTeam viven en `public/brand/`).
 */
export async function generateMetadata(): Promise<Metadata> {
  const contexto = await getContextoClub();
  if (!contexto) return {};
  const { club } = contexto;
  return {
    title: { template: `%s · ${club.nombre}`, default: club.nombre },
    icons: {
      icon: [{ url: urlIconoDelClub(club, 32), sizes: '32x32', type: 'image/png' }],
      apple: [{ url: urlIconoDelClub(club, 180), sizes: '180x180', type: 'image/png' }],
    },
  };
}

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Sin club accesible manda a /bienvenida (que vive fuera de este grupo).
  const { userId, rol, club, esSuperadmin, comoSuperadmin } = await requireContexto();
  const navItems = getNavItemsForRole(rol);
  const misClubes = await getMisClubes(userId);

  return (
    <Providers clubId={club.id}>
      <TemaClub tema={temaDelClub(club)} />
      <div className="flex flex-col min-h-screen flex-1 min-w-0">
        <AppShell
          navItems={navItems}
          club={{ id: club.id, nombre: club.nombre, logoSrc: urlLogoDelClub(club) }}
          misClubes={misClubes.map(({ id, nombre }) => ({ id, nombre }))}
          puedeConfigurar={rol === 'admin'}
          esSuperadmin={esSuperadmin}
          comoSuperadmin={comoSuperadmin}
        >
          {children}
        </AppShell>
      </div>
    </Providers>
  );
}
