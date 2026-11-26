import {
  PresentismoKpiDemo,
  TriageDemo,
  TurnosDemo,
} from '../CardsDemo';
import { SEMANA_DEMO } from '../datos-demo';
import { Pantalla } from './comun';

/**
 * El rótulo de un módulo del dashboard, como `BloqueDashboard` (barra lavanda con el
 * cuadradito del módulo) pero sin su `<section>`/`<h2>`: acá es decoración.
 */
function RotuloModulo({ titulo, cuadrado }: { titulo: string; cuadrado: string }) {
  return (
    <div className="mb-3 flex items-center gap-2.5 rounded-xl bg-[#121A61]/[0.08] px-3 py-2.5">
      <span className={`size-3 shrink-0 rounded-sm ${cuadrado}`} />
      <span className="font-[family-name:var(--font-oswald)] text-sm font-semibold uppercase tracking-[0.14em] text-[#121A61]">
        {titulo}
      </span>
    </div>
  );
}

/** El `/dashboard` con las cards reales de `CardsDemo`: triage, presentismo y turnos, en una fila que se acomoda al ancho. */
export function PantallaDashboard() {
  return (
    <Pantalla clave="dashboard" activo="/dashboard">
      <p className="font-[family-name:var(--font-oswald)] text-xl font-bold text-[#121A61] @3xl:text-3xl">Dashboard</p>
      <p className="text-sm text-[#6B7280]">Resumen de la semana {SEMANA_DEMO}.</p>

      {/* Una sola fila de módulos: el índice la muestra al lado de pantallas de ~600px de alto. */}
      <div className="mt-5 grid grid-cols-1 items-start gap-x-5 gap-y-6 @2xl:grid-cols-2 @5xl:grid-cols-3">
        <div className="min-w-0">
          <RotuloModulo titulo="Triage" cuadrado="bg-red-600" />
          <TriageDemo columnas={2} />
        </div>
        <div className="min-w-0">
          <RotuloModulo titulo="Presentismo" cuadrado="bg-teal-600" />
          <PresentismoKpiDemo />
        </div>
        <div className="hidden min-w-0 @5xl:block">
          <RotuloModulo titulo="Turnos" cuadrado="bg-emerald-600" />
          <TurnosDemo cantidad={2} />
        </div>
      </div>
    </Pantalla>
  );
}
