import Link from 'next/link';
import { Panel } from '@/app/components/ui/panel';

export interface ProfesionalConTurnos {
  profesionalId: string;
  nombre: string;
  /** `ROL_LABELS[rol]`, o "Sin área" si ya no es miembro del club. */
  area: string;
  cantidad: number;
}

/** Vista "Por profesional" (solo admin): una tarjeta por profesional con su área y sus turnos del rango. */
export default function TurnosPorProfesional({
  profesionales,
  hrefDe,
}: {
  profesionales: ProfesionalConTurnos[];
  /** Link a la lista filtrada por ese profesional. */
  hrefDe: (profesionalId: string) => string;
}) {
  if (profesionales.length === 0) {
    return (
      <Panel>
        <p className="py-8 text-center text-sm text-muted-foreground">
          No hay turnos en este período.
        </p>
      </Panel>
    );
  }

  return (
    <ul className="grid gap-3 sm:grid-cols-2" aria-label="Turnos por profesional">
      {profesionales.map((p) => (
        <li key={p.profesionalId} className="min-w-0">
          <Panel className="h-full">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <Link
                  href={hrefDe(p.profesionalId)}
                  className="block truncate text-sm font-semibold text-primario hover:underline"
                >
                  {p.nombre}
                </Link>
                <p className="text-xs text-muted-foreground">{p.area}</p>
              </div>
              <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                {p.cantidad} {p.cantidad === 1 ? 'turno' : 'turnos'}
              </span>
            </div>
          </Panel>
        </li>
      ))}
    </ul>
  );
}
