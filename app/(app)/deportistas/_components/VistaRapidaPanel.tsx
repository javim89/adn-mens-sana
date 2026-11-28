'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { Avatar } from '@/app/components/ui/avatar';
import { Button } from '@/app/components/ui/button';
import { Panel } from '@/app/components/ui/panel';
import { NIVEL_TRIAGE_BADGE, NIVEL_TRIAGE_LABELS } from '@/lib/utils/enum-labels';
import { PRIORIDAD_LABELS, PRIORIDAD_STYLES } from '@/lib/utils/seguimiento-tipo';
import type { NivelTriage } from '@/lib/generated/prisma/enums';
import { obtenerVistaRapida } from '../_lib/vista-rapida';

export interface DeportistaSeleccionado {
  id: string;
  nombre: string;
  apellido: string;
  disciplina: string | null;
  categoria: string | null;
  nivelTriage: NivelTriage | null;
  fotoUrl?: string | null;
}

const BADGE = 'inline-flex w-fit items-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap';

function fechaCorta(fecha: Date | string): string {
  const [, mes, dia] = new Date(fecha).toISOString().slice(0, 10).split('-');
  return `${dia}/${mes}`;
}

export default function VistaRapidaPanel({
  deportista,
  onCerrar,
}: {
  deportista: DeportistaSeleccionado;
  onCerrar: () => void;
}) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['deportistas', deportista.id, 'vista-rapida'],
    queryFn: () => obtenerVistaRapida(deportista.id),
  });

  const nombre = `${deportista.apellido}, ${deportista.nombre}`;
  const subtitulo = [deportista.disciplina, deportista.categoria].filter(Boolean).join(' · ');

  return (
    <Panel
      titulo="Vista rápida"
      accion={
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-7"
          onClick={onCerrar}
          aria-label="Cerrar vista rápida"
        >
          <X className="size-4" aria-hidden />
        </Button>
      }
    >
      <div className="flex items-center gap-3">
        <Avatar
          src={deportista.fotoUrl}
          alt={nombre}
          iniciales={`${deportista.nombre.charAt(0)}${deportista.apellido.charAt(0)}`}
          className="size-11 text-sm"
        />
        <div className="min-w-0 flex-1">
          <Link
            href={`/deportistas/${deportista.id}`}
            className="block truncate text-sm font-semibold text-primario hover:underline"
          >
            {nombre}
          </Link>
          {subtitulo && <p className="truncate text-xs text-muted-foreground">{subtitulo}</p>}
        </div>
        {deportista.nivelTriage && (
          <span className={`${BADGE} ${NIVEL_TRIAGE_BADGE[deportista.nivelTriage]}`}>
            {NIVEL_TRIAGE_LABELS[deportista.nivelTriage]}
          </span>
        )}
      </div>

      {isLoading && <p className="mt-3 text-xs text-muted-foreground">Cargando…</p>}
      {isError && (
        <p className="mt-3 text-xs text-red-600">No se pudo cargar la vista rápida.</p>
      )}

      {data && (
        <dl className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-lg bg-muted p-2">
            <dt className="text-[11px] text-muted-foreground">Seguimientos recientes</dt>
            <dd className="font-mono text-sm font-semibold tabular-nums text-foreground">
              {data.seguimientosRecientes.length}
            </dd>
          </div>
          <div className="rounded-lg bg-muted p-2">
            <dt className="text-[11px] text-muted-foreground">Presentismo del mes</dt>
            <dd className="font-mono text-sm font-semibold tabular-nums text-foreground">
              {data.presentismoMes.porcentaje === null ? 'Sin registros' : `${data.presentismoMes.porcentaje}%`}
            </dd>
          </div>
          <div className="col-span-2 rounded-lg bg-muted p-2">
            <dt className="text-[11px] text-muted-foreground">Próximo turno</dt>
            <dd className="text-sm font-semibold text-foreground">
              {data.proximoTurno
                ? `${fechaCorta(data.proximoTurno.fecha)} ${data.proximoTurno.hora} · ${data.proximoTurno.titulo}`
                : 'Sin turnos agendados'}
            </dd>
          </div>
          {data.seguimientosRecientes.length > 0 && (
            <div className="col-span-2">
              <dt className="sr-only">Últimos seguimientos</dt>
              <dd>
                <ul className="divide-y divide-border">
                  {data.seguimientosRecientes.map((s) => (
                    <li key={s.id} className="flex items-center gap-2 py-1.5">
                      <span className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
                        {fechaCorta(s.fecha)}
                      </span>
                      <Link
                        href={`/seguimientos/${s.id}`}
                        className="min-w-0 flex-1 truncate text-sm text-foreground hover:underline"
                      >
                        {s.titulo}
                      </Link>
                      <span className={`${BADGE} ${PRIORIDAD_STYLES[s.prioridad]}`}>
                        {PRIORIDAD_LABELS[s.prioridad]}
                      </span>
                    </li>
                  ))}
                </ul>
              </dd>
            </div>
          )}
        </dl>
      )}
    </Panel>
  );
}
