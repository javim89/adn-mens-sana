import { getNavItemsForRole } from '../../lib/roles';
import { requireContexto } from '@/lib/tenant/contexto';
import { getMisClubes } from '@/lib/tenant/clubes';
import { temaDelClub } from '@/lib/branding/tema';
import TemaClub from '@/app/components/branding/TemaClub';
import Providers from './providers';
import AppShell from './_components/AppShell';

export const dynamic = 'force-dynamic';

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
          club={{ id: club.id, nombre: club.nombre }}
          misClubes={misClubes.map(({ id, nombre }) => ({ id, nombre }))}
          esSuperadmin={esSuperadmin}
          comoSuperadmin={comoSuperadmin}
        >
          {children}
        </AppShell>
      </div>
    </Providers>
  );
}
