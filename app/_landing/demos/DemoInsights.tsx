import { Calendar, Check, ChevronDown, Download, SlidersHorizontal } from 'lucide-react';
import KpiCard from '../../(app)/dashboard/_components/KpiCard';
import { PresentismoKpiDemo } from '../CardsDemo';
import { CATEGORIAS_FILTRO_DEMO, INSIGHTS_DEMO, VIANDAS_POR_COMIDA } from '../datos-demo';
import MarcoVentanaDemo from '../MarcoVentanaDemo';
import GraficoPresentismoDemo from './GraficoPresentismoDemo';

const VIANDAS_SEMANA = VIANDAS_POR_COMIDA.reduce((total, c) => total + (c.valor ?? 0), 0);
const SEMANAS = INSIGHTS_DEMO.data.map((d) => Number(d.presentismo));
const PROMEDIO = Math.round(SEMANAS.reduce((a, b) => a + b, 0) / SEMANAS.length);

/**
 * Un tablero de Insights con el filtro de categoría abierto. Decorativa.
 *
 * En lg+ va en el lienzo de `EscenarioDemo` (1280×832): encabezado, filtros y gráfico a la
 * izquierda; a la derecha el panel de opciones con el popover de categoría abierto
 * encima de los KPIs.
 */
export default function DemoInsights() {
  return (
    <MarcoVentanaDemo activo="/insights" variante="funcionalidad" className="relative w-full lg:h-full">
      <div className="lg:flex lg:h-full lg:gap-6">
        <div className="w-full min-w-0 lg:flex lg:w-[640px] lg:shrink-0 lg:flex-col">
          <div className="flex flex-wrap items-center gap-2">
            <p
              data-demo-clave="titulo"
              className="font-[family-name:var(--font-oswald)] text-xl font-bold text-[#121A61] lg:text-2xl"
            >
              Panorama general
            </p>
          </div>
          <p className="text-sm text-[#6B7280]">Tablero · se actualiza con cada carga</p>

          <div data-demo-clave="filtros" className="mt-4 flex flex-wrap items-center gap-2">
            <span className="inline-flex h-8 items-center gap-1.5 rounded-full border border-[#3346CC]/30 bg-[#3346CC]/10 px-3 text-xs font-medium text-[#3346CC]">
              Categoría: 4ta división
              <ChevronDown className="size-3.5" aria-hidden />
            </span>
            <span className="hidden h-8 items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 text-xs font-medium text-[#1C1C1C] sm:inline-flex">
              <Calendar className="size-3.5" aria-hidden />
              Últimas 12 semanas
            </span>
          </div>

          <div
            data-demo-clave="grafico"
            className="mt-4 rounded-xl border border-gray-100 bg-white shadow-sm lg:flex lg:min-h-0 lg:flex-1 lg:flex-col"
          >
            <div className="px-4 pb-2 pt-3">
              <p className="truncate text-sm font-semibold text-[#121A61] lg:text-clip">
                Presentismo — últimas 12 semanas
              </p>
              <p className="text-xs text-[#6B7280]">Asistencia a entrenamientos, 4ta división</p>
            </div>
            <div className="h-[180px] px-3 pb-3 lg:h-auto lg:min-h-0 lg:flex-1">
              <GraficoPresentismoDemo />
            </div>
          </div>

          <dl data-demo-clave="resumen" className="mt-4 hidden grid-cols-3 gap-3 lg:grid">
            {[
              { label: 'Promedio', valor: `${PROMEDIO}%` },
              { label: 'Mejor semana', valor: `${Math.max(...SEMANAS)}%` },
              { label: 'Variación', valor: `+${SEMANAS[SEMANAS.length - 1] - SEMANAS[0]} pts` },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border border-gray-100 bg-[#F9FAFB] px-4 py-3">
                <dt className="text-xs text-[#6B7280]">{s.label}</dt>
                <dd className="mt-0.5 font-[family-name:var(--font-oswald)] text-2xl font-semibold tabular-nums text-[#121A61]">
                  {s.valor}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <div data-demo-secundario className="hidden min-w-0 flex-1 flex-col gap-4 lg:flex">
          <div className="rounded-xl border border-gray-100 bg-[#F9FAFB] p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#6B7280]">Opciones del tablero</p>
              <span className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 text-xs font-medium text-[#1C1C1C]">
                <Download className="size-3.5" aria-hidden />
                Exportar
              </span>
            </div>
            <div className="relative mt-3">
              <span className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#3346CC]/40 bg-white px-3 text-xs font-medium text-[#3346CC] ring-2 ring-[#3346CC]/15">
                <SlidersHorizontal className="size-3.5" aria-hidden />
                Filtrar por categoría
                <ChevronDown className="size-3.5" aria-hidden />
              </span>
              <div
                data-demo-overlay="popover-categoria"
                className="landing-popover absolute left-0 top-full z-10 mt-2 w-[240px] rounded-xl border border-gray-100 bg-white p-3 shadow-xl shadow-[#121A61]/15"
              >
                <p className="px-1 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#6B7280]">
                  Categoría
                </p>
                <ul>
                  {CATEGORIAS_FILTRO_DEMO.map((c) => (
                    <li
                      key={c.label}
                      className={`flex items-center gap-2 rounded-md px-1.5 py-1.5 text-sm text-[#1C1C1C] ${c.marcada ? 'bg-[#F3F4F6]' : ''}`}
                    >
                      <span
                        className={`flex size-4 items-center justify-center rounded border ${c.marcada ? 'border-[#121A61] bg-[#121A61]' : 'border-gray-300'}`}
                      >
                        {c.marcada && <Check className="size-3 text-white" aria-hidden />}
                      </span>
                      {c.label}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
          <PresentismoKpiDemo />
          <KpiCard
            modulo="viandas"
            label="Viandas entregadas"
            valor={VIANDAS_SEMANA.toLocaleString('es-AR')}
            detalle="Esta semana, las cuatro comidas."
          />
        </div>
      </div>
    </MarcoVentanaDemo>
  );
}
