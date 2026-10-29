import { requireContexto } from '@/lib/tenant/contexto';
import type { AppRole } from '@/lib/roles';
import { getEntrenamientos } from '@/lib/queries/presentismo';
import { getDisciplinasConCategorias } from '@/lib/queries/disciplinas';
import type { TipoSesion } from '@/lib/types/presentismo';
import PresentismoTable, {
  type EntrenamientoListItem,
} from './_components/PresentismoTable';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 25;
const ROLES_PERMITIDOS: AppRole[] = ['admin', 'entrenador'];

function firstParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

export default async function PresentismoPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const { userId, rol: role } = await requireContexto(ROLES_PERMITIDOS);

  const isAdmin = role === 'admin';

  const pageRaw = parseInt(firstParam(sp.page) ?? '', 10);
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 0;

  const disciplinaId = firstParam(sp.disciplina) || undefined;
  const tipoSesion = (firstParam(sp.tipo) as TipoSesion | undefined) || undefined;

  const { items, total } = await getEntrenamientos({
    page,
    pageSize: PAGE_SIZE,
    disciplinaId,
    tipoSesion,
    callerId: userId,
    isAdmin,
  });

  const serialized: EntrenamientoListItem[] = items.map((e) => ({
    id: e.id,
    fecha: e.fecha.toISOString().split('T')[0],
    disciplinaNombre: e.disciplina.nombre,
    categoriaNombre: e.categoria.nombre,
    tipoSesion: e.tipoSesion,
    totalAsistencias: e._count.asistencias,
    presentes: e.presentes,
  }));

  const disciplinasRaw = await getDisciplinasConCategorias();
  const disciplinas = disciplinasRaw.map((d) => ({ id: d.id, nombre: d.nombre }));

  return (
    <div className="p-4 md:p-8">
      <PresentismoTable
        items={serialized}
        total={total}
        page={page}
        pageSize={PAGE_SIZE}
        disciplinas={disciplinas}
        currentDisciplina={disciplinaId ?? ''}
        currentTipoSesion={tipoSesion ?? ''}
      />
    </div>
  );
}
