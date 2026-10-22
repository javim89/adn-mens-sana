import { Search } from 'lucide-react';
import { ESTADO_BADGE, ESTADO_LABELS, NIVEL_TRIAGE_BADGE, NIVEL_TRIAGE_LABELS } from '@/lib/utils/enum-labels';
import { Avatar } from '@/app/components/ui/avatar';
import { TriageDemo } from '../CardsDemo';
import { DEPORTISTAS_DEMO, FICHA_DEMO, PLANTEL_DEMO } from '../datos-demo';
import MarcoVentanaDemo from '../MarcoVentanaDemo';

const BADGE = 'inline-flex w-fit items-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap';
const COLUMNAS_LG = 'lg:grid-cols-[minmax(0,1fr)_104px_84px_92px_84px]';

/**
 * El listado del plantel con la ficha resumida del primero abierta. Decorativa.
 *
 * En lg+ (lienzo de `EscenarioDemo`): buscador y tabla a la izquierda (las columnas se
 * reordenan con `order`, el DOM es el de mobile; la fila del primero queda marcada) y a
 * la derecha la distribución de triage, con la ficha del primero flotando encima.
 */
export default function DemoDeportistas() {
  const primero = DEPORTISTAS_DEMO[0];
  return (
    <MarcoVentanaDemo activo="/deportistas" variante="funcionalidad" className="relative w-full lg:h-full">
      <div className="lg:flex lg:h-full lg:gap-6">
        <div className="w-full min-w-0 lg:w-[640px] lg:shrink-0">
          <div className="flex flex-wrap items-center gap-2">
            <p
              data-demo-clave="titulo"
              className="font-[family-name:var(--font-oswald)] text-xl font-bold text-[#121A61] lg:text-2xl"
            >
              Deportistas
            </p>
            <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-[#6B7280]">
              {PLANTEL_DEMO.total}
            </span>
          </div>

          <div
            data-demo-clave="buscador"
            className="relative mt-4 hidden h-9 w-full items-center rounded-lg border border-gray-200 bg-white pl-8 text-sm text-[#9CA3AF] lg:flex"
          >
            <Search className="absolute left-2.5 size-4" aria-hidden />
            Buscar por nombre o DNI…
          </div>

          <div className="mt-4 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
            <div
              className={`hidden gap-x-3 border-b border-gray-100 bg-[#F3F4F6] px-4 py-2.5 text-xs uppercase text-[#6B7280] lg:grid ${COLUMNAS_LG}`}
            >
              <span>Nombre</span>
              <span>Categoría</span>
              <span>Triage</span>
              <span>Estado</span>
              <span>DNI</span>
            </div>
            {DEPORTISTAS_DEMO.map((d, i) => (
              <div
                key={d.id}
                className={`${i >= 4 ? 'hidden lg:grid' : 'grid'} grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-1 border-b border-gray-50 px-3 py-3 lg:px-4 lg:py-2.5 ${i === 0 ? 'lg:bg-[#3346CC]/5' : ''} ${COLUMNAS_LG}`}
              >
                <Avatar alt={d.nombre} iniciales={d.iniciales} className="row-span-2 size-9 text-xs lg:hidden" />
                <div data-demo-clave="tabla-principal" className="min-w-0 lg:flex lg:items-center lg:gap-2">
                  <Avatar alt={d.nombre} iniciales={d.iniciales} className="hidden size-8 text-xs lg:block" />
                  <p data-demo-clave="fila-nombre" className="truncate text-sm font-medium text-[#1C1C1C] lg:text-clip">
                    {d.nombre}
                  </p>
                  <p className="truncate text-xs text-[#6B7280] lg:hidden">{d.categoria}</p>
                </div>
                <span
                  data-demo-clave="tabla-principal"
                  className="hidden truncate text-sm text-[#1C1C1C] lg:block lg:text-clip"
                >
                  {d.categoria}
                </span>
                <div className="col-start-2 flex gap-1.5 lg:contents">
                  <span data-demo-clave="tabla-principal" className={`${BADGE} lg:order-1 ${ESTADO_BADGE[d.estado]}`}>
                    {ESTADO_LABELS[d.estado]}
                  </span>
                  <span data-demo-clave="tabla-principal" className={`${BADGE} ${NIVEL_TRIAGE_BADGE[d.triage]}`}>
                    {NIVEL_TRIAGE_LABELS[d.triage]}
                  </span>
                </div>
                <span
                  data-demo-clave="tabla-principal"
                  className="hidden font-mono tabular-nums text-xs text-[#6B7280] lg:order-2 lg:block"
                >
                  {d.dni}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative hidden min-w-0 flex-1 lg:block">
          <div data-demo-secundario>
            <TriageDemo columnas={2} />
          </div>

          <div
            data-demo-overlay="ficha-deportista"
            className="landing-popover absolute inset-x-3 top-[320px] z-10 rounded-xl border border-gray-100 bg-white p-4 shadow-xl shadow-[#121A61]/15"
          >
            <div className="flex items-center gap-3">
              <Avatar alt={primero.nombre} iniciales={primero.iniciales} className="size-11 text-sm" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-[#121A61]">{primero.nombre}</p>
                <p className="text-xs text-[#6B7280]">
                  {primero.disciplina} · {primero.categoria}
                </p>
              </div>
              <span className={`${BADGE} ${NIVEL_TRIAGE_BADGE[primero.triage]}`}>
                {NIVEL_TRIAGE_LABELS[primero.triage]}
              </span>
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-2">
              <div className="rounded-lg bg-[#F3F4F6] p-2">
                <dt className="text-[11px] text-[#6B7280]">Seguimientos</dt>
                <dd className="text-sm font-semibold text-[#1C1C1C]">
                  <span className="font-mono tabular-nums">{FICHA_DEMO.seguimientosAbiertos}</span> abiertos
                </dd>
              </div>
              <div className="rounded-lg bg-[#F3F4F6] p-2">
                <dt className="text-[11px] text-[#6B7280]">Presentismo del mes</dt>
                <dd className="font-mono tabular-nums text-sm font-semibold text-[#1C1C1C]">
                  {FICHA_DEMO.presentismoMes}
                </dd>
              </div>
              <div className="col-span-2 rounded-lg bg-[#F3F4F6] p-2">
                <dt className="text-[11px] text-[#6B7280]">Próximo turno</dt>
                <dd className="text-sm font-semibold text-[#1C1C1C]">{FICHA_DEMO.proximoTurno}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </MarcoVentanaDemo>
  );
}
