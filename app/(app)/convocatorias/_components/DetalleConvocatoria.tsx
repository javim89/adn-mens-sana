import type { ReactNode } from 'react';
import { Avatar } from '@/app/components/ui/avatar';
import { EncabezadoPagina } from '@/app/components/ui/encabezado-pagina';
import { LayoutConLateral } from '@/app/components/ui/layout-con-lateral';
import { Panel } from '@/app/components/ui/panel';
import type { ConvocatoriaDetail } from '@/lib/queries/convocatorias';
import type { EstadoDeportista } from '@/lib/generated/prisma/enums';
import {
  ESTADO_BADGE,
  ESTADO_EVENTO_BADGE,
  ESTADO_EVENTO_LABELS,
  ESTADO_LABELS,
} from '@/lib/utils/enum-labels';
import { agruparPorPosicion, contarPorEstado } from '@/lib/utils/convocatorias';
import TileFecha from '../../dashboard/_components/TileFecha';
import { BADGE, tileDeClave, tituloPartido } from '../_lib/formato';

const ESTADOS_RESUMEN: { estado: EstadoDeportista; label: string; texto: string }[] = [
  { estado: 'ACTIVO', label: 'Activos', texto: 'text-green-700' },
  { estado: 'LESIONADO', label: 'Lesionados', texto: 'text-amber-700' },
  { estado: 'SUSPENDIDO', label: 'Suspendidos', texto: 'text-red-700' },
  { estado: 'INACTIVO', label: 'Inactivos', texto: 'text-muted-foreground' },
];

function iniciales(apellido: string, nombre: string): string {
  return `${apellido.trim().charAt(0)}${nombre.trim().charAt(0)}`;
}

function Dato({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="text-sm text-foreground break-words">
        {children || <span className="text-muted-foreground">—</span>}
      </dd>
    </div>
  );
}

/** El detalle de una convocatoria: partido, citación y citados; el resumen va al costado. */
export default function DetalleConvocatoria({
  convocatoria,
  acciones,
}: {
  convocatoria: ConvocatoriaDetail;
  acciones?: ReactNode;
}) {
  const { partido, convocados } = convocatoria;
  const tile = tileDeClave(partido.fecha);
  const porEstado = contarPorEstado(convocados);
  const porPosicion = agruparPorPosicion(convocados);
  const estadosConCitados = ESTADOS_RESUMEN.filter(
    (e) => e.estado === 'ACTIVO' || porEstado[e.estado] > 0,
  );

  const resumen = (
    <Panel titulo="Resumen">
      {convocados.length === 0 ? (
        <p className="text-sm text-muted-foreground">Todavía no hay convocados.</p>
      ) : (
        <>
          <dl className="grid grid-cols-2 gap-3">
            {estadosConCitados.map((e) => (
              <div key={e.estado} className="rounded-lg bg-muted p-3">
                <dt className="text-xs text-muted-foreground">{e.label}</dt>
                <dd className={`font-mono text-2xl font-semibold tabular-nums ${e.texto}`}>
                  {porEstado[e.estado]}
                </dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 text-xs text-muted-foreground">
            {convocatoria.disciplina} · {convocatoria.categoria}
          </p>
          <ul className="mt-2 space-y-2 text-sm text-foreground" aria-label="Convocados por posición">
            {porPosicion.map((p) => (
              <li key={p.posicion} className="flex items-center justify-between gap-2">
                <span className="min-w-0 truncate">{p.posicion}</span>
                <span className="font-mono font-semibold tabular-nums text-primario">
                  {p.cantidad}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </Panel>
  );

  return (
    <div className="flex flex-col gap-6">
      <EncabezadoPagina titulo={tituloPartido(partido)} accion={acciones}>
        <div className="flex flex-wrap gap-1.5">
          <span className={`${BADGE} ${ESTADO_EVENTO_BADGE[partido.estado]}`}>
            {ESTADO_EVENTO_LABELS[partido.estado]}
          </span>
          <span className={`${BADGE} bg-muted text-foreground`}>{convocatoria.disciplina}</span>
          <span className={`${BADGE} bg-muted text-foreground`}>{convocatoria.categoria}</span>
          {partido.condicion && (
            <span className={`${BADGE} bg-primario-suave text-primario`}>{partido.condicion}</span>
          )}
        </div>
      </EncabezadoPagina>

      <LayoutConLateral lateral={resumen} lateralLabel="Resumen de la convocatoria">
        <Panel className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-4">
            <TileFecha arriba={tile.arriba} abajo={tile.abajo} tamano="grande" />
            <dl className="grid min-w-0 flex-1 gap-2 sm:grid-cols-2 sm:gap-4">
              <Dato label="Hora de citación">{convocatoria.horaCitacion}</Dato>
              <Dato label="Lugar / punto de encuentro">{convocatoria.lugar}</Dato>
            </dl>
          </div>
          <dl className="grid gap-3 border-t border-border pt-3">
            <Dato label="Entrenador a cargo">{convocatoria.entrenadorNombre}</Dato>
            {convocatoria.observaciones && (
              <div className="min-w-0">
                <dt className="text-xs font-medium text-muted-foreground">Observaciones</dt>
                <dd className="text-sm text-foreground whitespace-pre-wrap break-words">
                  {convocatoria.observaciones}
                </dd>
              </div>
            )}
          </dl>
        </Panel>

        <Panel titulo={`Citados (${convocados.length})`}>
          {convocados.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">No hay deportistas convocados.</p>
          ) : (
            <ul className="divide-y divide-border">
              {convocados.map((c) => (
                <li key={c.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                  <Avatar
                    src={c.fotoUrl}
                    alt={`${c.nombre} ${c.apellido}`}
                    iniciales={iniciales(c.apellido, c.nombre)}
                    className="size-8 text-xs"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {c.apellido}, {c.nombre}
                    </p>
                    {c.posicion && (
                      <p className="truncate text-xs text-muted-foreground">{c.posicion}</p>
                    )}
                  </div>
                  <span className={`${BADGE} ${ESTADO_BADGE[c.estado]}`}>
                    {ESTADO_LABELS[c.estado]}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </LayoutConLateral>
    </div>
  );
}

