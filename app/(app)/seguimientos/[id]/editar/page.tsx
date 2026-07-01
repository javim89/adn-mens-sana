import Link from 'next/link';
import { notFound } from 'next/navigation';
import { currentUser } from '@clerk/nextjs/server';
import { getSeguimientoById } from '@/lib/queries/seguimientos';
import { getProfesionalesSeguimientos } from '@/lib/actions/seguimientos';
import SeguimientoForm from '../../_components/SeguimientoForm';
import type { SeguimientoListItem } from '@/lib/types/seguimientos';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditarSeguimientoPage({ params }: Props) {
  const { id } = await params;
  const seguimiento = await getSeguimientoById(id);
  if (!seguimiento) notFound();

  const user = await currentUser();
  const role = String(user?.publicMetadata?.role ?? '');
  const isAdmin = role === 'admin';

  const profesionales = isAdmin ? await getProfesionalesSeguimientos() : [];

  const initialData: SeguimientoListItem = {
    id: seguimiento.id,
    fecha: seguimiento.fecha.toISOString().split('T')[0],
    titulo: seguimiento.titulo,
    descripcion: seguimiento.descripcion,
    recomendaciones: seguimiento.recomendaciones,
    resultadosEvaluacion: seguimiento.resultadosEvaluacion,
    prioridad: seguimiento.prioridad,
    proximaCita: seguimiento.proximaCita?.toISOString() ?? null,
    alertaSeguimiento: seguimiento.alertaSeguimiento,
    profesionalId: seguimiento.profesionalId,
    profesionalNombre: seguimiento.profesionalId,
    deportistaId: seguimiento.deportista.id,
    deportistaNombre: `${seguimiento.deportista.apellido}, ${seguimiento.deportista.nombre}`,
  };

  return (
    <div className="p-4 md:p-8">
      <div className="mb-2">
        <Link
          href={`/seguimientos/${id}`}
          className="text-sm text-[#6B7280] hover:text-[#1C1C1C] transition-colors"
        >
          ← Volver al seguimiento
        </Link>
      </div>
      <h1
        className="text-3xl font-bold text-[#121A61] mb-6"
        style={{ fontFamily: 'Oswald, sans-serif' }}
      >
        Editar seguimiento
      </h1>
      <SeguimientoForm
        mode="edit"
        isAdmin={isAdmin}
        profesionales={profesionales}
        initialData={initialData}
      />
    </div>
  );
}
