import type { Metadata } from 'next';
import { getDistribucionTriage } from '@/lib/queries/triage';
import { requireContexto } from '@/lib/tenant/contexto';
import { semanaActual } from '@/lib/utils/fecha';
import DeportistasTable from './_components/DeportistasTable';
import DistribucionTriagePanel from './_components/DistribucionTriagePanel';

export const metadata: Metadata = { title: 'Deportistas' };

export default async function DeportistasPage() {
  const { rol: role } = await requireContexto();
  const distribucion = await getDistribucionTriage(semanaActual().desdeInstante);

  return (
    <div className="p-4 md:p-8">
      <DeportistasTable
        canCreate={role !== 'social'}
        lateral={<DistribucionTriagePanel datos={distribucion} />}
      />
    </div>
  );
}
