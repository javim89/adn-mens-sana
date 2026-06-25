import Link from 'next/link';
import { notFound } from 'next/navigation';
import { currentUser } from '@clerk/nextjs/server';
import { getTurnoById } from '@/lib/queries/turnos';
import { getProfesionales } from '@/lib/actions/turnos';
import TurnoForm from '../../_components/TurnoForm';
import type { TurnoListItem } from '@/lib/types/turnos';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditarTurnoPage({ params }: Props) {
  const { id } = await params;
  const turno = await getTurnoById(id);
  if (!turno) notFound();

  const user = await currentUser();
  const role = String(user?.publicMetadata?.role ?? '');
  const isAdmin = role === 'admin';

  const profesionales = isAdmin ? await getProfesionales() : [];

  const initialData: TurnoListItem = {
    id: turno.id,
    titulo: turno.titulo,
    fecha: turno.fecha.toISOString().split('T')[0],
    hora: turno.hora,
    lugar: turno.lugar,
    descripcion: turno.descripcion,
    profesionalId: turno.profesionalId,
    profesionalNombre: turno.profesionalId,
    deportistas: turno.deportistas.map((td) => ({
      id: td.deportista.id,
      nombre: td.deportista.nombre,
      apellido: td.deportista.apellido,
    })),
  };

  return (
    <div className="p-4 md:p-8">
      <div className="mb-2">
        <Link
          href="/turnos"
          className="text-sm text-[#6B7280] hover:text-[#1C1C1C] transition-colors"
        >
          ← Turnos
        </Link>
      </div>
      <h1
        className="text-3xl font-bold text-[#121A61] mb-6"
        style={{ fontFamily: 'Oswald, sans-serif' }}
      >
        Editar turno
      </h1>
      <TurnoForm
        mode="edit"
        isAdmin={isAdmin}
        profesionales={profesionales}
        initialData={initialData}
      />
    </div>
  );
}
