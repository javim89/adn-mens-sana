import Link from 'next/link';
import { getDeportistaById } from '@/lib/queries/deportistas';
import { getSeguimientos } from '@/lib/queries/seguimientos';
import DeportistaDetailTabs from '../_components/DeportistaDetailTabs';
import DeleteDeportistaModal from '../_components/DeleteDeportistaModal';
import { ESTADO_LABELS } from '@/lib/utils/enum-labels';
import type { EstadoDeportista } from '@/lib/generated/prisma/enums';

const ESTADO_BADGE: Record<string, string> = {
  ACTIVO: 'bg-green-100 text-green-700',
  INACTIVO: 'bg-gray-100 text-[#6B7280]',
  LESIONADO: 'bg-amber-100 text-amber-700',
  SUSPENDIDO: 'bg-red-100 text-red-700',
};

export default async function DeportistaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const deportista = await getDeportistaById(id);

  const { items: seguimientosRaw } = await getSeguimientos({
    deportistaId: id,
    pageSize: 500,
  });
  const seguimientos = seguimientosRaw.map((s) => ({
    id: s.id,
    fecha: s.fecha.toISOString().split('T')[0],
    titulo: s.titulo,
    descripcion: s.descripcion,
    prioridad: s.prioridad,
    proximaCita: s.proximaCita?.toISOString() ?? null,
    tipoSeguimiento: s.tipoSeguimiento ?? null,
  }));

  const nombreCompleto = `${deportista.apellido}, ${deportista.nombre}`;

  return (
    <div className="p-8">
      {/* Breadcrumb */}
      <div className="mb-2">
        <Link
          href="/deportistas"
          className="text-sm text-[#6B7280] hover:text-[#1C1C1C] transition-colors"
        >
          ← Deportistas
        </Link>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-6 gap-4">
        <div className="flex items-center gap-3 flex-wrap">
          <h1
            className="text-3xl font-bold text-[#121A61]"
            style={{ fontFamily: 'Oswald, sans-serif' }}
          >
            {nombreCompleto}
          </h1>
          <span
            className={[
              'text-xs font-medium px-2.5 py-1 rounded-full',
              ESTADO_BADGE[deportista.estado] ?? 'bg-gray-100 text-[#6B7280]',
            ].join(' ')}
          >
            {ESTADO_LABELS[deportista.estado as EstadoDeportista]}
          </span>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <Link
            href={`/deportistas/${id}/editar`}
            className="flex items-center gap-2 bg-[#121A61] text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-[#1E2A8A] transition-colors"
          >
            Editar
          </Link>
          <DeleteDeportistaModal
            deportistaId={deportista.id}
            deportistaNombre={nombreCompleto}
          />
        </div>
      </div>

      <DeportistaDetailTabs deportista={deportista} seguimientos={seguimientos} />
    </div>
  );
}
