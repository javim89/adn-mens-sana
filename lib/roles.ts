export type AppRole = 'admin' | 'entrenador' | 'medico';

export type IconKey = 'LayoutDashboard' | 'Users' | 'CalendarDays' | 'UserCog';

export interface NavItem {
  href: string;
  label: string;
  icon: IconKey;
}

const ALL_NAV_ITEMS: NavItem[] = [
  { href: '/dashboard',   label: 'Dashboard',   icon: 'LayoutDashboard' },
  { href: '/deportistas', label: 'Deportistas', icon: 'Users' },
  { href: '/turnos',      label: 'Turnos',      icon: 'CalendarDays' },
  { href: '/usuarios',    label: 'Usuarios',    icon: 'UserCog' },
];

const NAV_BY_ROLE: Record<AppRole, NavItem[]> = {
  admin:      ALL_NAV_ITEMS,
  entrenador: ALL_NAV_ITEMS.filter(i => !['/turnos', '/usuarios'].includes(i.href)),
  medico:     ALL_NAV_ITEMS.filter(i => i.href !== '/usuarios'),
};

export function getNavItemsForRole(role: string | undefined | null): NavItem[] {
  if (!role || !(role in NAV_BY_ROLE)) {
    return ALL_NAV_ITEMS.filter(i => i.href === '/dashboard'); // fallback seguro
  }
  return NAV_BY_ROLE[role as AppRole];
}
