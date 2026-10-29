import { getNavItemsForRole } from '../../lib/roles';
import { requireContexto } from '@/lib/tenant/contexto';
import Providers from './providers';
import AppShell from './_components/AppShell';

export const dynamic = 'force-dynamic';

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Sin club accesible manda a /bienvenida (que vive fuera de este grupo).
  const { rol, club } = await requireContexto();
  const navItems = getNavItemsForRole(rol);

  return (
    <Providers>
      <div className="flex flex-col min-h-screen flex-1 min-w-0">
        <AppShell navItems={navItems} club={{ id: club.id, nombre: club.nombre }}>{children}</AppShell>
      </div>
    </Providers>
  );
}
