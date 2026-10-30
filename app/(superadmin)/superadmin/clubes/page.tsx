import type { Metadata } from 'next';
import { getClubes } from '@/lib/actions/superadmin';
import ClubesTable from './_components/ClubesTable';
import CrearClubForm from './_components/CrearClubForm';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'Clubes' };

export default async function ClubesPage() {
  // El layout del grupo ya validó que es superadmin.
  const clubes = await getClubes();

  return (
    <div className="mx-auto max-w-6xl p-4 md:p-8">
      <h1 className="mb-1 font-[family-name:var(--font-oswald)] text-3xl font-bold text-primario">Clubes</h1>
      <p className="mb-6 text-muted-foreground">Alta y estado de los clubes de BioTeam</p>

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem] lg:items-start">
        <ClubesTable clubes={clubes} />
        <CrearClubForm />
      </div>
    </div>
  );
}
