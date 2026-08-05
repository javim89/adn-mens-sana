import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { auth, currentUser, clerkClient } from '@clerk/nextjs/server';
import { getEntrenamientoById } from '@/lib/queries/presentismo';
import { TIPO_SESION_LABELS } from '@/lib/utils/asistencia';
import type { EstadoAsistencia } from '@/lib/types/presentismo';
import EstadoAsistenciaBadge from '../_components/EstadoAsistenciaBadge';
import DeleteEntrenamientoModal from '../_components/DeleteEntrenamientoModal';

interface Props {
  params: Promise<{ id: string }>;
}

const ROLES_PERMITIDOS = ['admin', 'entrenador'];

function formatDate(date: Date) {
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

function DetailCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-5">
      <h2 className="text-xs font-semibold uppercase text-[#6B7280] mb-2 tracking-wide">
        {title}
      </h2>
      {children}
    </div>
  );
}

export default async function EntrenamientoDetallePage({ params }: Props) {
  const { id } = await params;

  const { userId } = await auth();
  const user = await currentUser();
  const role = String(user?.publicMetadata?.role ?? '');

  if (!ROLES_PERMITIDOS.includes(role)) {
    redirect('/dashboard');
  }

  const entrenamiento = await getEntrenamientoById(id);
  if (!entrenamiento) notFound();

  const isAdmin = role === 'admin';
  const canModify = isAdmin || entrenamiento.registradoPor === userId;

  let entrenadorNombre = entrenamiento.entrenadorId;
  try {
    const client = await clerkClient();
    const prof = await client.users.getUser(entrenamiento.entrenadorId);
    entrenadorNombre =
      `${prof.firstName ?? ''} ${prof.lastName ?? ''}`.trim() || entrenamiento.entrenadorId;
  } catch {
    // Clerk user not found, use id as fallback
  }

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
          className="text-sm text-[#6B7280] hover:text-[#1C1C1C] transition-colors"
        >
          ← Presentismo
        </Link>
      </div>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-3 mb-1">
            <h1
              className="text-3xl font-bold text-[#121A61]"
              style={{ fontFamily: 'Oswald, sans-serif' }}
            >
              {fechaLabel}
            </h1>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
              {TIPO_SESION_LABELS[entrenamiento.tipoSesion]}
            </span>
          </div>
          <p className="text-sm text-[#6B7280]">
            {entrenamiento.disciplina.nombre} · {entrenamiento.categoria.nombre}
          </p>
          <p className="text-sm text-[#6B7280]">Entrenador: {entrenadorNombre}</p>
        </div>

        {canModify && (
          <div className="flex items-center gap-2 shrink-0">
            <Link
              href={`/presentismo/${id}/editar`}
              className="text-sm font-medium px-4 py-2 border border-gray-200 text-[#6B7280] hover:text-[#1C1C1C] rounded-lg transition-colors"
            >
              Editar
            </Link>
            <DeleteEntrenamientoModal
              entrenamientoId={id}
              entrenamientoLabel={`${fechaLabel} — ${entrenamiento.disciplina.nombre}`}
              redirectAfterDelete="/presentismo"
            />
          </div>
        )}
      </div>

      <div className="space-y-4">
        {entrenamiento.objetivos && (
          <DetailCard title="Objetivos">
            <p className="text-sm text-[#1C1C1C] whitespace-pre-wrap">
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
              <dt className="text-xs font-medium text-[#6B7280] mb-1">Se retiró antes</dt>
              <dd className="text-2xl font-semibold leading-none text-[#6B7280]">
                {counts.SE_RETIRO_ANTES}
              </dd>
            </div>
          </dl>
        </DetailCard>

        {/* Listado de deportistas */}
        <DetailCard title={`Deportistas (${totalAsistencias})`}>
          {totalAsistencias === 0 ? (
            <p className="text-sm text-[#6B7280] italic">
              No hay deportistas registrados en este entrenamiento.
            </p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {entrenamiento.asistencias.map((a) => (
                <li
                  key={a.id}
                  className="py-3 flex items-center justify-between gap-2 first:pt-0 last:pb-0"
                >
                  <span className="text-sm font-medium text-[#1C1C1C]">
                    {a.deportista.apellido}, {a.deportista.nombre}
                  </span>
                  <EstadoAsistenciaBadge estado={a.estado as EstadoAsistencia} />
                </li>
              ))}
            </ul>
          )}
        </DetailCard>
      </div>
    </div>
  );
}
