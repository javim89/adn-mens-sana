import { Panel } from '@/app/components/ui/panel';
import TileFecha from '../../dashboard/_components/TileFecha';
import { ACENTOS } from '../../dashboard/_lib/acentos';
import { diaDelTile, resumenCategorias } from '../_lib/formato';
import type { TurnoFila } from './TurnosTable';

/** La columna derecha de `/turnos`: los que vienen desde hoy, sin importar la semana elegida. */
export default function ProximosTurnos({ turnos }: { turnos: TurnoFila[] }) {
  return (
    <Panel titulo="Próximos turnos">
      {turnos.length === 0 ? (
        <p className="text-sm text-muted-foreground">No hay turnos agendados de hoy en adelante.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {turnos.map((t) => (
            <li key={t.id} className="flex min-w-0 items-center gap-3 rounded-xl bg-muted p-2.5">
              <TileFecha arriba={diaDelTile(t.fecha)} abajo={t.hora} fondo={ACENTOS.turnos.tileFecha} />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">{t.titulo}</p>
                <p className="truncate text-xs text-muted-foreground">{t.profesionalNombre}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {resumenCategorias(t.deportistas)} · {t.lugar}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
