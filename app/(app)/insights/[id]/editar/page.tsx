import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { getDashboard } from '@/lib/actions/insights';
import { getCategorias } from '@/lib/queries/categorias';
import { requireContexto } from '@/lib/tenant/contexto';
import { EncabezadoPagina } from '@/app/components/ui/encabezado-pagina';
import DashboardEditor from '../../_components/DashboardEditor';

export const dynamic = 'force-dynamic';

export default async function EditarDashboardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [result, contexto, categorias] = await Promise.all([
    getDashboard(id),
    requireContexto(['admin']),
    getCategorias(),
  ]);

  if (!result.success) {
    notFound();
  }

  const { dashboard } = result;

  return (
    <div className="p-4 md:p-8 min-w-0">
      <Link
        href={`/insights/${dashboard.id}`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primario mb-2"
      >
        <ChevronLeft size={15} /> {dashboard.nombre}
      </Link>

      <EncabezadoPagina
        className="mb-6"
        titulo={`Editar ${dashboard.nombre}`}
        subtitulo="Arrastrá y redimensioná los widgets. Los cambios se guardan todos juntos."
      />

      <DashboardEditor
        dashboard={dashboard}
        permiteSql={contexto.esSuperadmin}
        categorias={categorias.map((c) => ({ id: c.id, nombre: c.nombre }))}
      />
    </div>
  );
}
