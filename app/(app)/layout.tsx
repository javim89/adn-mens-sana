import { currentUser } from '@clerk/nextjs/server';
import Sidebar from '../components/Sidebar';
import { getNavItemsForRole } from '../../lib/roles';
import Providers from './providers';

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
      <Sidebar navItems={navItems} />
      <main className="flex-1">{children}</main>
    </Providers>
  );
}
