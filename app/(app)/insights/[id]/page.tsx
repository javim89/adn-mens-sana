import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, Pencil } from 'lucide-react';
import { getDashboard } from '@/lib/actions/insights';
import DashboardView from '../_components/DashboardView';

export const dynamic = 'force-dynamic';

/** En Next 16 `params` es una Promise: hay que await-earla antes de leerla. */
export default async function DashboardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await getDashboard(id);

  if (!result.success) {
    notFound();
  }

  const { dashboard } = result;

  return (
    <div className="p-4 sm:p-8 min-w-0">
      <Link
        href="/insights"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primario mb-2"
      >
        <ChevronLeft size={15} /> Insights
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div className="min-w-0">
          <h1
            className="text-3xl font-bold text-primario"
            style={{ fontFamily: 'Oswald, sans-serif' }}
          >
            {dashboard.nombre}
          </h1>
          {dashboard.descripcion && (
            <p className="text-muted-foreground mt-0.5">{dashboard.descripcion}</p>
          )}
        </div>

        <Link
          href={`/insights/${dashboard.id}/editar`}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primario text-white text-sm hover:bg-primario-hover transition-colors"
        >
          <Pencil size={15} /> Editar
        </Link>
      </div>

      <DashboardView dashboard={dashboard} />
    </div>
  );
}
