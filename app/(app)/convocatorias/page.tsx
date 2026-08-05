import { auth, currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { getConvocatorias } from '@/lib/queries/convocatorias';
import { getDisciplinasConCategorias } from '@/lib/queries/disciplinas';
import { toDateString } from '@/lib/queries/calendario';
import ConvocatoriasTable, {
  type ConvocatoriaListItem,
} from './_components/ConvocatoriasTable';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 25;
const ROLES_PERMITIDOS = ['admin', 'entrenador'];

function firstParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

export default async function ConvocatoriasPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const { userId } = await auth();
  const user = await currentUser();
  const role = String(user?.publicMetadata?.role ?? '');

  if (!ROLES_PERMITIDOS.includes(role)) {
    redirect('/dashboard');
  }

  const isAdmin = role === 'admin';

  const pageRaw = parseInt(firstParam(sp.page) ?? '', 10);
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 0;

  const disciplinaId = firstParam(sp.disciplina) || undefined;
  const categoriaId = firstParam(sp.categoria) || undefined;

  const { items, total } = await getConvocatorias({
    page,
    pageSize: PAGE_SIZE,
    disciplinaId,
    categoriaId,
    callerId: userId!,
    isAdmin,
  });

  const serialized: ConvocatoriaListItem[] = items.map((c) => ({
    id: c.id,
    fecha: toDateString(c.evento.dia.fecha),
    disciplinaNombre: c.disciplina.nombre,
    categoriaNombre: c.categoria.nombre,
    rival: `${c.evento.local.nombre} vs ${c.evento.visitante.nombre}`,
    totalConvocados: c._count.convocados,
  }));

  const disciplinasRaw = await getDisciplinasConCategorias();

  return (
    <div className="p-4 md:p-8">
      <ConvocatoriasTable
        items={serialized}
        total={total}
        page={page}
        pageSize={PAGE_SIZE}
        disciplinas={disciplinasRaw}
        currentDisciplina={disciplinaId ?? ''}
        currentCategoria={categoriaId ?? ''}
      />
    </div>
  );
}
