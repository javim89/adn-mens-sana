import { ALL_NAV_ITEMS } from '@/lib/roles';
import { ICON_MAP } from '@/lib/nav-icons';
import { Avatar } from '@/app/components/ui/avatar';
import BloqueDashboard from '../(app)/dashboard/_components/BloqueDashboard';
import { OSWALD } from '../(app)/dashboard/_lib/acentos';
import {
  PlantelDemo,
  PresentismoKpiDemo,
  PresentismoPorDiaDemo,
  SeguimientosKpiDemo,
  TriageDemo,
  TurnosDemo,
  ViandasPorComidaDemo,
} from './CardsDemo';
import { SEMANA_DEMO } from './datos-demo';

/**
 * La ventana del dashboard que arma el morph del hero: el marco del `AppShell` (sidebar
 * navy con los items reales de `ALL_NAV_ITEMS`) y el `/dashboard` con sus bloques
 * (`BloqueDashboard`) y las cards de ejemplo de `CardsDemo`.
 *
 * **Ancho de diseño fijo** (1516px): las columnas de la grilla miden exactamente
 * lo mismo que cada card flotante del hero (300 / 300 / 270 / 310), así
 * que una card llega a su slot con una escala UNIFORME y sin cambiar de layout. La
 * ventana entera se escala para entrar: con `transform` en el morph y con `zoom` en la
 * versión estática.
 *
 * Cada `data-morph-slot` es el destino de la card del hero con el mismo id. Durante el
 * morph su contenido se oculta (la card que se ve es la que viaja desde el hero); sin
 * morph se ve el contenido propio del slot. Los `data-morph-extra` (la segunda fila)
 * solo existen acá: aparecen al final de la etapa 1 y se ven enteros en la etapa 2,
 * cuando `data-morph-contenido` scrollea dentro de `data-morph-columna` (los
 * `data-morph-ancla` son el destino del cursor de la etapa 2).
 *
 * Con el morph la ventana tiene alto fijo (670px, `globals.css`); sin morph, su alto
 * natural, con las dos filas enteras.
 *
 * Decorativa entera: `aria-hidden` + `inert`, sin links a rutas protegidas.
 */
export default function VentanaDashboard() {
  return (
    <div data-morph-ventana-marco className="morph-ventana-marco mx-auto hidden w-full max-w-[1200px] px-6 pb-24 xl:block">
      <div
        aria-hidden
        inert
        data-morph-ventana
        data-testid="ventana-dashboard"
        className="morph-ventana relative flex w-[1516px] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl shadow-[#121A61]/15 [zoom:0.76]"
      >
        {/* Barra de la ventana. */}
        <div className="flex h-9 shrink-0 items-center gap-2 border-b border-gray-100 bg-[#F9FAFB] px-4">
          <span className="size-3 rounded-full bg-[#FF5F57]" />
          <span className="size-3 rounded-full bg-[#FEBC2E]" />
          <span className="size-3 rounded-full bg-[#28C840]" />
        </div>

        <div className="flex min-h-0 flex-1">
          {/* Sidebar, como `app/components/Sidebar.tsx`. */}
          <div className="flex w-[220px] shrink-0 flex-col bg-[#121A61] text-white">
            <div className="border-b border-white/10 px-5 py-4">
              <p className="text-sm font-semibold leading-tight" style={OSWALD}>
                ADN Mens Sana
              </p>
              <p className="mt-0.5 text-xs text-white/50">Historia Deportiva</p>
            </div>
            <ul className="flex-1 space-y-1 px-3 py-6">
              {ALL_NAV_ITEMS.map(({ href, label, icon }) => {
                const Icono = ICON_MAP[icon];
                const activo = href === '/dashboard';
                return (
                  <li
                    key={href}
                    className={`flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium ${activo ? 'border-l-2 border-[#C9A84C] bg-white/15 text-white' : 'text-white/70'}`}
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

          {/* `/dashboard`: como el `<main>` del AppShell, scrollea entero (encabezado incluido). */}
          <div data-morph-columna className="relative min-w-0 flex-1 overflow-hidden">
            <div data-morph-contenido className="p-7">
              {/* El encabezado de `app/(app)/dashboard/page.tsx`: título y semana, sin nada más. */}
              <p className="mb-1 text-3xl font-bold text-[#121A61]" style={OSWALD}>
                Dashboard
              </p>
              <p className="text-[#6B7280]">Resumen de la semana {SEMANA_DEMO}.</p>

              <div className="mt-6 grid grid-cols-[300px_300px_270px_310px] items-start gap-x-5 gap-y-8">
                <BloqueDashboard id="demo-triage" titulo="Triage" descripcion="Riesgo del plantel activo." modulo="triage">
                  <div data-morph-slot="triage">
                    <TriageDemo columnas={2} />
                  </div>
                </BloqueDashboard>

                <div className="col-span-2">
                  <BloqueDashboard
                    id="demo-presentismo"
                    titulo="Presentismo"
                    descripcion="Asistencia a los entrenamientos de esta semana."
                    modulo="presentismo"
                  >
                    <div className="grid grid-cols-[300px_270px] items-start gap-5">
                      <div data-morph-slot="presentismo-dia">
                        <PresentismoPorDiaDemo />
                      </div>
                      <div data-morph-slot="presentismo-kpi">
                        <PresentismoKpiDemo />
                      </div>
                    </div>
                  </BloqueDashboard>
                </div>

                <BloqueDashboard id="demo-turnos" titulo="Turnos" descripcion="La agenda de esta semana." modulo="turnos">
                  <div data-morph-slot="turnos">
                    <TurnosDemo cantidad={2} />
                  </div>
                </BloqueDashboard>

                <div data-morph-extra data-morph-ancla="seguimientos">
                  <BloqueDashboard id="demo-seguimientos" titulo="Seguimientos" descripcion="Backlog abierto." modulo="seguimientos">
                    <SeguimientosKpiDemo />
                  </BloqueDashboard>
                </div>

                <div data-morph-extra data-morph-ancla="viandas" className="col-span-2">
                  <BloqueDashboard
                    id="demo-viandas"
                    titulo="Viandas"
                    descripcion="Entregas de comida registradas esta semana."
                    modulo="viandas"
                  >
                    <ViandasPorComidaDemo />
                  </BloqueDashboard>
                </div>

                <div data-morph-extra data-morph-ancla="plantel">
                  <BloqueDashboard id="demo-plantel" titulo="Plantel" descripcion="Los deportistas por estado." modulo="plantel">
                    <PlantelDemo />
                  </BloqueDashboard>
                </div>
              </div>
            </div>

            {/* Solo con el morph, donde la ventana tiene alto fijo: la ventana corta debajo de
                los encabezados de la segunda fila (terminan ~636px), antes del texto de sus
                cards (~679px), y el degradé cubre ese borde. Se apaga cuando la etapa 2 termina
                de scrollear y ya no hay nada cortado. */}
            <div data-morph-degrade className="pointer-events-none absolute inset-x-0 bottom-0 z-10 hidden h-7 bg-linear-to-t from-white to-white/0" />
            {/* El borde de arriba en la etapa 2: lo que queda de la primera fila se desvanece en
                vez de cortarse a mitad de una línea. Aparece con el scroll interno. */}
            <div data-morph-degrade-arriba className="pointer-events-none absolute inset-x-0 top-0 z-10 hidden h-6 bg-linear-to-b from-white to-white/0" />
          </div>
        </div>
      </div>
    </div>
  );
}
