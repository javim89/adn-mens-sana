import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { currentUser } from '@clerk/nextjs/server';
import { getConvocatoriaById } from '@/lib/queries/convocatorias';
import { getDisciplinasConCategorias } from '@/lib/queries/disciplinas';
import ConvocatoriaForm, {
  type ConvocatoriaInitialData,
} from '../../_components/ConvocatoriaForm';

interface Props {
  params: Promise<{ id: string }>;
}

const ROLES_PERMITIDOS = ['admin', 'entrenador'];

export default async function EditarConvocatoriaPage({ params }: Props) {
  const { id } = await params;

  const user = await currentUser();
  const role = String(user?.publicMetadata?.role ?? '');

  if (!ROLES_PERMITIDOS.includes(role)) {
    redirect('/dashboard');
  }

  const convocatoria = await getConvocatoriaById(id);
  if (!convocatoria) notFound();

  const disciplinas = await getDisciplinasConCategorias();

  const initialData: ConvocatoriaInitialData = {
    id: convocatoria.id,
    disciplinaId: convocatoria.disciplinaId,
    categoriaId: convocatoria.categoriaId,
    eventoTorneoId: convocatoria.eventoTorneoId,
    horaCitacion: convocatoria.horaCitacion ?? undefined,
    lugar: convocatoria.lugar ?? undefined,
    observaciones: convocatoria.observaciones ?? undefined,
    convocados: convocatoria.convocados.map((c) => c.id),
    partido: {
      eventoTorneoId: convocatoria.eventoTorneoId,
      fecha: convocatoria.partido.fecha,
      local: convocatoria.partido.local,
      visitante: convocatoria.partido.visitante,
      estado: convocatoria.partido.estado,
    },
  };

  return (
    <div className="p-4 md:p-8">
      <div className="mb-2">
        <Link
          href="/convocatorias"
          className="text-sm text-[#6B7280] hover:text-[#1C1C1C] transition-colors"
        >
          ← Convocatorias
        </Link>
      </div>
      <h1
        className="text-3xl font-bold text-[#121A61] mb-6"
        style={{ fontFamily: 'Oswald, sans-serif' }}
      >
        Editar convocatoria
      </h1>
      <ConvocatoriaForm mode="edit" disciplinas={disciplinas} initialData={initialData} />
    </div>
  );
}
