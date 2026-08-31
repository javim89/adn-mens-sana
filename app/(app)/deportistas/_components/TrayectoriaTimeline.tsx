'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { CustomSelect } from '@/app/components/ui/custom-select';
import type {
  PeriodoDivision,
  TrayectoriaEvento,
  TrayectoriaEventoTipo,
} from '@/lib/types/trayectoria';
import type { PrioridadSeguimiento, TipoSeguimiento } from '@/lib/types/seguimientos';
import {
  TRAYECTORIA_TIPO_META,
  getTrayectoriaTipoMeta,
} from '@/lib/utils/trayectoria-tipo';
import {
  getTipoSeguimientoMeta,
  PRIORIDAD_LABELS,
  PRIORIDAD_STYLES,
} from '@/lib/utils/seguimiento-tipo';
import GestionDivisionesModal from './GestionDivisionesModal';

interface Catalogo {
  id: string;
  nombre: string;
}

interface Props {
  deportistaId: string;
  periodos: PeriodoDivision[];
  eventos: TrayectoriaEvento[];
  disciplinas: Catalogo[];
  categorias: Catalogo[];
}

const TIPO_OPTIONS = [
  { value: '', label: 'Todos los tipos' },
  ...(Object.keys(TRAYECTORIA_TIPO_META) as TrayectoriaEventoTipo[]).map((tipo) => ({
    value: tipo,
    label: TRAYECTORIA_TIPO_META[tipo].label,
  })),
];

function formatDate(dateStr: string) {
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(dateStr + 'T00:00:00'));
}

interface Grupo {
  periodo: PeriodoDivision;
  eventos: TrayectoriaEvento[];
}

/**
 * Reparte los eventos entre los períodos: un evento va al período con
 * `desde <= fecha` y (`hasta` null o `fecha < hasta`). Los eventos con fecha
 * anterior al `desde` más temprano se asignan al período más antiguo.
 * Devuelve los grupos ordenados por `desde` descendente (actual primero).
 */
function agruparPorPeriodo(
  periodos: PeriodoDivision[],
  eventos: TrayectoriaEvento[],
): Grupo[] {
  if (periodos.length === 0) return [];

  const ordenAsc = [...periodos].sort((a, b) => a.desde.localeCompare(b.desde));
  const masAntiguo = ordenAsc[0];

  const buckets = new Map<string, TrayectoriaEvento[]>();
  ordenAsc.forEach((p) => buckets.set(p.id, []));

  for (const evento of eventos) {
    let asignado: PeriodoDivision | null = null;
    for (const periodo of ordenAsc) {
      const dentroInicio = periodo.desde <= evento.fecha;
      const dentroFin = periodo.hasta === null || evento.fecha < periodo.hasta;
      if (dentroInicio && dentroFin) {
        asignado = periodo;
        break;
      }
    }
    const destino = asignado ?? masAntiguo;
    buckets.get(destino.id)!.push(evento);
  }

  return ordenAsc
    .slice()
    .reverse()
    .map((periodo) => ({
      periodo,
      eventos: buckets
        .get(periodo.id)!
        .slice()
        .sort((a, b) => b.fecha.localeCompare(a.fecha)),
    }));
}

function periodoTitulo(p: PeriodoDivision) {
  const partes = [p.categoriaNombre, p.disciplinaNombre].filter(Boolean);
  return partes.length > 0 ? partes.join(' · ') : 'Sin división';
}

function periodoRango(p: PeriodoDivision) {
  const desde = formatDate(p.desde);
  const hasta = p.hasta ? formatDate(p.hasta) : 'Actual';
  return `${desde} – ${hasta}`;
}

function EventoCard({ evento }: { evento: TrayectoriaEvento }) {
  const esSeguimiento = evento.tipo === 'SEGUIMIENTO';
  const tipoSeguimiento = esSeguimiento
    ? ((evento.meta?.tipoSeguimiento as TipoSeguimiento | null) ?? null)
    : null;
  const prioridad = esSeguimiento
    ? ((evento.meta?.prioridad as PrioridadSeguimiento | undefined) ?? undefined)
    : undefined;

  const tipoMeta = getTrayectoriaTipoMeta(evento.tipo);
  const badge = esSeguimiento ? getTipoSeguimientoMeta(tipoSeguimiento).badge : tipoMeta.badge;
  const label = esSeguimiento ? getTipoSeguimientoMeta(tipoSeguimiento).label : tipoMeta.label;

  const inner = (
    <>
      <div className="flex flex-wrap items-center gap-2 mb-1">
        <span className="text-xs text-[#6B7280] whitespace-nowrap">
          {formatDate(evento.fecha)}
        </span>
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${badge}`}
        >
          {label}
        </span>
        {prioridad && (
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${PRIORIDAD_STYLES[prioridad] ?? 'bg-gray-100 text-gray-600'}`}
          >
            {PRIORIDAD_LABELS[prioridad] ?? prioridad}
          </span>
        )}
      </div>

      <p className="text-sm font-semibold text-[#1C1C1C]">{evento.titulo}</p>

      {evento.detalle && (
        <p className="text-sm text-[#6B7280] mt-1 line-clamp-3 whitespace-pre-wrap">
          {evento.detalle}
        </p>
      )}
    </>
  );

  if (evento.href) {
    return (
      <Link
        href={evento.href}
        className="block rounded-lg border border-gray-100 bg-white p-4 shadow-sm transition-colors hover:border-[#121A61]/30 hover:bg-[#F3F4F6]"
      >
        {inner}
      </Link>
    );
  }

  return (
    <div className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">{inner}</div>
  );
}

export default function TrayectoriaTimeline({
  deportistaId,
  periodos,
  eventos,
  disciplinas,
  categorias,
}: Props) {
  const [tipoFiltro, setTipoFiltro] = useState('');

  const grupos = useMemo(() => {
    const filtrados = tipoFiltro
      ? eventos.filter((e) => e.tipo === tipoFiltro)
      : eventos;
    return agruparPorPeriodo(periodos, filtrados);
  }, [periodos, eventos, tipoFiltro]);

  const sinEventos = eventos.length === 0;
  const hayFiltros = tipoFiltro !== '';
  const totalVisibles = grupos.reduce((acc, g) => acc + g.eventos.length, 0);

  return (
    <div>
      {/* Cabecera */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <CustomSelect
          id="filtro-tipo-trayectoria"
          value={tipoFiltro}
          onChange={setTipoFiltro}
          options={TIPO_OPTIONS}
          placeholder="Todos los tipos"
          className="min-w-[180px] flex-1 sm:flex-none"
        />
        <GestionDivisionesModal
          deportistaId={deportistaId}
          periodos={periodos}
          disciplinas={disciplinas}
          categorias={categorias}
        />
      </div>

      {sinEventos ? (
        <p className="text-sm text-[#6B7280] py-12 text-center">
          Este deportista no tiene eventos en su trayectoria.
        </p>
      ) : totalVisibles === 0 ? (
        <p className="text-sm text-[#6B7280] py-12 text-center">
          No hay eventos que coincidan con los filtros.
          {hayFiltros && (
            <button
              type="button"
              onClick={() => setTipoFiltro('')}
              className="block mx-auto mt-2 text-[#121A61] underline hover:no-underline"
            >
              Limpiar filtros
            </button>
          )}
        </p>
      ) : (
        <div className="space-y-8">
          {grupos.map((grupo) => (
            <section key={grupo.periodo.id}>
              <div className="mb-3">
                <h3
                  className="text-base font-bold text-[#121A61]"
                  style={{ fontFamily: 'Oswald, sans-serif' }}
                >
                  {periodoTitulo(grupo.periodo)}
                </h3>
                <p className="text-xs text-[#6B7280]">{periodoRango(grupo.periodo)}</p>
              </div>

              {grupo.eventos.length === 0 ? (
                <p className="text-sm text-[#6B7280] pl-2">
                  Sin eventos en este período.
                </p>
              ) : (
                <ol className="relative ml-2">
                  <span
                    aria-hidden
                    className="absolute left-[5px] top-2 bottom-2 w-px bg-gray-200"
                  />

                  {grupo.eventos.map((evento) => {
                    const esSeguimiento = evento.tipo === 'SEGUIMIENTO';
                    const dot = esSeguimiento
                      ? getTipoSeguimientoMeta(
                          (evento.meta?.tipoSeguimiento as TipoSeguimiento | null) ?? null,
                        ).dot
                      : getTrayectoriaTipoMeta(evento.tipo).dot;
                    return (
                      <li key={evento.id} className="relative pl-8 pb-6 last:pb-0">
                        <span
                          aria-hidden
                          className={`absolute left-0 top-1.5 h-2.5 w-2.5 rounded-full ring-4 ring-white ${dot}`}
                        />
                        <EventoCard evento={evento} />
                      </li>
                    );
                  })}
                </ol>
              )}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
