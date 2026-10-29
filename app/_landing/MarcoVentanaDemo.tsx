import { ALL_NAV_ITEMS, type NavItem } from '@/lib/roles';
import { ICON_MAP } from '@/lib/nav-icons';
import { Avatar } from '@/app/components/ui/avatar';
import { OSWALD } from '../(app)/dashboard/_lib/acentos';
import LogoBioTeam from '@/app/components/LogoBioTeam';

type Variante = 'dashboard' | 'funcionalidad';

/**
 * El marco de una ventana de la app: barra tipo macOS + sidebar navy del `AppShell`
 * (los ítems reales de `ALL_NAV_ITEMS`) + el área principal (`children`).
 *
 * - `dashboard`: el marco de la ventana del morph (`VentanaDashboard`), tal cual era. El
 *   llamador pasa todas las clases y atributos de la raíz (los `data-morph-*` viven ahí) y
 *   el área principal entera como `children`.
 * - `funcionalidad`: el de las demos de la sección de funcionalidades. La misma instancia
 *   se ve en mobile y en desktop, así que es fluida. En lg llena el lienzo de
 *   `EscenarioDemo` con el sidebar completo; ahí la ventana (borde, sombra, esquinas) la
 *   pone `[data-demo]`, así que el marco no lleva las suyas. El área principal ya viene
 *   con su padding.
 *
 * No agrega `aria-hidden`/`inert`: lo hace quien lo monta.
 */
export default function MarcoVentanaDemo({
  activo,
  variante = 'dashboard',
  className,
  children,
  ...atributos
}: {
  activo: NavItem['href'];
  variante?: Variante;
  className?: string;
  children: React.ReactNode;
} & Omit<React.HTMLAttributes<HTMLDivElement>, 'className' | 'children'>) {
  if (variante === 'dashboard') {
    return (
      <div {...atributos} className={className}>
        <div className="flex h-9 shrink-0 items-center gap-2 border-b border-gray-100 bg-[#F9FAFB] px-4">
          <span className="size-3 rounded-full bg-[#FF5F57]" />
          <span className="size-3 rounded-full bg-[#FEBC2E]" />
          <span className="size-3 rounded-full bg-[#28C840]" />
        </div>

        <div className="flex min-h-0 flex-1">
          <div className="flex w-[220px] shrink-0 flex-col bg-[#121A61] text-white">
            <div className="flex items-center gap-3 border-b border-white/10 px-5 py-4">
              <LogoBioTeam variante="inverso" className="h-9" />
              <div>
                <p className="text-sm font-semibold uppercase leading-tight tracking-wide" style={OSWALD}>
                  BioTeam
                </p>
                <p className="mt-0.5 text-xs text-white/50">Historia Deportiva</p>
              </div>
            </div>
            <ul className="flex-1 space-y-1 px-3 py-6">
              {ALL_NAV_ITEMS.map(({ href, label, icon }) => {
                const Icono = ICON_MAP[icon];
                const esActivo = href === activo;
                return (
                  <li
                    key={href}
                    className={`flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium ${esActivo ? 'border-l-2 border-[#C9A84C] bg-white/15 text-white' : 'text-white/70'}`}
                  >
                    <Icono size={18} aria-hidden />
                    {label}
                  </li>
                );
              })}
            </ul>
            <div className="flex items-center gap-3 border-t border-white/10 px-4 py-4">
              <Avatar alt="Mi cuenta" iniciales="A" className="size-8 text-xs ring-1 ring-white/30" />
              <span className="text-xs text-white/60">Mi cuenta</span>
            </div>
          </div>

          {children}
        </div>
      </div>
    );
  }

  return (
    <div
      {...atributos}
      className={`flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl shadow-[#121A61]/10 lg:rounded-none lg:border-0 lg:shadow-none ${className ?? ''}`}
    >
      <div className="flex h-7 shrink-0 items-center gap-1.5 border-b border-gray-100 bg-[#F9FAFB] px-3 lg:h-9 lg:gap-2 lg:px-4">
        <span className="size-2.5 rounded-full bg-[#FF5F57] lg:size-3" />
        <span className="size-2.5 rounded-full bg-[#FEBC2E] lg:size-3" />
        <span className="size-2.5 rounded-full bg-[#28C840] lg:size-3" />
      </div>

      <div className="flex min-h-0 flex-1">
        <div className="hidden w-[220px] shrink-0 flex-col bg-[#121A61] text-white lg:flex">
          <div className="flex items-center gap-3 border-b border-white/10 px-5 py-4">
            <LogoBioTeam variante="inverso" className="h-9" />
            <div>
              <p className="font-[family-name:var(--font-oswald)] text-sm font-semibold uppercase leading-tight tracking-wide">BioTeam</p>
              <p className="mt-0.5 text-xs text-white/50">Historia Deportiva</p>
            </div>
          </div>
          <ul className="flex-1 space-y-1 px-3 py-6">
            {ALL_NAV_ITEMS.map(({ href, label, icon }) => {
              const Icono = ICON_MAP[icon];
              const esActivo = href === activo;
              return (
                <li
                  key={href}
                  className={`flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium ${esActivo ? 'border-l-2 border-[#C9A84C] bg-white/15 text-white' : 'text-white/70'}`}
                >
                  <Icono className="size-[18px] shrink-0" aria-hidden />
                  {label}
                </li>
              );
            })}
          </ul>
          <div className="flex items-center gap-3 border-t border-white/10 px-4 py-4">
            <Avatar alt="Mi cuenta" iniciales="A" className="size-8 text-xs ring-1 ring-white/30" />
            <span className="text-xs text-white/60">Mi cuenta</span>
          </div>
        </div>

        <div className="relative min-w-0 flex-1 bg-white p-4 lg:p-8">{children}</div>
      </div>
    </div>
  );
}
