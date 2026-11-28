import Link from 'next/link';
import { EncabezadoPagina } from '@/app/components/ui/encabezado-pagina';
import { requireContexto } from '@/lib/tenant/contexto';
import { getProfesionalesSeguimientos } from '@/lib/actions/seguimientos';
import { getDisciplinasConCategorias } from '@/lib/queries/disciplinas';
import SeguimientoForm from '../_components/SeguimientoForm';

export default async function NuevoSeguimientoPage() {
  const { rol: role } = await requireContexto();
  const isAdmin = role === 'admin';

  const profesionales = isAdmin ? await getProfesionalesSeguimientos() : [];
  const disciplinas = await getDisciplinasConCategorias();

  return (
    <div className="p-4 md:p-8">
      <div className="mb-2">
        <Link
          href="/seguimientos"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Seguimientos
        </Link>
      </div>
      <EncabezadoPagina className="mb-6" titulo="Nuevo seguimiento" subtitulo="Elegí el tipo y completá la evaluación." />
      <SeguimientoForm mode="create" isAdmin={isAdmin} role={role} profesionales={profesionales} disciplinas={disciplinas} />
    </div>
  );
}
