import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Pencil } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { requireContexto } from '@/lib/tenant/contexto';
import type { AppRole } from '@/lib/roles';
import { getConvocatoriaById } from '@/lib/queries/convocatorias';
import DeleteConvocatoriaModal from '../_components/DeleteConvocatoriaModal';
import DetalleConvocatoria from '../_components/DetalleConvocatoria';
import { tituloPartido } from '../_lib/formato';

interface Props {
  params: Promise<{ id: string }>;
}

const ROLES_PERMITIDOS: AppRole[] = ['admin', 'entrenador'];

export default async function ConvocatoriaDetallePage({ params }: Props) {
  const { id } = await params;

  const { userId, rol: role } = await requireContexto(ROLES_PERMITIDOS);

  const convocatoria = await getConvocatoriaById(id);
  if (!convocatoria) notFound();

  const canModify = role === 'admin' || convocatoria.registradoPor === userId;

  return (
    <div className="p-4 md:p-8">
      <div className="mb-4">
        <Link
          href="/convocatorias"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={14} aria-hidden />
          Convocatorias
        </Link>
      </div>

      <DetalleConvocatoria
        convocatoria={convocatoria}
        acciones={
          canModify && (
            <>
              <Button variant="outline" asChild>
                <Link href={`/convocatorias/${id}/editar`}>
                  <Pencil />
                  Editar
                </Link>
              </Button>
              <DeleteConvocatoriaModal
                convocatoriaId={id}
                convocatoriaLabel={tituloPartido(convocatoria.partido)}
                redirectAfterDelete="/convocatorias"
              />
            </>
          )
        }
      />
    </div>
  );
}
