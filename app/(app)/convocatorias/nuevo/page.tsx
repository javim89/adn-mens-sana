import Link from 'next/link';
import { requireContexto } from '@/lib/tenant/contexto';
import type { AppRole } from '@/lib/roles';
import { getDisciplinasConCategorias } from '@/lib/queries/disciplinas';
import ConvocatoriaForm from '../_components/ConvocatoriaForm';

const ROLES_PERMITIDOS: AppRole[] = ['admin', 'entrenador'];

export default async function NuevaConvocatoriaPage() {
  await requireContexto(ROLES_PERMITIDOS);

  const disciplinas = await getDisciplinasConCategorias();

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
        Nueva convocatoria
      </h1>
      <ConvocatoriaForm mode="create" disciplinas={disciplinas} />
    </div>
  );
}
