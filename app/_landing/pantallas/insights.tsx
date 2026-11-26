import { BarChart3, Calendar, ChevronDown, Download, LineChart, PieChart, Plus, Table } from 'lucide-react';
import BarrasCategoria from '../../(app)/dashboard/_components/BarrasCategoria';
import { PresentismoKpiDemo } from '../CardsDemo';
import GraficoPresentismoDemo from '../demos/GraficoPresentismoDemo';
import { IMC_POR_CATEGORIA, INSIGHTS_DEMO } from '../datos-demo';
import { BotonDemo, EncabezadoPantalla, FiltroDemo, PanelDemo, Pantalla } from './comun';

const SEMANAS = INSIGHTS_DEMO.data.map((d) => Number(d.presentismo));
const PROMEDIO = Math.round(SEMANAS.reduce((a, b) => a + b, 0) / SEMANAS.length);

/** Un tablero: filtros, el `LineChart` real con el presentismo de 12 semanas, KPIs y exportar a CSV. */
export function PantallaInsightsPanel() {
  return (
    <Pantalla clave="insights-panel" activo="/insights">
      <EncabezadoPantalla titulo="Panorama general" bajada="Tablero del club" />
      <div className="mt-3 flex flex-wrap gap-2">
        <FiltroDemo activo>
          Categoría: 4ta división
          <ChevronDown className="size-3.5" aria-hidden />
        </FiltroDemo>
        <span className="hidden @md:contents">
          <FiltroDemo>
            <Calendar className="size-3.5" aria-hidden />
            Últimas 12 semanas
          </FiltroDemo>
        </span>
      </div>

      <div className="mt-4 grid items-start gap-4 @4xl:grid-cols-[minmax(0,1fr)_260px]">
        <div className="min-w-0">
          <PanelDemo>
            <div className="flex items-start justify-between gap-3 px-4 pb-2 pt-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[#121A61]">Presentismo — últimas 12 semanas</p>
                <p className="text-xs text-[#6B7280]">Asistencia a entrenamientos, 4ta división</p>
              </div>
              <span className="hidden shrink-0 items-center gap-1 rounded-md border border-gray-200 px-2 py-1 text-[11px] font-medium text-[#1C1C1C] @md:inline-flex">
                <Download className="size-3" aria-hidden />
                CSV
              </span>
            </div>
            <div className="h-[180px] px-3 pb-3 @2xl:h-[240px]">
              <GraficoPresentismoDemo />
            </div>
          </PanelDemo>

          <dl className="mt-4 grid grid-cols-3 gap-2 @md:gap-3">
            {[
              { label: 'Promedio', valor: `${PROMEDIO}%` },
              { label: 'Mejor semana', valor: `${Math.max(...SEMANAS)}%` },
              { label: 'Variación', valor: `+${SEMANAS[SEMANAS.length - 1] - SEMANAS[0]} pts` },
            ].map((s) => (
              <div key={s.label} className="min-w-0 rounded-xl border border-gray-100 bg-[#F9FAFB] px-2.5 py-2 @md:px-4 @md:py-3">
                <dt className="truncate text-[11px] text-[#6B7280] @md:text-xs">{s.label}</dt>
                <dd className="mt-0.5 font-[family-name:var(--font-oswald)] text-lg font-semibold tabular-nums text-[#121A61] @md:text-2xl">
                  {s.valor}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="hidden min-w-0 @4xl:block">
          <PresentismoKpiDemo />
        </div>
      </div>
    </Pantalla>
  );
}

const TIPOS_GRAFICO = [
  { label: 'Barras', icono: BarChart3, activo: true },
  { label: 'Líneas', icono: LineChart, activo: false },
  { label: 'Torta', icono: PieChart, activo: false },
  { label: 'Tabla', icono: Table, activo: false },
];

/** Un selector de mentira del constructor. */
function SelectorDemo({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-[#6B7280]">{label}</p>
      <div className="mt-1 flex h-9 items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white px-3 text-sm text-[#1C1C1C]">
        <span className="truncate">{valor}</span>
        <ChevronDown className="size-3.5 shrink-0 text-[#6B7280]" aria-hidden />
      </div>
    </div>
  );
}

/** El constructor visual: conjunto de datos, medida, agrupación y tipo de gráfico, con el resultado al lado. */
export function PantallaInsightsConsulta() {
  return (
    <Pantalla clave="insights-consulta" activo="/insights">
      <EncabezadoPantalla titulo="Nuevo widget" bajada="Constructor visual, sin código" />

      <div className="mt-4 grid items-start gap-4 @3xl:grid-cols-[minmax(0,260px)_minmax(0,1fr)]">
        <PanelDemo className="grid gap-3 p-4 @md:grid-cols-2 @3xl:grid-cols-1">
          <SelectorDemo label="Datos" valor="Antropometría" />
          <SelectorDemo label="Medida" valor="Promedio de IMC" />
          <SelectorDemo label="Agrupar por" valor="Categoría" />
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#6B7280]">Gráfico</p>
            <div className="mt-1 grid grid-cols-4 gap-1">
              {TIPOS_GRAFICO.map(({ label, icono: Icono, activo }) => (
                <span
                  key={label}
                  className={`flex h-9 items-center justify-center rounded-lg border ${activo ? 'border-[#3346CC] bg-[#3346CC]/10 text-[#3346CC]' : 'border-gray-200 bg-white text-[#6B7280]'}`}
                >
                  <Icono className="size-4" aria-hidden />
                </span>
              ))}
            </div>
          </div>
        </PanelDemo>

        <PanelDemo className="p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[#121A61]">IMC promedio por categoría</p>
              <p className="text-xs text-[#6B7280]">Última medición de cada deportista</p>
            </div>
            <span className="inline-flex shrink-0 items-center gap-1 rounded-md border border-gray-200 px-2 py-1 text-[11px] font-medium text-[#1C1C1C]">
              <Download className="size-3" aria-hidden />
              CSV
            </span>
          </div>
          <div className="mt-4">
            <BarrasCategoria
              categorias={IMC_POR_CATEGORIA}
              barraFuerte="bg-[#3346CC]"
              barraSuave="bg-[#3346CC]/30"
              formatear={(v) => v.toFixed(1).replace('.', ',')}
            />
          </div>
          <div className="mt-4 flex justify-end">
            <BotonDemo>
              <Plus className="size-3.5" aria-hidden />
              Agregar al tablero
            </BotonDemo>
          </div>
        </PanelDemo>
      </div>
    </Pantalla>
  );
}
