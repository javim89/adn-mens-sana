import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { getDashboard } from '@/lib/actions/insights';
import DashboardEditor from '../../_components/DashboardEditor';

export const dynamic = 'force-dynamic';

export default async function EditarDashboardPage({
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
        href={`/insights/${dashboard.id}`}
        className="inline-flex items-center gap-1 text-sm text-[#6B7280] hover:text-[#121A61] mb-2"
      >
        <ChevronLeft size={15} /> {dashboard.nombre}
      </Link>

      <h1
        className="text-3xl font-bold text-[#121A61] mb-1"
        style={{ fontFamily: 'Oswald, sans-serif' }}
      >
        Editar {dashboard.nombre}
      </h1>
      <p className="text-[#6B7280] mb-6">
        Arrastrá y redimensioná los widgets. Los cambios se guardan todos juntos.
      </p>

      <DashboardEditor dashboard={dashboard} />
    </div>
  );
}
