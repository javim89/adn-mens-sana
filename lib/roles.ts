export type AppRole = 'admin' | 'entrenador' | 'medico' | 'kinesiologo' | 'nutricionista' | 'psicologo' | 'cardiologo' | 'social';

export const ROLES_PERMITIDOS: AppRole[] = ['admin', 'entrenador', 'medico', 'kinesiologo', 'nutricionista', 'psicologo', 'cardiologo', 'social'];

export const ROL_LABELS: Record<AppRole, string> = {
  admin:         'Admin',
  entrenador:    'Entrenador',
  medico:        'Médico',
  kinesiologo:   'Kinesiólogo',
  nutricionista: 'Nutricionista',
  psicologo:     'Psicólogo',
  cardiologo:    'Cardiólogo',
  social:        'Social',
};

export type IconKey = 'LayoutDashboard' | 'Users' | 'CalendarDays' | 'UserCog' | 'ClipboardList' | 'Calendar' | 'ClipboardCheck';

export interface NavItem {
  href: string;
  label: string;
  icon: IconKey;
}

const ALL_NAV_ITEMS: NavItem[] = [
  { href: '/dashboard',    label: 'Dashboard',     icon: 'LayoutDashboard' },
  { href: '/deportistas',  label: 'Deportistas',   icon: 'Users' },
  { href: '/turnos',       label: 'Turnos',        icon: 'CalendarDays' },
  { href: '/presentismo',  label: 'Presentismo',   icon: 'ClipboardCheck' },
  { href: '/seguimientos', label: 'Seguimientos',  icon: 'ClipboardList' },
  { href: '/calendario',   label: 'Calendario',    icon: 'Calendar' },
  { href: '/usuarios',     label: 'Usuarios',      icon: 'UserCog' },
];

const NAV_BY_ROLE: Record<AppRole, NavItem[]> = {
  admin:         ALL_NAV_ITEMS,
  entrenador:    ALL_NAV_ITEMS.filter(i => !['/turnos', '/usuarios'].includes(i.href)),
  medico:        ALL_NAV_ITEMS.filter(i => !['/usuarios', '/presentismo'].includes(i.href)),
  kinesiologo:   ALL_NAV_ITEMS.filter(i => !['/usuarios', '/presentismo'].includes(i.href)),
  nutricionista: ALL_NAV_ITEMS.filter(i => !['/usuarios', '/presentismo'].includes(i.href)),
  psicologo:     ALL_NAV_ITEMS.filter(i => !['/usuarios', '/presentismo'].includes(i.href)),
  cardiologo:    ALL_NAV_ITEMS.filter(i => !['/usuarios', '/presentismo'].includes(i.href)),
  social:        ALL_NAV_ITEMS.filter(i => ['/dashboard', '/deportistas', '/calendario'].includes(i.href)),
};

export function getNavItemsForRole(role: string | undefined | null): NavItem[] {
  if (!role || !(role in NAV_BY_ROLE)) {
    return ALL_NAV_ITEMS.filter(i => i.href === '/dashboard'); // fallback seguro
  }
  return NAV_BY_ROLE[role as AppRole];
}
