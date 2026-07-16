import Link from 'next/link';
import { currentUser } from '@clerk/nextjs/server';
import { getProfesionalesSeguimientos } from '@/lib/actions/seguimientos';
import SeguimientoForm from '../_components/SeguimientoForm';

export default async function NuevoSeguimientoPage() {
  const user = await currentUser();
  const role = String(user?.publicMetadata?.role ?? '');
  const isAdmin = role === 'admin';

  const profesionales = isAdmin ? await getProfesionalesSeguimientos() : [];

  return (
    <div className="p-4 md:p-8">
      <div className="mb-2">
        <Link
          href="/seguimientos"
          className="text-sm text-[#6B7280] hover:text-[#1C1C1C] transition-colors"
        >
          ← Seguimientos
        </Link>
      </div>
      <h1
        className="text-3xl font-bold text-[#121A61] mb-6"
        style={{ fontFamily: 'Oswald, sans-serif' }}
      >
        Nuevo seguimiento
      </h1>
      <SeguimientoForm mode="create" isAdmin={isAdmin} role={role} profesionales={profesionales} />
    </div>
  );
}
