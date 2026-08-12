import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { currentUser } from '@clerk/nextjs/server';
import { getEntrenamientoById } from '@/lib/queries/presentismo';
import { getDisciplinasConCategorias } from '@/lib/queries/disciplinas';
import { getEntrenadores } from '@/lib/actions/presentismo';
import type { EntrenamientoFormData, EstadoAsistencia } from '@/lib/types/presentismo';
import PresentismoForm from '../../_components/PresentismoForm';

interface Props {
  params: Promise<{ id: string }>;
}

const ROLES_PERMITIDOS = ['admin', 'entrenador'];

export default async function EditarEntrenamientoPage({ params }: Props) {
  const { id } = await params;

  const user = await currentUser();
  const role = String(user?.publicMetadata?.role ?? '');

  if (!ROLES_PERMITIDOS.includes(role)) {
    redirect('/dashboard');
  }

  const isAdmin = role === 'admin';

  const entrenamiento = await getEntrenamientoById(id);
  if (!entrenamiento) notFound();

  const [disciplinas, entrenadores] = await Promise.all([
    getDisciplinasConCategorias(),
    getEntrenadores(),
  ]);

  const currentEntrenadorNombre =
    `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim() ||
    user?.emailAddresses?.[0]?.emailAddress ||
    '';

  const initialData: EntrenamientoFormData & {
    id: string;
    roster: { id: string; nombre: string; apellido: string }[];
  } = {
    id: entrenamiento.id,
    fecha: entrenamiento.fecha.toISOString().split('T')[0],
    entrenadorId: entrenamiento.entrenadorId,
    tipoSesion: entrenamiento.tipoSesion,
    objetivos: entrenamiento.objetivos ?? undefined,
    disciplinaId: entrenamiento.disciplina.id,
    categoriaId: entrenamiento.categoria.id,
    asistencias: entrenamiento.asistencias.map((a) => ({
      deportistaId: a.deportistaId,
      estado: a.estado as EstadoAsistencia,
      notas: a.notas ?? undefined,
    })),
    roster: entrenamiento.asistencias.map((a) => ({
      id: a.deportista.id,
      nombre: a.deportista.nombre,
      apellido: a.deportista.apellido,
    })),
  };

  return (
    <div className="p-4 md:p-8">
      <div className="mb-2">
        <Link
          href="/presentismo"
          className="text-sm text-[#6B7280] hover:text-[#1C1C1C] transition-colors"
        >
          ← Presentismo
        </Link>
      </div>
      <h1
        className="text-3xl font-bold text-[#121A61] mb-6"
        style={{ fontFamily: 'Oswald, sans-serif' }}
      >
        Editar entrenamiento
      </h1>
      <PresentismoForm
        mode="edit"
        isAdmin={isAdmin}
        entrenadores={entrenadores}
        currentEntrenadorNombre={currentEntrenadorNombre}
        disciplinas={disciplinas}
        initialData={initialData}
      />
    </div>
  );
}
