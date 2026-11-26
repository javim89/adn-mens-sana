import { CheckCheck, ChevronDown, MessageSquare, Search } from 'lucide-react';
import { ESTADO_ASISTENCIA_LABELS, ESTADO_ASISTENCIA_STYLES } from '@/lib/utils/asistencia';
import type { EstadoAsistencia } from '@/lib/types/presentismo';
import { Avatar } from '@/app/components/ui/avatar';
import BarrasCategoria from '../../(app)/dashboard/_components/BarrasCategoria';
import { CardSeccion } from '../../(app)/dashboard/_components/EstadoVacio';
import { ACENTOS } from '../../(app)/dashboard/_lib/acentos';
import { PresentismoKpiDemo, PresentismoPorDiaDemo } from '../CardsDemo';
import { AUSENCIAS_REITERADAS_DEMO, PRESENTISMO_POR_CATEGORIA, TOMA_ASISTENCIA_DEMO } from '../datos-demo';
import { BADGE, BotonDemo, EncabezadoPantalla, PanelDemo, Pantalla } from './comun';

const ESTADOS: EstadoAsistencia[] = ['PRESENTE', 'AUSENTE', 'LLEGO_TARDE', 'SE_RETIRO_ANTES'];

/** Etiqueta corta para el selector en angosto. */
const CORTO: Record<EstadoAsistencia, string> = {
  PRESENTE: 'P',
  AUSENTE: 'A',
  LLEGO_TARDE: 'T',
  SE_RETIRO_ANTES: 'R',
};

/** La toma de asistencia: el plantel de la categoría con los cuatro estados por deportista. */
export function PantallaPresentismoToma() {
  const t = TOMA_ASISTENCIA_DEMO;
  return (
    <Pantalla clave="presentismo-toma" activo="/presentismo">
      <EncabezadoPantalla titulo="Entrenamiento" bajada={`${t.fecha} · ${t.categoria} · ${t.tipoSesion}`} />
      <p className="mt-2 hidden text-xs text-[#6B7280] @md:block">
        <span className="font-medium text-[#1C1C1C]">Objetivo:</span> {t.objetivo}
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <BotonDemo variante="secundario">
          <CheckCheck className="size-3.5 text-green-700" aria-hidden />
          Marcar todos presentes
        </BotonDemo>
        <span className="relative hidden h-8 w-48 items-center rounded-lg border border-gray-200 bg-white pl-8 text-xs text-[#6B7280] @lg:flex">
          <Search className="absolute left-2.5 size-3.5" aria-hidden />
          Buscar deportista…
        </span>
      </div>

      <PanelDemo className="mt-4">
        <ul className="divide-y divide-gray-100">
          {t.deportistas.map((d, i) => (
            <li
              key={d.id}
              className={`${i >= 5 ? 'hidden @2xl:flex' : 'flex'} flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2.5 @md:px-4`}
            >
              <Avatar alt={d.nombre} iniciales={d.iniciales} className="size-8 text-xs" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-[#1C1C1C]">{d.nombre}</p>
                {d.nota && (
                  <p className="flex items-center gap-1 truncate text-xs text-[#6B7280]">
                    <MessageSquare className="size-3 shrink-0" aria-hidden />
                    <span className="truncate">{d.nota}</span>
                  </p>
                )}
              </div>
              {/* El control segmentado: letra en angosto, nombre completo desde `@2xl`. */}
              <div className="flex shrink-0 gap-1">
                {ESTADOS.map((e) => (
                  <span
                    key={e}
                    className={`inline-flex h-7 min-w-7 items-center justify-center rounded-md px-1.5 text-xs font-semibold @2xl:px-2.5 ${d.estado === e ? ESTADO_ASISTENCIA_STYLES[e] : 'border border-gray-200 text-[#6B7280]'}`}
                  >
                    <span className="@2xl:hidden">{CORTO[e]}</span>
                    <span className="hidden @2xl:inline">{ESTADO_ASISTENCIA_LABELS[e]}</span>
                  </span>
                ))}
              </div>
            </li>
          ))}
        </ul>
      </PanelDemo>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-[#6B7280]">
          <span className="font-mono font-semibold tabular-nums text-[#1C1C1C]">1</span> ausente de{' '}
          <span className="font-mono font-semibold tabular-nums text-[#1C1C1C]">6</span> en la lista
        </p>
        <BotonDemo>Guardar asistencia</BotonDemo>
      </div>
    </Pantalla>
  );
}

/** El presentismo de la semana: KPI y por día (cards reales), por categoría y las ausencias reiteradas. */
export function PantallaPresentismoEstadisticas() {
  return (
    <Pantalla clave="presentismo-estadisticas" activo="/presentismo">
      <EncabezadoPantalla titulo="Presentismo" bajada="Semana del 9 al 15/11" accion="Nuevo entrenamiento" />
      <div className="mt-4 grid items-start gap-4 @2xl:grid-cols-2 @5xl:grid-cols-3">
        <PresentismoKpiDemo />
        <div className="hidden min-w-0 @2xl:block">
          <PresentismoPorDiaDemo />
        </div>
        <div className="hidden min-w-0 @5xl:block">
          <CardSeccion tituloComo="p" titulo="Por categoría" descripcion="Esta semana, en % de asistencia." modulo="presentismo">
            <div className="mt-4">
              <BarrasCategoria
                categorias={PRESENTISMO_POR_CATEGORIA}
                barraFuerte={ACENTOS.presentismo.barraFuerte}
                barraSuave={ACENTOS.presentismo.barraSuave}
                formatear={(v) => `${v}%`}
              />
            </div>
          </CardSeccion>
        </div>
        <div className="min-w-0 rounded-2xl border border-amber-200 bg-amber-50 p-4 @2xl:col-span-2 @5xl:col-span-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-900">Dos o más ausencias esta semana</p>
            <span className={`${BADGE} bg-amber-100 text-amber-900`}>Revisar</span>
          </div>
          <ul className="mt-3 grid gap-2 @2xl:grid-cols-3">
            {AUSENCIAS_REITERADAS_DEMO.map((a) => (
              <li key={a.id} className="flex min-w-0 items-center gap-3 rounded-lg bg-white p-2">
                <Avatar alt={a.nombre} iniciales={a.iniciales} className="size-8 text-xs" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-[#1C1C1C]">{a.nombre}</p>
                  <p className="truncate text-xs text-[#6B7280]">{a.categoria}</p>
                </div>
                <span className="shrink-0 font-mono text-sm font-semibold tabular-nums text-amber-800">{a.ausencias}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <p className="mt-3 hidden items-center gap-1 text-xs text-[#6B7280] @md:flex">
        Filtrar por
        <span className="inline-flex items-center gap-1 font-medium text-[#1C1C1C]">
          disciplina y categoría <ChevronDown className="size-3" aria-hidden />
        </span>
      </p>
    </Pantalla>
  );
}
