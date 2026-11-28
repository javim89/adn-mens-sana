import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import type { DeportistaAtencion } from '@/lib/queries/triage';
import { NIVEL_TRIAGE_BADGE, NIVEL_TRIAGE_LABELS } from '@/lib/utils/enum-labels';
import { Avatar } from '@/app/components/ui/avatar';
import { linkTriage } from '../_lib/links';
import EstadoVacio, { CardSeccion } from './EstadoVacio';
import LinkPie from './LinkPie';
import { NIVEL_ESTILO } from './TriageDistribucion';

function iniciales(d: { nombre: string; apellido: string }): string {
  return `${d.nombre.trim().charAt(0)}${d.apellido.trim().charAt(0)}`.toUpperCase() || '?';
}

/**
 * "A quién atender primero": los activos con el snapshot vigente más grave (ROJO →
 * AMARILLO, y por puntaje dentro del nivel), con categoría y las 2 reglas que más
 * sumaron. Cada fila abre la ficha.
 *
 * "Ver todos" va a los ROJO activos: es la lista que el hero cuenta. No hay un link
 * honesto a "todos los que no son verde" porque el listado filtra por un solo nivel.
 */
export default function AtencionPrioritaria({ deportistas }: { deportistas: DeportistaAtencion[] }) {
  return (
    <CardSeccion
      titulo="A quién atender primero"
      descripcion="Los deportistas activos con el nivel más alto, con el motivo de cada uno."
    >
      {deportistas.length === 0 ? (
        <EstadoVacio
          titulo="No hay nadie para atender primero"
          detalle="Ningún deportista activo está en amarillo, naranja o rojo en el último cálculo."
        />
      ) : (
        <>
          <ul className="divide-y divide-gray-100">
            {deportistas.map((d) => {
              const nombre = `${d.nombre} ${d.apellido}`.trim();
              const detalle = [d.categoria, ...d.motivos].filter(Boolean).join(' · ');
              return (
                <li key={d.deportistaId}>
                  <Link
                    href={`/deportistas/${d.deportistaId}`}
                    className="group flex items-center gap-3 rounded-lg px-1 py-2.5 transition-colors hover:bg-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secundario"
                  >
                    <span
                      className={`size-2.5 shrink-0 rounded-full ${NIVEL_ESTILO[d.nivel].barra}`}
                      aria-hidden
                    />
                    <Avatar
                      src={d.fotoUrl}
                      alt={nombre}
                      iniciales={iniciales(d)}
                      className="size-8 text-xs"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="text-sm font-medium text-foreground group-hover:underline">
                          {nombre}
                        </span>
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${NIVEL_TRIAGE_BADGE[d.nivel]}`}
                        >
                          {NIVEL_TRIAGE_LABELS[d.nivel]}
                        </span>
                      </span>
                      {detalle && (
                        <span className="mt-0.5 block text-xs text-muted-foreground">{detalle}</span>
                      )}
                    </span>
                    <ChevronRight
                      className="hidden size-4 shrink-0 text-muted-foreground sm:block"
                      aria-hidden
                    />
                  </Link>
                </li>
              );
            })}
          </ul>
          <div className="mt-4">
            <LinkPie href={linkTriage('ROJO')} ariaLabel="Ver todos los deportistas activos en rojo">
              Ver todos
            </LinkPie>
          </div>
        </>
      )}
    </CardSeccion>
  );
}
