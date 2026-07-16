import Link from 'next/link';
import { CalendarDays } from 'lucide-react';
import { notFound } from 'next/navigation';
import { auth, currentUser, clerkClient } from '@clerk/nextjs/server';
import { getSeguimientoById } from '@/lib/queries/seguimientos';
import DeleteSeguimientoModal from '../_components/DeleteSeguimientoModal';

interface Props {
  params: Promise<{ id: string }>;
}

const PRIORIDAD_LABELS: Record<string, string> = {
  BAJA: 'Baja',
  MEDIA: 'Media',
  ALTA: 'Alta',
  URGENTE: 'Urgente',
};

const PRIORIDAD_STYLES: Record<string, string> = {
  BAJA: 'bg-[#D1FAE5] text-[#065F46]',
  MEDIA: 'bg-[#FEF9C3] text-[#713F12]',
  ALTA: 'bg-[#FED7AA] text-[#7C2D12]',
  URGENTE: 'bg-[#FEE2E2] text-[#7F1D1D]',
};

function formatDatetime(isoStr: string) {
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(isoStr));
}

function formatDate(dateStr: string) {
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(dateStr + 'T00:00:00'));
}

export default async function SeguimientoDetallePage({ params }: Props) {
  const { id } = await params;
  const seguimiento = await getSeguimientoById(id);
  if (!seguimiento) notFound();

  const { userId } = await auth();
  const user = await currentUser();
  const isAdmin = String(user?.publicMetadata?.role ?? '') === 'admin';
  const isOwner = seguimiento.profesionalId === userId;
  const canModify = isAdmin || isOwner;

  // Resolver nombre del profesional
  let profesionalNombre = seguimiento.profesionalId;
  try {
    const client = await clerkClient();
    const prof = await client.users.getUser(seguimiento.profesionalId);
    profesionalNombre = `${prof.firstName ?? ''} ${prof.lastName ?? ''}`.trim();
  } catch {
    // Clerk user not found, use id as fallback
  }

  const prioridad = String(seguimiento.prioridad);
  const fechaStr = seguimiento.fecha.toISOString().split('T')[0];

  return (
    <div className="p-4 md:p-8">
      {/* Breadcrumb */}
      <div className="mb-4">
        <Link
          href="/seguimientos"
          className="text-sm text-[#6B7280] hover:text-[#1C1C1C] transition-colors"
        >
          ← Seguimientos
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
              {seguimiento.titulo}
            </h1>
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${PRIORIDAD_STYLES[prioridad] ?? 'bg-gray-100 text-gray-600'}`}
            >
              {PRIORIDAD_LABELS[prioridad] ?? prioridad}
            </span>
          </div>
          <p className="text-sm text-[#6B7280]">
            {seguimiento.deportista.apellido}, {seguimiento.deportista.nombre} · {formatDate(fechaStr)}
          </p>
          <p className="text-sm text-[#6B7280]">Profesional: {profesionalNombre}</p>
        </div>

        {canModify && (
          <div className="flex items-center gap-2 shrink-0">
            <Link
              href={`/seguimientos/${id}/editar`}
              className="text-sm font-medium px-4 py-2 border border-gray-200 text-[#6B7280] hover:text-[#1C1C1C] rounded-lg transition-colors"
            >
              Editar
            </Link>
            <DeleteSeguimientoModal
              seguimientoId={id}
              seguimientoTitulo={seguimiento.titulo}
              redirectAfterDelete="/seguimientos"
            />
          </div>
        )}
      </div>

      {/* Content cards */}
      <div className="space-y-4">
        {seguimiento.descripcion && (
          <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-5">
            <h2 className="text-xs font-semibold uppercase text-[#6B7280] mb-2 tracking-wide">
              Descripción / Observaciones
            </h2>
            <p className="text-sm text-[#1C1C1C] whitespace-pre-wrap">{seguimiento.descripcion}</p>
          </div>
        )}

        {seguimiento.recomendaciones && (
          <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-5">
            <h2 className="text-xs font-semibold uppercase text-[#6B7280] mb-2 tracking-wide">
              Recomendaciones
            </h2>
            <p className="text-sm text-[#1C1C1C] whitespace-pre-wrap">
              {seguimiento.recomendaciones}
            </p>
          </div>
        )}

        {seguimiento.resultadosEvaluacion && (
          <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-5">
            <h2 className="text-xs font-semibold uppercase text-[#6B7280] mb-2 tracking-wide">
              Resultados de evaluación
            </h2>
            <p className="text-sm text-[#1C1C1C] whitespace-pre-wrap">
              {seguimiento.resultadosEvaluacion}
            </p>
          </div>
        )}

        {seguimiento.alertaSeguimiento && (
          <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-5">
            <h2 className="text-xs font-semibold uppercase text-[#6B7280] mb-2 tracking-wide">
              Alerta de seguimiento
            </h2>
            <p className="text-sm text-[#1C1C1C] whitespace-pre-wrap">
              {seguimiento.alertaSeguimiento}
            </p>
          </div>
        )}

        {seguimiento.proximaCita && (
          <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-5">
            <h2 className="text-xs font-semibold uppercase text-[#6B7280] mb-2 tracking-wide">
              Próxima cita
            </h2>
            <p className="text-sm text-[#1C1C1C] flex items-center gap-2">
              <CalendarDays size={14} className="text-[#6B7280] shrink-0" />
              {formatDatetime(seguimiento.proximaCita.toISOString())}
            </p>
          </div>
        )}

        {!seguimiento.descripcion &&
          !seguimiento.recomendaciones &&
          !seguimiento.resultadosEvaluacion &&
          !seguimiento.alertaSeguimiento &&
          !seguimiento.proximaCita && (
            <p className="text-sm text-[#6B7280] italic">
              No hay información adicional registrada para este seguimiento.
            </p>
          )}
      </div>
    </div>
  );
}
