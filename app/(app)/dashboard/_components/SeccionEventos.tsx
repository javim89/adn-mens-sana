import { getProximosEventos, type EventoProximo } from '@/lib/queries/dashboard';
import { ESTADO_EVENTO_LABELS } from '@/lib/utils/enum-labels';
import type { EstadoEvento } from '@/lib/generated/prisma/enums';
import EstadoVacio, { CardSeccion } from './EstadoVacio';
import TileFecha from './TileFecha';
import LinkPie from './LinkPie';
import { diaCortoDb, diaYMesCortoDb } from '../_lib/formato';

/** Las píldoras de un evento: estado no programado y "sin convocatoria". */
function Etiquetas({ evento, sobreOscuro }: { evento: EventoProximo; sobreOscuro: boolean }) {
  const noProgramado = evento.estado !== 'PROGRAMADO';
  if (!noProgramado && evento.tieneConvocatoria) return null;
  return (
    <span className="mt-1.5 flex flex-wrap gap-1.5">
      {noProgramado && (
        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900">
          {ESTADO_EVENTO_LABELS[evento.estado as EstadoEvento] ?? evento.estado}
        </span>
      )}
      {!evento.tieneConvocatoria && (
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${sobreOscuro ? 'bg-white/15 text-white' : 'bg-gray-200 text-[#1C1C1C]'}`}
        >
          sin convocatoria
        </span>
      )}
    </span>
  );
}

/**
 * Próximos eventos del calendario.
 *
 * El dato accionable de cada fila es **si ya tiene convocatoria armada**: un partido a
 * dos días sin convocatoria es exactamente lo que el cuerpo técnico tiene que ver.
 *
 * Está separada de la card de plantel (que apunta a `/deportistas`) para que el mapeo
 * card→href quede 1:1 y esta card pueda linkear a `/calendario`.
 *
 * El primero va destacado en navy: es el partido que el cuerpo técnico tiene encima.
 */
export default async function SeccionEventos({ hoyDb }: { hoyDb: Date }) {
  // El límite de 5 mantiene la card del mismo alto que la de plantel, que va al lado.
  const eventos = await getProximosEventos({ desdeHoyDb: hoyDb, limite: 5 });

  const [proximo, ...resto] = eventos;

  return (
    // Sin encabezado: el bloque "Calendario" ya dice qué es y de qué período.
    <CardSeccion modulo="eventos">
      {!proximo ? (
        <EstadoVacio
          titulo="No hay eventos próximos"
          detalle="Cuando se cargue el fixture, los partidos aparecen acá."
        />
      ) : (
        <>
          <div className="flex min-w-0 items-center gap-4 rounded-xl bg-[#121A61] p-3 text-white">
            <TileFecha
              tamano="grande"
              arriba={diaCortoDb(proximo.fecha)}
              abajo={diaYMesCortoDb(proximo.fecha)}
              fondo="bg-[#C9A84C]"
              texto="text-[#121A61]"
            />
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-white/70">
                Próximo partido
              </p>
              <p className="truncate text-base font-semibold">
                {proximo.local} vs. {proximo.visitante}
              </p>
              <p className="truncate text-xs text-white/70">{proximo.categoria}</p>
              <Etiquetas evento={proximo} sobreOscuro />
            </div>
          </div>

          {resto.length > 0 && (
            <ul className="mt-3 grid grid-cols-1 gap-2.5">
              {resto.map((e) => (
                <li
                  key={e.id}
                  className="flex min-w-0 items-center gap-3 rounded-xl bg-gray-50 p-2.5"
                >
                  <TileFecha arriba={diaCortoDb(e.fecha)} abajo={diaYMesCortoDb(e.fecha)} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[#1C1C1C]">
                      {e.local} vs. {e.visitante}
                    </p>
                    <p className="truncate text-xs text-[#5B6478]">{e.categoria}</p>
                    <Etiquetas evento={e} sobreOscuro={false} />
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-4">
            <LinkPie href="/calendario">Ver el calendario</LinkPie>
          </div>
        </>
      )}
    </CardSeccion>
  );
}
