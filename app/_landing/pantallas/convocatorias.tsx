import { ArrowLeft, ChevronDown, Pencil } from 'lucide-react';
import { ESTADO_BADGE, ESTADO_EVENTO_LABELS, ESTADO_LABELS } from '@/lib/utils/enum-labels';
import type { EstadoEvento } from '@/lib/generated/prisma/enums';
import { Avatar } from '@/app/components/ui/avatar';
import TileFecha from '../../(app)/dashboard/_components/TileFecha';
import { CONVOCATORIA_DEMO, CONVOCATORIA_DETALLE_EXTRA, CONVOCATORIAS_LISTA_DEMO } from '../datos-demo';
import { BADGE, BotonDemo, EncabezadoPantalla, FiltroDemo, PanelDemo, Pantalla, RotuloDemo } from './comun';

/** El estado del partido (programado / suspendido / reprogramado). */
export const ESTADO_EVENTO_BADGE: Record<EstadoEvento, string> = {
  PROGRAMADO: 'bg-[#3346CC] text-white',
  SUSPENDIDO: 'bg-red-100 text-red-700',
  REPROGRAMADO: 'bg-amber-100 text-amber-800',
};

const COLUMNAS = '@2xl:grid-cols-[96px_minmax(0,1fr)_minmax(0,120px)_88px]';

/** El listado de convocatorias por partido: cards en angosto, tabla desde `@2xl`. */
export function PantallaConvocatoriasLista() {
  return (
    <Pantalla clave="convocatorias-lista" activo="/convocatorias">
      <EncabezadoPantalla titulo="Convocatorias" accion="Nueva convocatoria" />
      <div className="mt-3 flex flex-wrap gap-2">
        <FiltroDemo>
          Todas las disciplinas
          <ChevronDown className="size-3.5" aria-hidden />
        </FiltroDemo>
        <span className="hidden @md:contents">
          <FiltroDemo>
            Todas las categorías
            <ChevronDown className="size-3.5" aria-hidden />
          </FiltroDemo>
        </span>
      </div>

      <PanelDemo className="mt-4 overflow-hidden">
        <div
          className={`hidden gap-x-3 border-b border-gray-100 bg-[#F3F4F6] px-4 py-2.5 text-xs uppercase text-[#6B7280] @2xl:grid ${COLUMNAS}`}
        >
          <span>Fecha</span>
          <span>Partido</span>
          <span>Categoría</span>
          <span>Convocados</span>
        </div>
        {CONVOCATORIAS_LISTA_DEMO.map((c, i) => (
          <div
            key={c.id}
            className={`${i >= 4 ? 'hidden @2xl:grid' : 'grid'} grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-1 border-b border-gray-50 px-3 py-3 last:border-0 @2xl:px-4 @2xl:py-2.5 ${COLUMNAS}`}
          >
            <div className="row-span-2 @2xl:row-span-1">
              <TileFecha arriba={c.dia} abajo={c.hora} />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-[#1C1C1C]">vs. {c.rival}</p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                <span className="rounded-full bg-[#121A61]/5 px-2 py-0.5 text-xs text-[#121A61]">{c.condicion}</span>
                <span className={`${BADGE} ${ESTADO_EVENTO_BADGE[c.estado]}`}>{ESTADO_EVENTO_LABELS[c.estado]}</span>
              </div>
            </div>
            <p className="truncate text-xs text-[#6B7280] @2xl:text-sm @2xl:text-[#1C1C1C]">
              Fútbol · {c.categoria}
              <span className="@2xl:hidden"> · {c.convocados} convocados</span>
            </p>
            <p className="hidden font-mono text-sm font-semibold tabular-nums text-[#121A61] @2xl:block">{c.convocados}</p>
          </div>
        ))}
      </PanelDemo>
    </Pantalla>
  );
}

/** El detalle de una convocatoria: partido, citación, entrenador, observaciones y convocados con su estado. */
export function PantallaConvocatoriaDetalle() {
  const c = CONVOCATORIA_DEMO;
  const x = CONVOCATORIA_DETALLE_EXTRA;
  return (
    <Pantalla clave="convocatoria-detalle" activo="/convocatorias">
      <p className="flex items-center gap-1 text-xs text-[#6B7280]">
        <ArrowLeft className="size-3.5" aria-hidden />
        Convocatorias
      </p>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <p className="min-w-0 font-[family-name:var(--font-oswald)] text-lg font-bold text-[#121A61] @md:text-2xl">{c.rival}</p>
          <span className={`${BADGE} ${ESTADO_EVENTO_BADGE.PROGRAMADO}`}>{ESTADO_EVENTO_LABELS.PROGRAMADO}</span>
        </div>
        <span className="hidden @lg:contents">
          <BotonDemo variante="secundario">
            <Pencil className="size-3.5" aria-hidden />
            Editar
          </BotonDemo>
        </span>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
        <span className="rounded-full bg-[#F3F4F6] px-2 py-0.5 text-[#1C1C1C]">{c.disciplina}</span>
        <span className="rounded-full bg-[#F3F4F6] px-2 py-0.5 text-[#1C1C1C]">{c.categoria}</span>
        <span className="rounded-full bg-[#121A61]/5 px-2 py-0.5 text-[#121A61]">{c.condicion}</span>
      </div>

      <div className="mt-4 grid gap-4 @3xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1fr)]">
        <PanelDemo className="flex flex-col gap-4 p-4">
          <div className="flex items-center gap-4">
            <TileFecha arriba={c.dia} abajo={c.hora} tamano="grande" />
            <dl className="grid min-w-0 gap-2">
              <div className="min-w-0">
                <dt className="text-xs font-medium text-[#6B7280]">Hora de citación</dt>
                <dd className="text-sm text-[#1C1C1C]">{c.horaCitacion}</dd>
              </div>
              <div className="min-w-0">
                <dt className="text-xs font-medium text-[#6B7280]">Lugar</dt>
                <dd className="text-sm text-[#1C1C1C]">{c.lugar}</dd>
              </div>
            </dl>
          </div>
          <dl className="grid gap-2 border-t border-gray-100 pt-3">
            <div className="min-w-0">
              <dt className="text-xs font-medium text-[#6B7280]">Entrenador a cargo</dt>
              <dd className="text-sm text-[#1C1C1C]">{x.entrenador}</dd>
            </div>
            <div className="hidden min-w-0 @md:block">
              <dt className="text-xs font-medium text-[#6B7280]">Observaciones</dt>
              <dd className="text-sm text-[#1C1C1C]">{x.observaciones}</dd>
            </div>
          </dl>
        </PanelDemo>

        <PanelDemo className="px-4 py-3">
          <RotuloDemo>Convocados ({c.totalCitados})</RotuloDemo>
          <ul className="mt-1 divide-y divide-gray-100">
            {c.citados.map((p, i) => {
              const estado = x.estados[p.id] ?? 'ACTIVO';
              return (
                <li key={p.id} className={`${i >= 4 ? 'hidden @3xl:flex' : 'flex'} items-center gap-3 py-2.5`}>
                  <Avatar alt={p.nombre} iniciales={p.iniciales} className="size-8 text-xs" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-[#1C1C1C]">{p.nombre}</p>
                    <p className="truncate text-xs text-[#6B7280]">{p.posicion}</p>
                  </div>
                  <span className={`${BADGE} ${ESTADO_BADGE[estado]}`}>{ESTADO_LABELS[estado]}</span>
                </li>
              );
            })}
          </ul>
        </PanelDemo>
      </div>
    </Pantalla>
  );
}
