import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, Pencil } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { EncabezadoPagina } from '@/app/components/ui/encabezado-pagina';
import { getDashboard } from '@/lib/actions/insights';
import { getCategorias } from '@/lib/queries/categorias';
import DashboardView from '../_components/DashboardView';

export const dynamic = 'force-dynamic';

/** En Next 16 `params` es una Promise: hay que await-earla antes de leerla. */
export default async function DashboardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [result, categorias] = await Promise.all([getDashboard(id), getCategorias()]);

  if (!result.success) {
    notFound();
  }

  const { dashboard } = result;

  return (
    <div className="p-4 md:p-8 min-w-0">
      <Link
        href="/insights"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primario mb-2"
      >
        <ChevronLeft size={15} /> Insights
      </Link>

      <EncabezadoPagina
        className="mb-6"
        titulo={dashboard.nombre}
        subtitulo={dashboard.descripcion ?? undefined}
        accion={
          <Button asChild>
            <Link href={`/insights/${dashboard.id}/editar`}>
              <Pencil aria-hidden /> Editar
            </Link>
          </Button>
        }
      />

      <DashboardView
        dashboard={dashboard}
        categorias={categorias.map((c) => ({ id: c.id, nombre: c.nombre }))}
      />
    </div>
  );
}
