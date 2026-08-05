import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { auth, currentUser } from '@clerk/nextjs/server';
import { getConvocatoriaById } from '@/lib/queries/convocatorias';
import DeleteConvocatoriaModal from '../_components/DeleteConvocatoriaModal';

interface Props {
  params: Promise<{ id: string }>;
}

const ROLES_PERMITIDOS = ['admin', 'entrenador'];

const ESTADO_LABELS: Record<string, string> = {
  PROGRAMADO: 'Programado',
  REPROGRAMADO: 'Reprogramado',
  SUSPENDIDO: 'Suspendido',
};

const ESTADO_STYLES: Record<string, string> = {
  PROGRAMADO: 'bg-green-100 text-green-700',
  REPROGRAMADO: 'bg-amber-100 text-amber-700',
  SUSPENDIDO: 'bg-red-100 text-red-700',
};

function formatDate(dateStr: string) {
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(dateStr + 'T00:00:00'));
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

export default async function ConvocatoriaDetallePage({ params }: Props) {
  const { id } = await params;

  const { userId } = await auth();
  const user = await currentUser();
  const role = String(user?.publicMetadata?.role ?? '');

  if (!ROLES_PERMITIDOS.includes(role)) {
    redirect('/dashboard');
  }

  const convocatoria = await getConvocatoriaById(id);
  if (!convocatoria) notFound();

  const isAdmin = role === 'admin';
  const canModify = isAdmin || convocatoria.registradoPor === userId;

  const { partido } = convocatoria;
  const fechaLabel = formatDate(partido.fecha);
  const totalConvocados = convocatoria.convocados.length;

  return (
    <div className="p-4 md:p-8">
      {/* Breadcrumb */}
      <div className="mb-4">
        <Link
          href="/convocatorias"
          className="text-sm text-[#6B7280] hover:text-[#1C1C1C] transition-colors"
        >
          ← Convocatorias
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
              {partido.local} vs {partido.visitante}
            </h1>
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                ESTADO_STYLES[partido.estado] ?? 'bg-gray-100 text-gray-700'
              }`}
            >
              {ESTADO_LABELS[partido.estado] ?? partido.estado}
            </span>
          </div>
          <p className="text-sm text-[#6B7280]">{fechaLabel}</p>
        </div>

        {canModify && (
          <div className="flex items-center gap-2 shrink-0">
            <Link
              href={`/convocatorias/${id}/editar`}
              className="text-sm font-medium px-4 py-2 border border-gray-200 text-[#6B7280] hover:text-[#1C1C1C] rounded-lg transition-colors"
            >
              Editar
            </Link>
            <DeleteConvocatoriaModal
              convocatoriaId={id}
              convocatoriaLabel={`${partido.local} vs ${partido.visitante}`}
              redirectAfterDelete="/convocatorias"
            />
          </div>
        )}
      </div>

      <div className="space-y-4">
        {/* Datos de la citación */}
        <DetailCard title="Datos de la citación">
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <dt className="text-xs font-medium text-[#6B7280] mb-0.5">Hora de citación</dt>
              <dd className="text-sm text-[#1C1C1C]">
                {convocatoria.horaCitacion || <span className="text-[#6B7280]">—</span>}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-[#6B7280] mb-0.5">
                Lugar / punto de encuentro
              </dt>
              <dd className="text-sm text-[#1C1C1C]">
                {convocatoria.lugar || <span className="text-[#6B7280]">—</span>}
              </dd>
            </div>
          </dl>
          {convocatoria.observaciones && (
            <div className="mt-4">
              <dt className="text-xs font-medium text-[#6B7280] mb-0.5">Observaciones</dt>
              <dd className="text-sm text-[#1C1C1C] whitespace-pre-wrap">
                {convocatoria.observaciones}
              </dd>
            </div>
          )}
        </DetailCard>

        {/* Plantel convocado */}
        <DetailCard title={`Plantel convocado (${totalConvocados})`}>
          {totalConvocados === 0 ? (
            <p className="text-sm text-[#6B7280] italic">
              No hay deportistas convocados.
            </p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {convocatoria.convocados.map((c) => (
                <li
                  key={c.id}
                  className="py-3 flex items-center justify-between gap-2 first:pt-0 last:pb-0"
                >
                  <span className="text-sm font-medium text-[#1C1C1C]">
                    {c.apellido}, {c.nombre}
                  </span>
                  {c.posicion && (
                    <span className="text-xs text-[#6B7280]">{c.posicion}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </DetailCard>
      </div>
    </div>
  );
}
