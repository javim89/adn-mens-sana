import type { Metadata } from 'next';
import { requireContexto } from '@/lib/tenant/contexto';
import { getNombresDeUsuarios } from '@/lib/tenant/miembros';
import { getTurnos, getTurnosPorProfesional, type TurnoRow } from '@/lib/queries/turnos';
import { getProfesionales } from '@/lib/actions/turnos';
import { ROL_LABELS } from '@/lib/roles';
import { esClaveFechaValida, hoyEnArgentina, semanaDeClave } from '@/lib/utils/fecha';
import TurnosTable, { type TurnoFila, type VistaTurnos } from './_components/TurnosTable';
import ProximosTurnos from './_components/ProximosTurnos';
import type { ProfesionalConTurnos } from './_components/TurnosPorProfesional';

export const metadata: Metadata = { title: 'Turnos' };

const PAGE_SIZE = 25;
const LIMITE_PROXIMOS = 5;

function firstParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

function serializar(t: TurnoRow, nombres: Record<string, string>): TurnoFila {
  return {
    id: t.id,
    titulo: t.titulo,
    fecha: t.fecha.toISOString().split('T')[0],
    hora: t.hora,
    lugar: t.lugar,
    descripcion: t.descripcion,
    profesionalId: t.profesionalId,
    profesionalNombre: nombres[t.profesionalId] ?? t.profesionalId,
    deportistas: t.deportistas.map((td) => ({
      id: td.deportista.id,
      nombre: td.deportista.nombre,
      apellido: td.deportista.apellido,
      categoria: td.deportista.categoria,
    })),
  };
}

export default async function TurnosPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const { userId, rol } = await requireContexto();
  const isAdmin = rol === 'admin';

  const pageRaw = parseInt(firstParam(sp.page) ?? '', 10);
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 0;

  const area = firstParam(sp.area) || undefined; // profesionalId (solo admin)
  const q = firstParam(sp.q)?.trim() || undefined;

  const hoy = hoyEnArgentina();
  const semanaParam = firstParam(sp.semana);
  const semana =
    semanaParam === 'todos'
      ? null
      : semanaDeClave(esClaveFechaValida(semanaParam) ? semanaParam : hoy);

  const vista: VistaTurnos = isAdmin && firstParam(sp.vista) === 'profesional' ? 'profesional' : 'lista';

  // Admin ve todos los turnos (opcionalmente filtrados por profesional); los no-admin solo los propios.
  const profesionalId = isAdmin ? area : userId;

  const [{ items, total }, proximosRaw, porProfesionalRaw, profesionalesRaw] = await Promise.all([
    getTurnos({
      page,
      pageSize: PAGE_SIZE,
      profesionalId,
      search: q,
      desde: semana?.desdeClave,
      hasta: semana?.hastaClave,
    }),
    getTurnos({ profesionalId: isAdmin ? undefined : userId, desde: hoy, pageSize: LIMITE_PROXIMOS }),
    vista === 'profesional'
      ? getTurnosPorProfesional(semana?.desdeClave, semana?.hastaClave)
      : Promise.resolve([]),
    isAdmin ? getProfesionales() : Promise.resolve([]),
  ]);

  const ids = [...items, ...proximosRaw.items].map((t) => t.profesionalId);
  const nombres = ids.length > 0 ? await getNombresDeUsuarios(ids) : {};

  const porProfesional: ProfesionalConTurnos[] = porProfesionalRaw.map((p) => ({
    profesionalId: p.profesionalId,
    nombre: p.nombre,
    area: p.rol ? ROL_LABELS[p.rol] : 'Sin área',
    cantidad: p.cantidad,
  }));

  const profesionales = profesionalesRaw.map((p) => ({
    id: p.id,
    nombre: `${p.apellido} ${p.nombre}`.trim() || p.id,
  }));

  return (
    <div className="p-4 md:p-8">
      <TurnosTable
        initialTurnos={items.map((t) => serializar(t, nombres))}
        total={total}
        page={page}
        pageSize={PAGE_SIZE}
        isAdmin={isAdmin}
        profesionales={profesionales}
        currentArea={area ?? ''}
        currentSearch={q ?? ''}
        semana={semana ? { desdeClave: semana.desdeClave, hastaClave: semana.hastaClave } : null}
        vista={vista}
        porProfesional={porProfesional}
        lateral={
          <ProximosTurnos turnos={proximosRaw.items.map((t) => serializar(t, nombres))} />
        }
      />
    </div>
  );
}
