import Link from 'next/link';
import { requireContexto } from '@/lib/tenant/contexto';
import { getProfesionales } from '@/lib/actions/turnos';
import TurnoForm from '../_components/TurnoForm';

export default async function NuevoTurnoPage() {
  const { rol } = await requireContexto();
  const isAdmin = rol === 'admin';

  const profesionales = isAdmin ? await getProfesionales() : [];

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
        Nuevo turno
      </h1>
      <TurnoForm mode="create" isAdmin={isAdmin} profesionales={profesionales} />
    </div>
  );
}
