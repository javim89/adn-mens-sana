import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireContexto } from '@/lib/tenant/contexto';
import { getDisciplinasConCategorias } from '@/lib/queries/disciplinas';
import DeportistaForm from '../_components/DeportistaForm';

export default async function NuevoDeportistaPage() {
  const { rol: role } = await requireContexto();
  if (role === 'social') redirect('/deportistas');

  const disciplinas = await getDisciplinasConCategorias();

  return (
    <div className="p-8">
      <div className="mb-2">
        <Link
          href="/deportistas"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Deportistas
        </Link>
      </div>
      <h1
        className="text-3xl font-bold text-primario mb-6"
        style={{ fontFamily: 'Oswald, sans-serif' }}
      >
        Nuevo deportista
      </h1>
      <DeportistaForm mode="create" disciplinas={disciplinas} />
    </div>
  );
}
