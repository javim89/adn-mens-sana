import { getCalendarioData } from '@/lib/queries/calendario';
import CalendarioView from './_components/CalendarioView';

export default async function CalendarioPage() {
  const { categorias, dias, eventos } = await getCalendarioData();

  return (
    <div className="p-4 md:p-8 min-w-0">
      <CalendarioView categorias={categorias} dias={dias} eventos={eventos} />
    </div>
  );
}
