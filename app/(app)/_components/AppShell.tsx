'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Menu } from 'lucide-react';
import Sidebar from '../../components/Sidebar';
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
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center overflow-hidden">
            <Image
              src="/logo.png"
              alt="Escudo Gimnasia y Esgrima La Plata"
              width={28}
              height={28}
              className="object-contain"
              priority
            />
          </div>
          <span className="font-semibold text-sm" style={{ fontFamily: 'Oswald, sans-serif' }}>
            ADN Mens Sana
          </span>
        </div>
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
