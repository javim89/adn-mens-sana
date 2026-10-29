import Link from 'next/link';
import { currentUser } from '@clerk/nextjs/server';
import { requireContexto } from '@/lib/tenant/contexto';
import type { AppRole } from '@/lib/roles';
import { getDisciplinasConCategorias } from '@/lib/queries/disciplinas';
import { getEntrenadores } from '@/lib/actions/presentismo';
import PresentismoForm from '../_components/PresentismoForm';

const ROLES_PERMITIDOS: AppRole[] = ['admin', 'entrenador'];

export default async function NuevoEntrenamientoPage() {
  const { rol: role } = await requireContexto(ROLES_PERMITIDOS);
  // Solo para mostrar el nombre del entrenador logueado; el rol sale del contexto.
  const user = await currentUser();

  const isAdmin = role === 'admin';

  const [disciplinas, entrenadores] = await Promise.all([
    getDisciplinasConCategorias(),
    getEntrenadores(),
  ]);

  const currentEntrenadorNombre =
    `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim() ||
    user?.emailAddresses?.[0]?.emailAddress ||
    '';

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
        Nuevo entrenamiento
      </h1>
      <PresentismoForm
        mode="create"
        isAdmin={isAdmin}
        entrenadores={entrenadores}
        currentEntrenadorNombre={currentEntrenadorNombre}
        disciplinas={disciplinas}
      />
    </div>
  );
}
