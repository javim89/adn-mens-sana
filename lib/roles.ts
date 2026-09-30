export type AppRole = 'admin' | 'entrenador' | 'medico' | 'kinesiologo' | 'nutricionista' | 'psicologo' | 'cardiologo' | 'social' | 'responsable_viandas';

export const ROLES_PERMITIDOS: AppRole[] = ['admin', 'entrenador', 'medico', 'kinesiologo', 'nutricionista', 'psicologo', 'cardiologo', 'social', 'responsable_viandas'];

export const ROL_LABELS: Record<AppRole, string> = {
  admin:               'Admin',
  entrenador:          'Entrenador',
  medico:              'Médico',
  kinesiologo:         'Kinesiólogo',
  nutricionista:       'Nutricionista',
  psicologo:           'Psicólogo',
  cardiologo:          'Cardiólogo',
  social:              'Social',
  responsable_viandas: 'Responsable de Viandas',
};

export type IconKey = 'LayoutDashboard' | 'Users' | 'CalendarDays' | 'UserCog' | 'ClipboardList' | 'Calendar' | 'ClipboardCheck' | 'Megaphone' | 'ChartColumn' | 'UtensilsCrossed';

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
  { href: '/viandas',      label: 'Viandas',       icon: 'UtensilsCrossed' },
  { href: '/seguimientos', label: 'Seguimientos',  icon: 'ClipboardList' },
  { href: '/calendario',   label: 'Calendario',    icon: 'Calendar' },
  { href: '/insights',     label: 'Insights',      icon: 'ChartColumn' },
  { href: '/usuarios',     label: 'Usuarios',      icon: 'UserCog' },
];

/**
 * Rutas exclusivas de admin. DENYLIST.
 *
 * NAV_BY_ROLE_BASE define cada rol por EXCLUSIÓN (salvo `social` y
 * `responsable_viandas`, que van por inclusión), así que un item nuevo en
 * ALL_NAV_ITEMS entra por defecto para todos los roles. Listar acá una ruta la
 * saca de todos los roles no-admin de una sola vez, en lugar de tener que
 * acordarse de agregarla a las 6 listas de exclusión.
 */
const ADMIN_ONLY: string[] = ['/insights', '/usuarios'];

/**
 * Rutas con acceso por ALLOWLIST: solo los roles listados acá las ven.
 *
 * Contracara de ADMIN_ONLY. Se aplica DESPUÉS de armar NAV_BY_ROLE_BASE, así una
 * ruta que pertenece a un rol específico no se cuela en las listas por exclusión
 * ni obliga a tocarlas. Una ruta ausente de este mapa no se restringe.
 */
const ROUTE_ROLES: Record<string, AppRole[]> = {
  '/viandas': ['admin', 'responsable_viandas'],
};

const NAV_BY_ROLE_BASE: Record<AppRole, NavItem[]> = {
  admin:         ALL_NAV_ITEMS,
  entrenador:    ALL_NAV_ITEMS.filter(i => ![...ADMIN_ONLY, '/turnos'].includes(i.href)),
  medico:        ALL_NAV_ITEMS.filter(i => ![...ADMIN_ONLY, '/presentismo', '/convocatorias'].includes(i.href)),
  kinesiologo:   ALL_NAV_ITEMS.filter(i => ![...ADMIN_ONLY, '/presentismo', '/convocatorias'].includes(i.href)),
  nutricionista: ALL_NAV_ITEMS.filter(i => ![...ADMIN_ONLY, '/presentismo', '/convocatorias'].includes(i.href)),
  psicologo:     ALL_NAV_ITEMS.filter(i => ![...ADMIN_ONLY, '/presentismo', '/convocatorias'].includes(i.href)),
  cardiologo:    ALL_NAV_ITEMS.filter(i => ![...ADMIN_ONLY, '/presentismo', '/convocatorias'].includes(i.href)),
  social:        ALL_NAV_ITEMS.filter(i => ['/dashboard', '/deportistas', '/seguimientos', '/calendario'].includes(i.href)),
  // Por inclusión. Incluye /dashboard porque `app/(app)/page.tsx` redirige ahí:
  // sin ese item el rol quedaría sin ninguna pantalla alcanzable al entrar.
  responsable_viandas: ALL_NAV_ITEMS.filter(i => ['/dashboard', '/viandas'].includes(i.href)),
};

const NAV_BY_ROLE = Object.fromEntries(
  (Object.entries(NAV_BY_ROLE_BASE) as [AppRole, NavItem[]][]).map(([rol, items]) => [
    rol,
    items.filter(i => (ROUTE_ROLES[i.href] ?? [rol]).includes(rol)),
  ]),
) as Record<AppRole, NavItem[]>;

export function getNavItemsForRole(role: string | undefined | null): NavItem[] {
  if (!role || !(role in NAV_BY_ROLE)) {
    return ALL_NAV_ITEMS.filter(i => i.href === '/dashboard'); // fallback seguro
  }
  return NAV_BY_ROLE[role as AppRole];
}
