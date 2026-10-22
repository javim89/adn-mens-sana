import { PRIORIDAD_LABELS, PRIORIDAD_STYLES, TIPO_SEGUIMIENTO_META } from '@/lib/utils/seguimiento-tipo';
import type { TipoSeguimiento } from '@/lib/types/seguimientos';
import { Avatar } from '@/app/components/ui/avatar';
import TileFecha from '../../(app)/dashboard/_components/TileFecha';
import VariacionBadge from '../../(app)/dashboard/_components/VariacionBadge';
import { ACENTOS } from '../../(app)/dashboard/_lib/acentos';
import { SEGUIMIENTOS_DEMO, SEGUIMIENTOS_LISTA_DEMO, TURNOS_DEMO } from '../datos-demo';
import MarcoVentanaDemo from '../MarcoVentanaDemo';

const BADGE = 'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap';
const COLUMNAS_LG = 'lg:grid-cols-[180px_minmax(0,1fr)_48px_84px]';

/** Los 42 abiertos por tipo, para el panel lateral. */
const POR_TIPO: { tipo: TipoSeguimiento; cantidad: number }[] = [
  { tipo: 'TRAUMATOLOGIA', cantidad: 14 },
  { tipo: 'HISTORIA_CLINICA', cantidad: 9 },
  { tipo: 'EVALUACION_PSICOLOGICA', cantidad: 8 },
  { tipo: 'EVALUACION_CARDIOLOGICA', cantidad: 5 },
  { tipo: 'ANTROPOMETRIA', cantidad: 4 },
  { tipo: 'GENERICO', cantidad: 2 },
];

/**
 * El listado de seguimientos con los próximos turnos. Decorativa.
 *
 * En lg+ (lienzo de `EscenarioDemo`): KPI y tabla a la izquierda (las columnas se
 * reordenan con `order`, el DOM es el de mobile) y a la derecha el desglose por tipo, con
 * la card de próximos turnos flotando encima.
 */
export default function DemoSeguimientos() {
  return (
    <MarcoVentanaDemo activo="/seguimientos" variante="funcionalidad" className="relative w-full lg:h-full">
      <div className="lg:flex lg:h-full lg:gap-6">
        <div className="w-full min-w-0 lg:w-[640px] lg:shrink-0">
          <div className="flex flex-wrap items-center gap-2">
            <p
              data-demo-clave="titulo"
              className="font-[family-name:var(--font-oswald)] text-xl font-bold text-[#121A61] lg:text-2xl"
            >
              Seguimientos
            </p>
            <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-[#6B7280]">
              {SEGUIMIENTOS_DEMO.abiertos} abiertos
            </span>
          </div>

          <div
            data-demo-clave="kpi"
            className="mt-4 hidden items-center gap-5 rounded-2xl bg-[#121A61] px-6 py-5 text-white lg:flex"
          >
            <p className="font-[family-name:var(--font-oswald)] text-6xl font-semibold leading-none tabular-nums">
              {SEGUIMIENTOS_DEMO.abiertos}
            </p>
            <div className="min-w-0 space-y-1">
              <p className="text-sm font-medium text-white/80">Seguimientos abiertos</p>
              <VariacionBadge variacion={SEGUIMIENTOS_DEMO.variacion} sentido="menos_es_mejor" sobreOscuro />
              <p className="text-xs text-white/70">Médicos, psicológicos y sociales, de todo el plantel.</p>
            </div>
          </div>

          <div className="mt-4 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
            <div
              className={`hidden gap-x-3 border-b border-gray-100 bg-[#F3F4F6] px-4 py-2.5 text-xs uppercase text-[#6B7280] lg:grid ${COLUMNAS_LG}`}
            >
              <span>Deportista</span>
              <span>Título</span>
              <span>Fecha</span>
              <span>Prioridad</span>
            </div>
            {SEGUIMIENTOS_LISTA_DEMO.map((s, i) => {
              const tipo = TIPO_SEGUIMIENTO_META[s.tipo];
              return (
                <div
                  key={s.id}
                  className={`${i >= 3 ? 'hidden lg:grid' : 'grid'} grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 border-b border-gray-50 px-3 py-3 lg:px-4 lg:py-2.5 ${COLUMNAS_LG}`}
                >
                  <div
                    data-demo-clave="tabla-principal"
                    className="contents lg:flex lg:min-w-0 lg:items-center lg:gap-2"
                  >
                    <Avatar alt={s.deportista} iniciales={s.iniciales} className="size-8 text-xs" />
                    <span
                      data-demo-clave="fila-nombre"
                      className="truncate text-sm font-medium text-[#1C1C1C] lg:text-clip"
                    >
                      {s.deportista}
                    </span>
                  </div>
                  <span data-demo-clave="tabla-principal" className="text-xs text-[#6B7280] lg:order-1">
                    {s.fecha}
                  </span>
                  <span
                    data-demo-clave="tabla-principal"
                    className="col-span-2 col-start-2 truncate text-xs text-[#6B7280] lg:col-span-1 lg:col-start-auto lg:text-clip lg:text-sm lg:text-[#1C1C1C]"
                  >
                    {s.titulo}
                  </span>
                  <div className="col-span-2 col-start-2 flex gap-1.5 lg:contents">
                    <span
                      data-demo-clave="tabla-principal"
                      className={`${BADGE} w-fit lg:order-2 ${PRIORIDAD_STYLES[s.prioridad]}`}
                    >
                      {PRIORIDAD_LABELS[s.prioridad]}
                    </span>
                    <span className={`${BADGE} w-fit lg:hidden ${tipo.badge}`}>{tipo.label}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="relative hidden min-w-0 flex-1 lg:block">
          <div data-demo-secundario className="h-full rounded-xl border border-gray-100 bg-[#F9FAFB] p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#6B7280]">Abiertos por tipo</p>
            <ul className="mt-4 space-y-3">
              {POR_TIPO.map(({ tipo, cantidad }) => (
                <li key={tipo}>
                  <div className="flex items-center justify-between text-sm text-[#1C1C1C]">
                    <span className="flex items-center gap-2">
                      <span className={`size-2 rounded-full ${TIPO_SEGUIMIENTO_META[tipo].dot}`} />
                      {TIPO_SEGUIMIENTO_META[tipo].label}
                    </span>
                    <span className="font-mono font-semibold tabular-nums">{cantidad}</span>
                  </div>
                  <div className="mt-1.5 h-1.5 rounded-full bg-gray-200">
                    <div
                      className={`h-full rounded-full ${TIPO_SEGUIMIENTO_META[tipo].dot}`}
                      style={{ width: `${(cantidad / POR_TIPO[0].cantidad) * 100}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div
            data-demo-overlay="proximos-turnos"
            className="landing-popover absolute inset-x-3 bottom-6 z-10 rounded-xl border border-gray-100 bg-white p-4 shadow-xl shadow-[#121A61]/15"
          >
            <p className="text-sm font-semibold text-[#121A61]">Próximos turnos</p>
            <ul className="mt-3 space-y-2">
              {TURNOS_DEMO.slice(0, 2).map((t) => (
                <li key={t.id} className="flex items-center gap-3 rounded-lg bg-gray-50 p-2">
                  <TileFecha arriba={t.dia} abajo={t.hora} fondo={ACENTOS.turnos.tileFecha} />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[#1C1C1C]">{t.titulo}</p>
                    <p className="text-xs text-[#5B6478]">{t.detalle}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </MarcoVentanaDemo>
  );
}
