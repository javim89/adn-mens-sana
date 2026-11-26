import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { ESTADO_EVENTO_LABELS, TIPO_DIA_LABELS } from '@/lib/utils/enum-labels';
import TileFecha from '../../(app)/dashboard/_components/TileFecha';
import {
  CALENDARIO_ANIO_DEMO,
  CALENDARIO_MES_DEMO,
  PROXIMOS_PARTIDOS_DEMO,
  type TipoDiaDemo,
} from '../datos-demo';
import { ESTADO_EVENTO_BADGE } from './convocatorias';
import { BADGE, FiltroDemo, PanelDemo, Pantalla, RotuloDemo } from './comun';

/** Los colores de día del calendario (los mismos tonos que las `--cal-*` de la app). */
const DIA: Record<TipoDiaDemo, { fondo: string; texto: string; punto: string }> = {
  TORNEO: { fondo: 'bg-green-100', texto: 'text-green-700', punto: 'bg-green-500' },
  RECESO: { fondo: 'bg-yellow-100', texto: 'text-yellow-700', punto: 'bg-yellow-400' },
  RECUPERO: { fondo: 'bg-gray-200', texto: 'text-gray-600', punto: 'bg-gray-400' },
  SIN_ACTIVIDAD: { fondo: 'bg-red-100', texto: 'text-red-700', punto: 'bg-red-400' },
};

const SEMANA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const TIPOS: TipoDiaDemo[] = ['TORNEO', 'RECESO', 'RECUPERO', 'SIN_ACTIVIDAD'];

function Leyenda() {
  return (
    <ul className="flex flex-wrap gap-x-3 gap-y-1">
      {TIPOS.map((t) => (
        <li key={t} className="flex items-center gap-1.5 text-xs text-[#6B7280]">
          <span className={`size-2.5 rounded-sm ${DIA[t].punto}`} />
          {TIPO_DIA_LABELS[t]}
        </li>
      ))}
    </ul>
  );
}

function BarraCalendario({ titulo, vista }: { titulo: string; vista: 'Mes' | 'Año' }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        <span className="flex size-7 items-center justify-center rounded-md bg-[#121A61] text-white">
          <ChevronLeft className="size-4" aria-hidden />
        </span>
        <span className="flex size-7 items-center justify-center rounded-md bg-[#121A61] text-white">
          <ChevronRight className="size-4" aria-hidden />
        </span>
        <p className="font-[family-name:var(--font-oswald)] text-lg font-semibold text-[#121A61] @md:text-xl">{titulo}</p>
      </div>
      <div className="flex items-center gap-2">
        <span className="hidden @lg:contents">
          <FiltroDemo>
            Todas las categorías
            <ChevronDown className="size-3.5" aria-hidden />
          </FiltroDemo>
        </span>
        <span className="flex overflow-hidden rounded-lg border border-gray-200 text-xs font-medium">
          {(['Mes', 'Año'] as const).map((v) => (
            <span
              key={v}
              className={`px-2.5 py-1.5 ${v === vista ? 'border-b-2 border-[#C9A84C] bg-[#121A61] text-white' : 'bg-white text-[#1C1C1C]'}`}
            >
              {v}
            </span>
          ))}
        </span>
      </div>
    </div>
  );
}

/** La vista mensual: días de torneo, receso, recupero y sin actividad, con los partidos de cada categoría. */
export function PantallaCalendarioMes() {
  const m = CALENDARIO_MES_DEMO;
  const celdas = [
    ...Array.from({ length: m.offset }, () => null),
    ...Array.from({ length: m.dias }, (_, i) => i + 1),
  ];
  return (
    <Pantalla clave="calendario-mes" activo="/calendario">
      <BarraCalendario titulo={m.titulo} vista="Mes" />
      <div className="mt-3">
        <Leyenda />
      </div>

      <PanelDemo className="mt-3 overflow-hidden">
        <div className="grid grid-cols-7 border-b border-gray-100 bg-[#F3F4F6]">
          {SEMANA.map((d) => (
            <span key={d} className="py-1.5 text-center text-[11px] font-semibold uppercase text-[#6B7280] @md:text-xs">
              {d}
            </span>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {celdas.map((dia, i) => {
            if (dia === null) return <span key={`v${i}`} className="min-h-10 border-r border-b border-gray-100 bg-[#F9FAFB] @2xl:min-h-20" />;
            const tipo = m.tipos[dia];
            const partidos = m.partidos[dia] ?? [];
            return (
              <div
                key={dia}
                className={`flex min-h-10 min-w-0 flex-col gap-0.5 border-r border-b border-gray-100 p-0.5 @md:p-1 @2xl:min-h-20 ${tipo ? DIA[tipo].fondo : 'bg-white'}`}
              >
                <span
                  className={`self-end px-1 text-[11px] font-medium tabular-nums @md:text-xs ${dia === m.hoy ? 'rounded-full bg-[#3346CC] text-white' : tipo ? DIA[tipo].texto : 'text-[#1C1C1C]'}`}
                >
                  {dia}
                </span>
                {/* En angosto, un punto por partido; desde `@2xl`, el chip con categoría y rival. */}
                {partidos.length > 0 && (
                  <span className="flex justify-center gap-0.5 @2xl:hidden">
                    {partidos.map((p) => (
                      <span key={p.rival} className="size-1.5 rounded-full bg-[#121A61]" />
                    ))}
                  </span>
                )}
                {partidos.map((p) => (
                  <span
                    key={p.rival}
                    className={`hidden truncate rounded border-l-2 border-[#C9A84C] px-1 py-0.5 text-[11px] leading-tight @2xl:block ${p.estado === 'SUSPENDIDO' ? 'bg-gray-400 text-white line-through' : 'bg-[#121A61] text-white'}`}
                  >
                    {p.categoria} · {p.rival}
                  </span>
                ))}
              </div>
            );
          })}
        </div>
      </PanelDemo>
    </Pantalla>
  );
}

/** La vista anual resumida (cuatro meses con los días marcados) y los próximos partidos. */
export function PantallaCalendarioAgenda() {
  return (
    <Pantalla clave="calendario-agenda" activo="/calendario">
      <BarraCalendario titulo="Temporada 2026" vista="Año" />
      <div className="mt-3">
        <Leyenda />
      </div>

      <div className="mt-4 grid items-start gap-4 @3xl:grid-cols-[minmax(0,1fr)_minmax(0,300px)]">
        <div className="grid grid-cols-2 gap-3 @lg:gap-4">
          {CALENDARIO_ANIO_DEMO.map((mes) => (
            <PanelDemo key={mes.mes} className="p-2.5 @md:p-3">
              <p className="text-xs font-semibold text-[#121A61] @md:text-sm">{mes.mes}</p>
              <div className="mt-2 grid grid-cols-7 gap-0.5">
                {Array.from({ length: mes.offset }, (_, i) => (
                  <span key={`v${i}`} />
                ))}
                {Array.from({ length: mes.dias }, (_, i) => {
                  const tipo = mes.tipos[i + 1];
                  return (
                    <span
                      key={i}
                      className={`flex aspect-square items-center justify-center rounded-sm text-[9px] tabular-nums @md:text-[10px] ${tipo ? `${DIA[tipo].fondo} ${DIA[tipo].texto} font-semibold` : 'text-[#6B7280]'}`}
                    >
                      {i + 1}
                    </span>
                  );
                })}
              </div>
            </PanelDemo>
          ))}
        </div>

        <PanelDemo className="p-4">
          <RotuloDemo>Próximos partidos</RotuloDemo>
          <ul className="mt-3 space-y-2">
            {PROXIMOS_PARTIDOS_DEMO.map((p, i) => (
              <li key={p.id} className={`${i >= 3 ? 'hidden @3xl:flex' : 'flex'} min-w-0 items-center gap-3 rounded-lg bg-gray-50 p-2`}>
                <TileFecha arriba={p.dia} abajo={p.hora} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-[#1C1C1C]">{p.categoria}</p>
                  <p className="truncate text-xs text-[#6B7280]">{p.partido}</p>
                  {p.estado !== 'PROGRAMADO' && (
                    <span className={`${BADGE} mt-1 ${ESTADO_EVENTO_BADGE[p.estado]}`}>{ESTADO_EVENTO_LABELS[p.estado]}</span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </PanelDemo>
      </div>
    </Pantalla>
  );
}
