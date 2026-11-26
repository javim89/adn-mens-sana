import { ChevronDown, MapPin, Users } from 'lucide-react';
import TileFecha from '../../(app)/dashboard/_components/TileFecha';
import { ACENTOS } from '../../(app)/dashboard/_lib/acentos';
import { TurnosDemo } from '../CardsDemo';
import { AGENDA_TURNOS_DEMO, type TurnoAgendaDemo } from '../datos-demo';
import { EncabezadoPantalla, FiltroDemo, PanelDemo, Pantalla } from './comun';

const COLUMNAS = '@2xl:grid-cols-[96px_minmax(0,1fr)_minmax(0,140px)_minmax(0,150px)]';

/** Una fila de la agenda: card en angosto, fila de tabla desde `@2xl`. */
function FilaTurno({ t, oculta }: { t: TurnoAgendaDemo; oculta?: boolean }) {
  return (
    <div
      className={`${oculta ? 'hidden @2xl:grid' : 'grid'} grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-1 border-b border-gray-50 px-3 py-3 last:border-0 @2xl:px-4 @2xl:py-2.5 ${COLUMNAS}`}
    >
      <div className="row-span-2 @2xl:row-span-1">
        <TileFecha arriba={t.dia} abajo={t.hora} fondo={ACENTOS.turnos.tileFecha} />
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-[#1C1C1C]">{t.titulo}</p>
        <p className="truncate text-xs text-[#6B7280]">{t.profesional}</p>
      </div>
      <p className="flex min-w-0 items-center gap-1 text-xs text-[#6B7280] @2xl:text-sm @2xl:text-[#1C1C1C]">
        <MapPin className="size-3.5 shrink-0 @2xl:hidden" aria-hidden />
        <span className="truncate">{t.lugar}</span>
        <span className="truncate @2xl:hidden">· {t.deportistas}</span>
      </p>
      <p className="hidden min-w-0 items-center gap-1.5 text-sm text-[#1C1C1C] @2xl:flex">
        <Users className="size-3.5 shrink-0 text-[#6B7280]" aria-hidden />
        <span className="truncate">{t.deportistas}</span>
      </p>
    </div>
  );
}

/** La agenda de la semana, con la card real de próximos turnos al costado en ancho. */
export function PantallaTurnosAgenda() {
  return (
    <Pantalla clave="turnos-agenda" activo="/turnos">
      <EncabezadoPantalla titulo="Turnos" bajada="Semana del 9 al 15/11" accion="Nuevo turno" />
      <div className="mt-4 grid items-start gap-4 @4xl:grid-cols-[minmax(0,1fr)_280px]">
        <PanelDemo className="overflow-hidden">
          <div
            className={`hidden gap-x-3 border-b border-gray-100 bg-[#F3F4F6] px-4 py-2.5 text-xs uppercase text-[#6B7280] @2xl:grid ${COLUMNAS}`}
          >
            <span>Fecha</span>
            <span>Turno</span>
            <span>Lugar</span>
            <span>Deportista/s</span>
          </div>
          {AGENDA_TURNOS_DEMO.map((t, i) => (
            <FilaTurno key={t.id} t={t} oculta={i >= 4} />
          ))}
        </PanelDemo>
        <div className="hidden min-w-0 @4xl:block">
          <TurnosDemo />
        </div>
      </div>
    </Pantalla>
  );
}

/** La agenda filtrada por profesional: un grupo por profesional con su área y sus turnos. */
export function PantallaTurnosPorProfesional() {
  const grupos = Object.values(
    AGENDA_TURNOS_DEMO.reduce<Record<string, { profesional: string; area: string; turnos: TurnoAgendaDemo[] }>>(
      (acc, t) => {
        acc[t.profesional] ??= { profesional: t.profesional, area: t.area, turnos: [] };
        acc[t.profesional].turnos.push(t);
        return acc;
      },
      {},
    ),
  );
  return (
    <Pantalla clave="turnos-por-profesional" activo="/turnos">
      <EncabezadoPantalla titulo="Turnos" bajada="Agenda por profesional" />
      <div className="mt-3 flex flex-wrap gap-2">
        <FiltroDemo activo>
          Profesional: todos
          <ChevronDown className="size-3.5" aria-hidden />
        </FiltroDemo>
        <span className="hidden @md:contents">
          <FiltroDemo>
            Esta semana
            <ChevronDown className="size-3.5" aria-hidden />
          </FiltroDemo>
        </span>
      </div>
      <div className="mt-4 grid gap-3 @2xl:grid-cols-2">
        {grupos.map((g, i) => (
          <PanelDemo key={g.profesional} className={`${i >= 2 ? 'hidden @2xl:block' : ''} p-4`}>
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[#121A61]">{g.profesional}</p>
                <p className="text-xs text-[#6B7280]">{g.area}</p>
              </div>
              <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                {g.turnos.length} {g.turnos.length === 1 ? 'turno' : 'turnos'}
              </span>
            </div>
            <ul className="mt-3 space-y-2">
              {g.turnos.map((t) => (
                <li key={t.id} className="flex min-w-0 items-center gap-3 rounded-lg bg-gray-50 p-2">
                  <TileFecha arriba={t.dia} abajo={t.hora} fondo={ACENTOS.turnos.tileFecha} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-[#1C1C1C]">{t.deportistas}</p>
                    <p className="truncate text-xs text-[#6B7280]">
                      {t.titulo} · {t.lugar}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </PanelDemo>
        ))}
      </div>
    </Pantalla>
  );
}
