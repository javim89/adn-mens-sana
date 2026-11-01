import type { Metadata } from 'next';
import { getCalendarioData } from '@/lib/queries/calendario';
import { requireContexto } from '@/lib/tenant/contexto';
import CalendarioView from './_components/CalendarioView';

export const metadata: Metadata = { title: 'Calendario' };

export default async function CalendarioPage() {
  await requireContexto();
  const { categorias, dias, eventos } = await getCalendarioData();

  return (
    <div className="p-4 md:p-8 min-w-0">
      <CalendarioView categorias={categorias} dias={dias} eventos={eventos} />
    </div>
  );
}
