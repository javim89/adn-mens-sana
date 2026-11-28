import Link from 'next/link';
import type { TurnoProximo } from '@/lib/queries/dashboard';
import { Panel } from '@/app/components/ui/panel';
import TileFecha from '@/app/(app)/dashboard/_components/TileFecha';
import { ACENTOS } from '@/app/(app)/dashboard/_lib/acentos';
import { diaCortoYFechaDb, listaDeportistas } from '@/app/(app)/dashboard/_lib/formato';

/** Los próximos turnos desde hoy (los propios si no es admin), como en el dashboard. */
export default function PanelProximosTurnos({ turnos }: { turnos: TurnoProximo[] }) {
  return (
    <Panel
      titulo="Próximos turnos"
      accion={
        <Link href="/turnos" className="text-secundario hover:text-primario hover:underline">
          Ver todos
        </Link>
      }
    >
      {turnos.length === 0 ? (
        <p className="text-sm text-muted-foreground">No hay turnos agendados de hoy en adelante.</p>
      ) : (
        <ul className="space-y-2">
          {turnos.map((t) => (
            <li key={t.id} className="flex min-w-0 items-center gap-3 rounded-lg bg-subtle p-2">
              <TileFecha
                arriba={diaCortoYFechaDb(t.fecha)}
                abajo={t.hora}
                fondo={ACENTOS.turnos.tileFecha}
              />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">{t.titulo}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {listaDeportistas(t.deportistas)} · {t.lugar}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
