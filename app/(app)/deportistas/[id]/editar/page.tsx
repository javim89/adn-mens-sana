import Link from 'next/link';
import { currentUser } from '@clerk/nextjs/server';
import { getDeportistaById } from '@/lib/queries/deportistas';
import { getDisciplinasConCategorias } from '@/lib/queries/disciplinas';
import DeportistaForm from '../../_components/DeportistaForm';
import type { AppRole } from '@/lib/roles';

export default async function EditarDeportistaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [deportista, user, disciplinas] = await Promise.all([
    getDeportistaById(id),
    currentUser(),
    getDisciplinasConCategorias(),
  ]);
  const role = (user?.publicMetadata?.role as AppRole | undefined) ?? undefined;

  return (
    <div className="p-8">
      <div className="mb-2">
        <Link
          href={`/deportistas/${id}`}
          className="text-sm text-[#6B7280] hover:text-[#1C1C1C] transition-colors"
        >
          ← {deportista.apellido}, {deportista.nombre}
        </Link>
      </div>
      <h1
        className="text-3xl font-bold text-[#121A61] mb-6"
        style={{ fontFamily: 'Oswald, sans-serif' }}
      >
        Editar — {deportista.apellido}, {deportista.nombre}
      </h1>
      <DeportistaForm mode="edit" initialData={deportista} userRole={role} disciplinas={disciplinas} />
    </div>
  );
}
