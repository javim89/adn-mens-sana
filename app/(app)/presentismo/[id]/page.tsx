import Link from 'next/link';
import { notFound } from 'next/navigation';
import { MessageSquare } from 'lucide-react';
import { Avatar } from '@/app/components/ui/avatar';
import { EncabezadoPagina } from '@/app/components/ui/encabezado-pagina';
import { Panel } from '@/app/components/ui/panel';
import { requireContexto } from '@/lib/tenant/contexto';
import { getNombresDeUsuarios } from '@/lib/tenant/miembros';
import type { AppRole } from '@/lib/roles';
import { getEntrenamientoById } from '@/lib/queries/presentismo';
import { TIPO_SESION_LABELS } from '@/lib/utils/asistencia';
import type { EstadoAsistencia } from '@/lib/types/presentismo';
import EstadoAsistenciaBadge from '../_components/EstadoAsistenciaBadge';
import DeleteEntrenamientoModal from '../_components/DeleteEntrenamientoModal';

interface Props {
  params: Promise<{ id: string }>;
}

const ROLES_PERMITIDOS: AppRole[] = ['admin', 'entrenador'];

function formatDate(date: Date) {
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

function DetailCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Panel titulo={title} className="p-5">
      {children}
    </Panel>
  );
}

export default async function EntrenamientoDetallePage({ params }: Props) {
  const { id } = await params;

  const { userId, rol: role } = await requireContexto(ROLES_PERMITIDOS);

  const entrenamiento = await getEntrenamientoById(id);
  if (!entrenamiento) notFound();

  const isAdmin = role === 'admin';
  const canModify = isAdmin || entrenamiento.registradoPor === userId;

  const entrenadorNombre =
    (await getNombresDeUsuarios([entrenamiento.entrenadorId]))[entrenamiento.entrenadorId] ??
    entrenamiento.entrenadorId;

  const counts = { PRESENTE: 0, AUSENTE: 0, LLEGO_TARDE: 0, SE_RETIRO_ANTES: 0 };
  for (const a of entrenamiento.asistencias) {
    counts[a.estado as EstadoAsistencia]++;
  }
  const totalAsistencias = entrenamiento.asistencias.length;

  const fechaLabel = formatDate(entrenamiento.fecha);

  return (
    <div className="p-4 md:p-8">
      {/* Breadcrumb */}
      <div className="mb-4">
        <Link
          href="/presentismo"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Presentismo
        </Link>
      </div>

      <EncabezadoPagina
        className="mb-6"
        titulo={fechaLabel}
        subtitulo={
          <>
            {TIPO_SESION_LABELS[entrenamiento.tipoSesion]} · {entrenamiento.disciplina.nombre} ·{' '}
            {entrenamiento.categoria.nombre}
            <span className="block">Entrenador: {entrenadorNombre}</span>
          </>
        }
        accion={
          canModify && (
            <>
              <Link
                href={`/presentismo/${id}/editar`}
                className="text-sm font-medium px-4 py-2 border border-gray-200 text-muted-foreground hover:text-foreground rounded-lg transition-colors"
              >
                Editar
              </Link>
              <DeleteEntrenamientoModal
                entrenamientoId={id}
                entrenamientoLabel={`${fechaLabel} — ${entrenamiento.disciplina.nombre}`}
                redirectAfterDelete="/presentismo"
              />
            </>
          )
        }
      />

      <div className="space-y-4">
        {entrenamiento.objetivos && (
          <DetailCard title="Objetivos">
            <p className="text-sm text-foreground whitespace-pre-wrap">
              {entrenamiento.objetivos}
            </p>
          </DetailCard>
        )}

        {/* Resumen de asistencia */}
        <DetailCard title="Resumen de asistencia">
          <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-lg bg-green-50 px-4 py-3">
              <dt className="text-xs font-medium text-green-700 mb-1">Presentes</dt>
              <dd className="text-2xl font-semibold leading-none text-green-700">
                {counts.PRESENTE}
              </dd>
            </div>
            <div className="rounded-lg bg-red-50 px-4 py-3">
              <dt className="text-xs font-medium text-red-700 mb-1">Ausentes</dt>
              <dd className="text-2xl font-semibold leading-none text-red-700">
                {counts.AUSENTE}
              </dd>
            </div>
            <div className="rounded-lg bg-amber-50 px-4 py-3">
              <dt className="text-xs font-medium text-amber-700 mb-1">Llegó tarde</dt>
              <dd className="text-2xl font-semibold leading-none text-amber-700">
                {counts.LLEGO_TARDE}
              </dd>
            </div>
            <div className="rounded-lg bg-gray-100 px-4 py-3">
              <dt className="text-xs font-medium text-muted-foreground mb-1">Se retiró antes</dt>
              <dd className="text-2xl font-semibold leading-none text-muted-foreground">
                {counts.SE_RETIRO_ANTES}
              </dd>
            </div>
          </dl>
        </DetailCard>

        {/* Listado de deportistas */}
        <DetailCard title={`Deportistas (${totalAsistencias})`}>
          {totalAsistencias === 0 ? (
            <p className="text-sm text-muted-foreground italic">
              No hay deportistas registrados en este entrenamiento.
            </p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {entrenamiento.asistencias.map((a) => (
                <li
                  key={a.id}
                  className="py-3 flex items-center justify-between gap-3 first:pt-0 last:pb-0"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar
                      alt={`${a.deportista.apellido}, ${a.deportista.nombre}`}
                      iniciales={`${a.deportista.nombre.charAt(0)}${a.deportista.apellido.charAt(0)}`}
                      className="size-8 text-xs"
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        {a.deportista.apellido}, {a.deportista.nombre}
                      </p>
                      {a.notas && (
                        <p className="flex items-start gap-1 text-xs text-muted-foreground">
                          <MessageSquare size={12} className="mt-0.5 shrink-0" aria-hidden />
                          <span className="break-words">{a.notas}</span>
                        </p>
                      )}
                    </div>
                  </div>
                  <EstadoAsistenciaBadge estado={a.estado as EstadoAsistencia} className="shrink-0" />
                </li>
              ))}
            </ul>
          )}
        </DetailCard>
      </div>
    </div>
  );
}
