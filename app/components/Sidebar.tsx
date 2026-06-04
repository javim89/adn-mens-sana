'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, CalendarDays, UserCog } from 'lucide-react';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/deportistas', label: 'Deportistas', icon: Users },
  { href: '/turnos', label: 'Turnos', icon: CalendarDays },
  { href: '/usuarios', label: 'Usuarios', icon: UserCog },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 min-h-screen flex flex-col bg-[#121A61] text-white shrink-0">
      {/* Logo + nombre */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-white/10">
        <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0 overflow-hidden">
          <Image
            src="/logo.png"
            alt="Escudo Gimnasia y Esgrima La Plata"
            width={36}
            height={36}
            className="object-contain"
            priority
          />
        </div>
        <div>
          <p className="font-semibold text-sm leading-tight" style={{ fontFamily: 'Oswald, sans-serif' }}>
            ADN Mens Sana
          </p>
          <p className="text-xs text-white/50 mt-0.5">
            Historia Deportiva
          </p>
        </div>
      </div>

      {/* Navegación */}
      <nav className="flex-1 px-3 py-6 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              className={[
                'flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors',
                active
                  ? 'bg-white/15 text-white border-l-2 border-[#C9A84C]'
                  : 'text-white/70 hover:bg-white/10 hover:text-white',
              ].join(' ')}
            >
              <Icon size={18} />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
