import { currentUser } from '@clerk/nextjs/server';
import { getNavItemsForRole } from '../../lib/roles';
import Providers from './providers';
import AppShell from './_components/AppShell';

export const dynamic = 'force-dynamic';

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await currentUser();
  const role = user?.publicMetadata?.role as string | undefined;
  const navItems = getNavItemsForRole(role);

  return (
    <Providers>
      <div className="flex flex-col min-h-screen flex-1 min-w-0">
        <AppShell navItems={navItems}>{children}</AppShell>
      </div>
    </Providers>
  );
}
