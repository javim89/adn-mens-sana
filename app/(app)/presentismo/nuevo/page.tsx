import Link from 'next/link';
import { redirect } from 'next/navigation';
import { currentUser } from '@clerk/nextjs/server';
import { getDisciplinasConCategorias } from '@/lib/queries/disciplinas';
import { getEntrenadores } from '@/lib/actions/presentismo';
import PresentismoForm from '../_components/PresentismoForm';

const ROLES_PERMITIDOS = ['admin', 'entrenador'];

export default async function NuevoEntrenamientoPage() {
  const user = await currentUser();
  const role = String(user?.publicMetadata?.role ?? '');

  if (!ROLES_PERMITIDOS.includes(role)) {
    redirect('/dashboard');
  }

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
