import { auth, currentUser, clerkClient } from '@clerk/nextjs/server';
import { getSeguimientos } from '@/lib/queries/seguimientos';
import { getDisciplinasConCategorias } from '@/lib/queries/disciplinas';
import { getProfesionalesSeguimientos } from '@/lib/actions/seguimientos';
import type { PrioridadSeguimiento } from '@/lib/types/seguimientos';
import SeguimientosTable from './_components/SeguimientosTable';

const PAGE_SIZE = 25;
const VALID_PRIORIDADES: PrioridadSeguimiento[] = ['BAJA', 'MEDIA', 'ALTA', 'URGENTE'];

function firstParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

export default async function SeguimientosPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const { userId } = await auth();
  const user = await currentUser();
  const role = String(user?.publicMetadata?.role ?? '');
  const isAdmin = role === 'admin';
  const HEALTH_ROLES = ['medico', 'kinesiologo', 'nutricionista', 'psicologo', 'cardiologo'];
  // 'social' puede crear/editar/eliminar solo sus propios seguimientos GENERICOS
  const WRITE_ROLES = [...HEALTH_ROLES, 'social'];
  const canWrite = isAdmin || WRITE_ROLES.includes(role);

  // --- Leer filtros / paginación de la URL ---
  const pageRaw = parseInt(firstParam(sp.page) ?? '', 10);
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 0;

  const prioridadRaw = firstParam(sp.prioridad);
  const prioridad = VALID_PRIORIDADES.includes(prioridadRaw as PrioridadSeguimiento)
    ? (prioridadRaw as PrioridadSeguimiento)
    : undefined;

  const area = firstParam(sp.area) || undefined; // profesionalId
  const disciplina = firstParam(sp.disciplina) || undefined;
  const categoria = firstParam(sp.categoria) || undefined;
  const q = firstParam(sp.q)?.trim() || undefined;

  // Todos los roles ven todos los seguimientos (la regla de edición/eliminación
  // es por propiedad del registro, aplicada en el componente y en las Server Actions)
  const { items, total } = await getSeguimientos({
    page,
    pageSize: PAGE_SIZE,
    prioridad,
    profesionalId: area,
    disciplinaId: disciplina,
    categoriaId: categoria,
    search: q,
  });

  // Resolver nombres de los profesionales presentes en ESTA página
  const profesionalesMap: Record<string, string> = {};
  if (items.length > 0) {
    const uniqueIds = [...new Set(items.map((s) => s.profesionalId))];
    const client = await clerkClient();
    const users = await Promise.all(
      uniqueIds.map((id) => client.users.getUser(id).catch(() => null)),
    );
    for (const u of users) {
      if (!u) continue;
      const meta = (u.publicMetadata ?? {}) as Record<string, unknown>;
      const nombre = u.firstName || String(meta.firstName ?? '');
      const apellido = u.lastName || String(meta.lastName ?? '');
      profesionalesMap[u.id] =
        `${nombre} ${apellido}`.trim() ||
        u.emailAddresses?.[0]?.emailAddress ||
        u.id;
    }
  }

  const serialized = items.map((s) => ({
    id: s.id,
    fecha: s.fecha.toISOString().split('T')[0],
    titulo: s.titulo,
    descripcion: s.descripcion,
    recomendaciones: s.recomendaciones,
    resultadosEvaluacion: s.resultadosEvaluacion,
    prioridad: s.prioridad,
    proximaCita: s.proximaCita?.toISOString() ?? null,
    alertaSeguimiento: s.alertaSeguimiento,
    tipoSeguimiento: s.tipoSeguimiento ?? null,
    profesionalId: s.profesionalId,
    profesionalNombre: profesionalesMap[s.profesionalId] ?? s.profesionalId,
    deportistaId: s.deportista.id,
    deportistaNombre: `${s.deportista.apellido}, ${s.deportista.nombre}`,
  }));

  // Dropdown de "Área responsable" (admin): lista completa, no derivada de la página actual.
  const profesionalesRaw = isAdmin ? await getProfesionalesSeguimientos() : [];
  const profesionales = profesionalesRaw.map((p) => ({
    id: p.id,
    nombre: `${p.apellido} ${p.nombre}`.trim() || p.id,
  }));

  const disciplinas = await getDisciplinasConCategorias();

  return (
    <div className="p-4 md:p-8">
      {/* currentUserId se pasa para aplicar la regla de propiedad en botones Editar/Eliminar */}
      <SeguimientosTable
        initialSeguimientos={serialized}
        total={total}
        page={page}
        pageSize={PAGE_SIZE}
        isAdmin={isAdmin}
        canWrite={canWrite}
        currentUserId={userId!}
        profesionales={profesionales}
        currentPrioridad={prioridad ?? ''}
        currentArea={area ?? ''}
        currentSearch={q ?? ''}
        disciplinas={disciplinas}
        currentDisciplina={disciplina ?? ''}
        currentCategoria={categoria ?? ''}
      />
    </div>
  );
}
