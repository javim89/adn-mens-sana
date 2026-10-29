import { requireContexto } from '@/lib/tenant/contexto';
import DeportistasTable from './_components/DeportistasTable';

export default async function DeportistasPage() {
  const { rol: role } = await requireContexto();

  return (
    <div className="p-4 md:p-8">
      <DeportistasTable canCreate={role !== 'social'} />
    </div>
  );
}
