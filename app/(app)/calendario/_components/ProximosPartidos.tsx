import { Panel } from '@/app/components/ui/panel';
import TileFecha from '@/app/(app)/dashboard/_components/TileFecha';
import { diaCortoDb, diaYMesCortoDb } from '@/app/(app)/dashboard/_lib/formato';
import { ESTADO_EVENTO_BADGE, ESTADO_EVENTO_LABELS } from '@/lib/utils/enum-labels';
import type { EstadoEvento } from '@/lib/generated/prisma/enums';
import type { EventoProximo } from '@/lib/queries/dashboard';

const PILDORA = 'inline-flex w-fit shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap';

/**
 * Columna derecha del calendario: los próximos partidos desde hoy (mismo patrón que
 * `SeccionEventos` del dashboard). No hay hora del partido en la base, así que el tile
 * muestra solo el día.
 */
export default function ProximosPartidos({ eventos }: { eventos: EventoProximo[] }) {
  return (
    <Panel titulo="Próximos partidos">
      {eventos.length === 0 ? (
        <p className="text-sm text-muted-foreground">No hay partidos próximos cargados.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {eventos.map((e) => {
            const estado = e.estado as EstadoEvento;
            return (
              <li key={e.id} className="flex min-w-0 items-center gap-3 rounded-lg bg-subtle p-2">
                <TileFecha arriba={diaCortoDb(e.fecha)} abajo={diaYMesCortoDb(e.fecha)} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">{e.categoria}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {e.rival ? `vs. ${e.rival}` : `${e.local} vs. ${e.visitante}`}
                    {e.condicion && ` · ${e.condicion}`}
                  </p>
                  {(estado !== 'PROGRAMADO' || !e.tieneConvocatoria) && (
                    <span className="mt-1 flex flex-wrap gap-1">
                      {estado !== 'PROGRAMADO' && (
                        <span className={`${PILDORA} ${ESTADO_EVENTO_BADGE[estado] ?? ''}`}>
                          {ESTADO_EVENTO_LABELS[estado] ?? e.estado}
                        </span>
                      )}
                      {!e.tieneConvocatoria && (
                        <span className={`${PILDORA} bg-muted text-muted-foreground`}>sin convocatoria</span>
                      )}
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}
