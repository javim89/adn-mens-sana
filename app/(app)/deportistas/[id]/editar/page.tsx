import Link from 'next/link';
import { requireContexto } from '@/lib/tenant/contexto';
import { getDeportistaById } from '@/lib/queries/deportistas';
import { getDisciplinasConCategorias } from '@/lib/queries/disciplinas';
import { getFotoUrl } from '@/lib/s3';
import DeportistaForm from '../../_components/DeportistaForm';

export default async function EditarDeportistaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { rol: role } = await requireContexto();
  const [deportista, disciplinas] = await Promise.all([
    getDeportistaById(id),
    getDisciplinasConCategorias(),
  ]);
  const fotoUrl = await getFotoUrl(deportista.fotoKey);

  return (
    <div className="p-4 md:p-8">
      <div className="mb-2">
        <Link
          href={`/deportistas/${id}`}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← {deportista.apellido}, {deportista.nombre}
        </Link>
      </div>
      <h1
        className="text-3xl font-bold text-primario mb-6"
        style={{ fontFamily: 'Oswald, sans-serif' }}
      >
        Editar — {deportista.apellido}, {deportista.nombre}
      </h1>
      <DeportistaForm
        mode="edit"
        initialData={deportista}
        fotoUrl={fotoUrl}
        userRole={role}
        disciplinas={disciplinas}
      />
    </div>
  );
}
