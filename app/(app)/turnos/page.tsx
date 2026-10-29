import { requireContexto } from '@/lib/tenant/contexto';
import { getNombresDeUsuarios } from '@/lib/tenant/miembros';
import { getTurnos } from '@/lib/queries/turnos';
import { getProfesionales } from '@/lib/actions/turnos';
import TurnosTable from './_components/TurnosTable';
import type { TurnoListItem } from '@/lib/types/turnos';

const PAGE_SIZE = 25;

function firstParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

export default async function TurnosPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const { userId, rol } = await requireContexto();
  const isAdmin = rol === 'admin';

  // --- Leer filtros / paginación de la URL ---
  const pageRaw = parseInt(firstParam(sp.page) ?? '', 10);
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 0;

  const area = firstParam(sp.area) || undefined; // profesionalId (solo admin)
  const q = firstParam(sp.q)?.trim() || undefined;

  // Admin ve todos los turnos (opcionalmente filtrados por área responsable);
  // los no-admin solo ven los propios.
  const profesionalId = isAdmin ? area : userId;

  const { items, total } = await getTurnos({
    page,
    pageSize: PAGE_SIZE,
    profesionalId,
    search: q,
  });

  // Resolver nombres de los profesionales presentes en ESTA página (solo admin).
  const profesionalesMap =
    isAdmin && items.length > 0
      ? await getNombresDeUsuarios(items.map((t) => t.profesionalId))
      : {};

  const serialized: TurnoListItem[] = items.map((t) => ({
    id: t.id,
    titulo: t.titulo,
    fecha: t.fecha.toISOString().split('T')[0],
    hora: t.hora,
    lugar: t.lugar,
    descripcion: t.descripcion,
    profesionalId: t.profesionalId,
    profesionalNombre: profesionalesMap[t.profesionalId] ?? t.profesionalId,
    deportistas: t.deportistas.map((td) => ({
      id: td.deportista.id,
      nombre: td.deportista.nombre,
      apellido: td.deportista.apellido,
    })),
  }));

  // Dropdown de "Área responsable" (admin): lista completa, no derivada de la página.
  const profesionalesRaw = isAdmin ? await getProfesionales() : [];
  const profesionales = profesionalesRaw.map((p) => ({
    id: p.id,
    nombre: `${p.apellido} ${p.nombre}`.trim() || p.id,
  }));

  return (
    <div className="p-4 md:p-8">
      <TurnosTable
        initialTurnos={serialized}
        total={total}
        page={page}
        pageSize={PAGE_SIZE}
        isAdmin={isAdmin}
        profesionales={profesionales}
        currentArea={area ?? ''}
        currentSearch={q ?? ''}
      />
    </div>
  );
}
