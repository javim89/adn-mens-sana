import { ChevronDown, ChevronRight, Search } from 'lucide-react';
import { ESTADO_BADGE, ESTADO_LABELS, NIVEL_TRIAGE_BADGE, NIVEL_TRIAGE_LABELS } from '@/lib/utils/enum-labels';
import { Avatar } from '@/app/components/ui/avatar';
import KpiCard from '../../(app)/dashboard/_components/KpiCard';
import { TriageDemo } from '../CardsDemo';
import { ALERTAS_TRIAGE_DEMO, DEPORTISTAS_DEMO, PLANTEL_DEMO, TRIAGE_DEMO } from '../datos-demo';
import { BADGE, EncabezadoPantalla, FiltroDemo, PanelDemo, Pantalla, RotuloDemo } from './comun';

/** El plantel con la distribución de triage (las piezas reales del dashboard) y el listado con su nivel. */
export function PantallaTriagePlantel() {
  return (
    <Pantalla clave="triage-plantel" activo="/deportistas">
      <EncabezadoPantalla titulo="Deportistas" contador={String(PLANTEL_DEMO.total)} accion="Nuevo deportista" />
      <div className="mt-3 flex flex-wrap gap-2">
        <span className="relative hidden h-8 w-56 items-center rounded-lg border border-gray-200 bg-white pl-8 text-xs text-[#6B7280] @lg:flex">
          <Search className="absolute left-2.5 size-3.5" aria-hidden />
          Buscar por nombre o DNI…
        </span>
        <FiltroDemo activo>
          Triage: todos
          <ChevronDown className="size-3.5" aria-hidden />
        </FiltroDemo>
      </div>

      <div className="mt-4 grid items-start gap-4 @3xl:grid-cols-[minmax(0,1fr)_minmax(0,300px)]">
        <PanelDemo className="overflow-hidden">
          {DEPORTISTAS_DEMO.map((d, i) => (
            <div
              key={d.id}
              className={`${i >= 5 ? 'hidden @3xl:flex' : 'flex'} items-center gap-3 border-b border-gray-50 px-3 py-2.5 last:border-0 @md:px-4`}
            >
              <Avatar alt={d.nombre} iniciales={d.iniciales} className="size-8 text-xs" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-[#1C1C1C]">{d.nombre}</p>
                <p className="truncate text-xs text-[#6B7280]">{d.categoria}</p>
              </div>
              <span className="hidden @md:contents">
                <span className={`${BADGE} ${ESTADO_BADGE[d.estado]}`}>{ESTADO_LABELS[d.estado]}</span>
              </span>
              <span className={`${BADGE} ${NIVEL_TRIAGE_BADGE[d.triage]}`}>{NIVEL_TRIAGE_LABELS[d.triage]}</span>
            </div>
          ))}
        </PanelDemo>
        <div className="order-first min-w-0 @3xl:order-none">
          <TriageDemo columnas={2} />
        </div>
      </div>
    </Pantalla>
  );
}

const PUNTO_NIVEL = { ROJO: 'bg-red-500', NARANJA: 'bg-orange-500', AMARILLO: 'bg-yellow-400', VERDE: 'bg-green-500' } as const;

/** El bloque de triage del tablero: los activos en rojo y a quién atender primero, con el motivo. */
export function PantallaTriageAlertas() {
  return (
    <Pantalla clave="triage-alertas" activo="/dashboard">
      <EncabezadoPantalla titulo="Dashboard" bajada="Triage del plantel activo." />
      <div className="mt-4 grid items-start gap-4 @2xl:grid-cols-[minmax(0,240px)_minmax(0,1fr)]">
        <KpiCard
          variante="hero"
          label="Deportistas activos en rojo"
          valor={TRIAGE_DEMO.actual.ROJO}
          detalle={`De ${TRIAGE_DEMO.totalActivos} activos. Se recalcula cada semana.`}
        />

        <PanelDemo className="p-4">
          <div className="flex items-center justify-between gap-2">
            <RotuloDemo>A quién atender primero</RotuloDemo>
            <span className="hidden text-xs font-semibold text-[#3346CC] @md:inline">Ver todos</span>
          </div>
          <ul className="mt-2 divide-y divide-gray-100">
            {ALERTAS_TRIAGE_DEMO.map((a, i) => (
              <li key={a.id} className={`${i >= 4 ? 'hidden @2xl:flex' : 'flex'} items-start gap-3 py-2.5`}>
                <span className={`mt-3 size-2.5 shrink-0 rounded-full ${PUNTO_NIVEL[a.nivel]}`} />
                <Avatar alt={a.nombre} iniciales={a.iniciales} className="size-8 text-xs" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <p className="text-sm font-medium text-[#1C1C1C]">{a.nombre}</p>
                    <span className={`${BADGE} ${NIVEL_TRIAGE_BADGE[a.nivel]}`}>{NIVEL_TRIAGE_LABELS[a.nivel]}</span>
                  </div>
                  <p className="text-xs text-[#6B7280]">
                    {a.categoria} · {a.motivos.join(' · ')}
                  </p>
                </div>
                <ChevronRight className="mt-2 hidden size-4 shrink-0 text-[#6B7280] @md:block" aria-hidden />
              </li>
            ))}
          </ul>
        </PanelDemo>
      </div>
    </Pantalla>
  );
}
