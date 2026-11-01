import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { getDashboard } from '@/lib/actions/insights';
import { requireContexto } from '@/lib/tenant/contexto';
import DashboardEditor from '../../_components/DashboardEditor';

export const dynamic = 'force-dynamic';

export default async function EditarDashboardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [result, contexto] = await Promise.all([getDashboard(id), requireContexto(['admin'])]);

  if (!result.success) {
    notFound();
  }

  const { dashboard } = result;

  return (
    <div className="p-4 sm:p-8 min-w-0">
      <Link
        href={`/insights/${dashboard.id}`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primario mb-2"
      >
        <ChevronLeft size={15} /> {dashboard.nombre}
      </Link>

      <h1
        className="text-3xl font-bold text-primario mb-1"
        style={{ fontFamily: 'Oswald, sans-serif' }}
      >
        Editar {dashboard.nombre}
      </h1>
      <p className="text-muted-foreground mb-6">
        Arrastrá y redimensioná los widgets. Los cambios se guardan todos juntos.
      </p>

      <DashboardEditor dashboard={dashboard} permiteSql={contexto.esSuperadmin} />
    </div>
  );
}
