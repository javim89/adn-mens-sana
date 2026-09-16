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

export type IconKey = 'LayoutDashboard' | 'Users' | 'CalendarDays' | 'UserCog' | 'ClipboardList' | 'Calendar' | 'ClipboardCheck' | 'Megaphone' | 'ChartColumn';

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
  { href: '/convocatorias', label: 'Convocatorias', icon: 'Megaphone' },
  { href: '/seguimientos', label: 'Seguimientos',  icon: 'ClipboardList' },
  { href: '/calendario',   label: 'Calendario',    icon: 'Calendar' },
  { href: '/insights',     label: 'Insights',      icon: 'ChartColumn' },
  { href: '/usuarios',     label: 'Usuarios',      icon: 'UserCog' },
];

/**
 * Rutas exclusivas de admin.
 *
 * NAV_BY_ROLE define cada rol por EXCLUSIÓN (salvo `social`, que va por inclusión),
 * así que un item nuevo en ALL_NAV_ITEMS entra por defecto para todos los roles.
 * Listar acá una ruta la saca de todos los roles no-admin de una sola vez, en
 * lugar de tener que acordarse de agregarla a las 6 listas de exclusión.
 */
const ADMIN_ONLY: string[] = ['/insights', '/usuarios'];

const NAV_BY_ROLE: Record<AppRole, NavItem[]> = {
  admin:         ALL_NAV_ITEMS,
  entrenador:    ALL_NAV_ITEMS.filter(i => ![...ADMIN_ONLY, '/turnos'].includes(i.href)),
  medico:        ALL_NAV_ITEMS.filter(i => ![...ADMIN_ONLY, '/presentismo', '/convocatorias'].includes(i.href)),
  kinesiologo:   ALL_NAV_ITEMS.filter(i => ![...ADMIN_ONLY, '/presentismo', '/convocatorias'].includes(i.href)),
  nutricionista: ALL_NAV_ITEMS.filter(i => ![...ADMIN_ONLY, '/presentismo', '/convocatorias'].includes(i.href)),
  psicologo:     ALL_NAV_ITEMS.filter(i => ![...ADMIN_ONLY, '/presentismo', '/convocatorias'].includes(i.href)),
  cardiologo:    ALL_NAV_ITEMS.filter(i => ![...ADMIN_ONLY, '/presentismo', '/convocatorias'].includes(i.href)),
  social:        ALL_NAV_ITEMS.filter(i => ['/dashboard', '/deportistas', '/seguimientos', '/calendario'].includes(i.href)),
};

export function getNavItemsForRole(role: string | undefined | null): NavItem[] {
  if (!role || !(role in NAV_BY_ROLE)) {
    return ALL_NAV_ITEMS.filter(i => i.href === '/dashboard'); // fallback seguro
  }
  return NAV_BY_ROLE[role as AppRole];
}
