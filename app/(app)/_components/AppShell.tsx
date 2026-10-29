'use client';

import { useState } from 'react';
import { Menu } from 'lucide-react';
import Sidebar from '../../components/Sidebar';
import LogoBioTeam from '../../components/LogoBioTeam';
import type { NavItem } from '../../../lib/roles';

interface AppShellProps {
  navItems: NavItem[];
  children: React.ReactNode;
}

export default function AppShell({ navItems, children }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <>
      {/* Mobile top bar — hidden on md+ */}
      <header className="md:hidden flex items-center justify-between px-4 bg-[#121A61] text-white h-14 shrink-0">
        <span className="flex min-w-0 items-center gap-2">
          <LogoBioTeam variante="inverso" className="h-7" eager />
          <span className="font-[family-name:var(--font-oswald)] font-semibold text-sm uppercase tracking-wide">
            BioTeam
          </span>
        </span>
        <button
          onClick={() => setSidebarOpen(true)}
          aria-label="Abrir menú"
          className="p-2 rounded-lg hover:bg-white/10 transition-colors"
        >
          <Menu size={22} />
        </button>
      </header>

      <div className="flex flex-1 min-h-0 min-w-0">
        <Sidebar
          navItems={navItems}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
        <main className="flex-1 min-w-0 overflow-y-auto">{children}</main>
      </div>
    </>
  );
}
