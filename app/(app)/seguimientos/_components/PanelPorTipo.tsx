import Link from 'next/link';
import type { TipoSeguimiento } from '@/lib/types/seguimientos';
import { Panel } from '@/app/components/ui/panel';
import { TIPO_SEGUIMIENTO_META } from '@/lib/utils/seguimiento-tipo';

export interface FilaPorTipo {
  tipo: TipoSeguimiento;
  cantidad: number;
  /** El listado con los filtros actuales + este tipo (o sin tipo, si ya está activo). */
  href: string;
  activo: boolean;
}

/**
 * Desglose por tipo de lo que matchea los filtros del listado. Cada fila linkea al
 * mismo listado filtrado por ese tipo, así que el número de la fila es el total que
 * se ve al abrirla. La fila activa vuelve a quitar el filtro.
 */
export default function PanelPorTipo({ filas, total }: { filas: FilaPorTipo[]; total: number }) {
  const maximo = Math.max(0, ...filas.map((f) => f.cantidad));
  const ordenadas = [...filas].sort((a, b) => b.cantidad - a.cantidad);

  return (
    <Panel titulo="Seguimientos por tipo">
      {total === 0 ? (
        <p className="text-sm text-muted-foreground">No hay seguimientos con estos filtros.</p>
      ) : (
        <ul className="space-y-1">
          {ordenadas.map((f) => {
            const meta = TIPO_SEGUIMIENTO_META[f.tipo];
            const ancho = maximo > 0 ? Math.round((f.cantidad / maximo) * 100) : 0;
            return (
              <li key={f.tipo}>
                <Link
                  href={f.href}
                  aria-current={f.activo ? 'true' : undefined}
                  aria-label={
                    f.activo
                      ? `Quitar el filtro ${meta.label} (${f.cantidad})`
                      : `Ver ${f.cantidad} de ${meta.label}`
                  }
                  className={`block rounded-lg px-2 py-1.5 transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secundario ${f.activo ? 'bg-primario-suave' : ''}`}
                >
                  <span className="flex items-center justify-between gap-2 text-sm text-foreground">
                    <span className="flex min-w-0 items-center gap-2">
                      <span className={`size-2 shrink-0 rounded-full ${meta.dot}`} aria-hidden />
                      <span className="truncate">{meta.label}</span>
                    </span>
                    <span className="font-mono font-semibold tabular-nums">{f.cantidad}</span>
                  </span>
                  <span className="mt-1.5 block h-1.5 rounded-full bg-muted" aria-hidden>
                    <span
                      className={`block h-full rounded-full ${meta.dot}`}
                      style={{ width: `${ancho}%` }}
                    />
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}
