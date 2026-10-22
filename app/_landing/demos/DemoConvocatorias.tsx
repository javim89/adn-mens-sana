import { ArrowLeft, CircleCheck } from 'lucide-react';
import { ESTADO_EVENTO_LABELS } from '@/lib/utils/enum-labels';
import { Avatar } from '@/app/components/ui/avatar';
import TileFecha from '../../(app)/dashboard/_components/TileFecha';
import { CONVOCATORIA_DEMO } from '../datos-demo';
import MarcoVentanaDemo from '../MarcoVentanaDemo';

/**
 * El detalle de una convocatoria con sus citados y el toast de confirmación. Decorativa.
 *
 * En lg+ (lienzo de `EscenarioDemo`): encabezado y citados a la izquierda, el resumen a
 * la derecha y el toast flotando abajo, sobre el resumen.
 */
export default function DemoConvocatorias() {
  const c = CONVOCATORIA_DEMO;
  return (
    <MarcoVentanaDemo
      activo="/convocatorias"
      variante="funcionalidad"
      className="relative w-full lg:h-full"
    >
      <div className="lg:flex lg:h-full lg:gap-6">
        <div className="w-full min-w-0 lg:w-[640px] lg:shrink-0">
          <p className="hidden items-center gap-1 text-xs text-[#6B7280] lg:flex">
            <ArrowLeft className="size-3.5" aria-hidden />
            Convocatorias
          </p>
          <div className="flex flex-wrap items-center gap-2 lg:mt-2">
            <p data-demo-clave="titulo" className="min-w-0 font-[family-name:var(--font-oswald)] text-xl font-bold text-[#121A61] lg:text-2xl">
              {c.rival}
            </p>
            <span className="inline-flex shrink-0 items-center rounded-full bg-[#3346CC] px-2 py-0.5 text-xs font-medium text-white">
              {ESTADO_EVENTO_LABELS.PROGRAMADO}
            </span>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
            <span className="rounded-full bg-[#F3F4F6] px-2 py-0.5 text-[#1C1C1C]">{c.disciplina}</span>
            <span className="rounded-full bg-[#F3F4F6] px-2 py-0.5 text-[#1C1C1C]">{c.categoria}</span>
            <span className="rounded-full bg-[#121A61]/5 px-2 py-0.5 text-[#121A61]">{c.condicion}</span>
          </div>

          <div
            data-demo-clave="encabezado"
            className="mt-4 flex items-center gap-4 rounded-xl border border-gray-100 bg-white p-4 shadow-sm"
          >
            <TileFecha arriba={c.dia} abajo={c.hora} tamano="grande" />
            <dl className="grid min-w-0 gap-2 sm:grid-cols-2 sm:gap-4">
              <div className="min-w-0">
                <dt className="text-xs font-medium text-[#6B7280]">Hora de citación</dt>
                <dd className="text-sm text-[#1C1C1C]">{c.horaCitacion}</dd>
              </div>
              <div className="min-w-0">
                <dt className="text-xs font-medium text-[#6B7280]">Lugar</dt>
                <dd data-demo-clave="lugar" className="text-sm text-[#1C1C1C]">
                  {c.lugar}
                </dd>
              </div>
            </dl>
          </div>

          <div
            data-demo-clave="citados"
            className="mt-4 rounded-xl border border-gray-100 bg-white px-4 py-3 shadow-sm"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-[#6B7280]">
              Citados ({c.totalCitados})
            </p>
            <ul className="mt-1 divide-y divide-gray-100">
              {c.citados.map((p, i) => (
                <li
                  key={p.id}
                  className={`${i >= 3 ? 'hidden lg:flex' : 'flex'} items-center gap-3 py-2.5`}
                >
                  <Avatar alt={p.nombre} iniciales={p.iniciales} className="size-8 text-xs" />
                  <span
                    data-demo-clave="fila-nombre"
                    className="min-w-0 flex-1 truncate text-sm font-medium text-[#1C1C1C] lg:text-clip"
                  >
                    {p.nombre}
                  </span>
                  <span className="text-xs text-[#6B7280]">{p.posicion}</span>
                  <CircleCheck className="size-4 shrink-0 text-green-600" aria-hidden />
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="relative hidden min-w-0 flex-1 lg:block">
          <div data-demo-secundario className="h-full rounded-xl border border-gray-100 bg-[#F9FAFB] p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#6B7280]">Resumen</p>
            <dl className="mt-3 grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-white p-3 shadow-sm">
                <dt className="text-xs text-[#6B7280]">Confirmados</dt>
                <dd className="font-mono text-2xl font-semibold tabular-nums text-green-700">{c.confirmados}</dd>
              </div>
              <div className="rounded-lg bg-white p-3 shadow-sm">
                <dt className="text-xs text-[#6B7280]">Pendientes</dt>
                <dd className="font-mono text-2xl font-semibold tabular-nums text-amber-700">{c.pendientes}</dd>
              </div>
            </dl>
            <p className="mt-4 text-xs text-[#6B7280]">
              {c.disciplina} · {c.categoria}
            </p>
            <ul className="mt-2 space-y-2 text-sm text-[#1C1C1C]">
              {c.porPosicion.map((p) => (
                <li key={p.label} className="flex items-center justify-between">
                  {p.label}
                  <span className="font-mono font-semibold tabular-nums text-[#121A61]">{p.cantidad}</span>
                </li>
              ))}
            </ul>
          </div>

          <div
            data-demo-overlay="toast-convocatoria"
            className="landing-popover absolute inset-x-3 bottom-6 z-10 flex items-center gap-2.5 rounded-lg border border-gray-100 bg-white px-4 py-3 shadow-xl shadow-[#121A61]/15"
          >
            <CircleCheck className="size-4 shrink-0 text-green-600" aria-hidden />
            <p className="text-sm font-medium text-[#1C1C1C]">Convocatoria enviada a {c.totalCitados} deportistas</p>
          </div>
        </div>
      </div>
    </MarcoVentanaDemo>
  );
}
