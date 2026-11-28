import type { Metadata } from 'next';
import { requireContexto } from '@/lib/tenant/contexto';
import { getNombresDeUsuarios } from '@/lib/tenant/miembros';
import {
  getConteoPorTipoSeguimiento,
  getSeguimientos,
  parsePrioridades,
  parseTipoSeguimiento,
  TIPOS_SEGUIMIENTO,
} from '@/lib/queries/seguimientos';
import { getResumenTurnos } from '@/lib/queries/dashboard';
import { getDisciplinasConCategorias } from '@/lib/queries/disciplinas';
import { getProfesionalesSeguimientos } from '@/lib/actions/seguimientos';
import { getNavItemsForRole } from '@/lib/roles';
import { fechaDbDesdeClave, hoyEnArgentina, semanaActual } from '@/lib/utils/fecha';
import type { TipoSeguimiento } from '@/lib/types/seguimientos';
import SeguimientosTable from './_components/SeguimientosTable';
import PanelPorTipo from './_components/PanelPorTipo';
import PanelProximosTurnos from './_components/PanelProximosTurnos';

export const metadata: Metadata = { title: 'Seguimientos' };

const PAGE_SIZE = 25;
const LIMITE_TURNOS = 3;

type SearchParams = Record<string, string | string[] | undefined>;

function firstParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

/** El listado con los filtros actuales y `tipo` (o sin él, si ya es el activo), en la página 1. */
function hrefConTipo(sp: SearchParams, tipo: TipoSeguimiento, activo: boolean): string {
  const params = new URLSearchParams();
  for (const [clave, valor] of Object.entries(sp)) {
    if (clave === 'page' || clave === 'tipo' || valor === undefined) continue;
    for (const v of Array.isArray(valor) ? valor : [valor]) params.append(clave, v);
  }
  if (!activo) params.set('tipo', tipo);
  const qs = params.toString();
  return qs ? `/seguimientos?${qs}` : '/seguimientos';
}

export default async function SeguimientosPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const { userId, rol: role } = await requireContexto();
  const isAdmin = role === 'admin';
  const HEALTH_ROLES = ['medico', 'kinesiologo', 'nutricionista', 'psicologo', 'cardiologo'];
  // 'social' puede crear/editar/eliminar solo sus propios seguimientos GENERICOS
  const WRITE_ROLES = [...HEALTH_ROLES, 'social'];
  const canWrite = isAdmin || WRITE_ROLES.includes(role);
  const veTurnos = getNavItemsForRole(role).some((i) => i.href === '/turnos');

  // --- Leer filtros / paginación de la URL ---
  const pageRaw = parseInt(firstParam(sp.page) ?? '', 10);
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 0;

  // Acepta un solo valor (links del dashboard), repetido o separado por comas.
  const prioridades = parsePrioridades(sp.prioridad);
  const tipo = parseTipoSeguimiento(sp.tipo);
  const area = firstParam(sp.area) || undefined; // profesionalId
  const disciplina = firstParam(sp.disciplina) || undefined;
  const categoria = firstParam(sp.categoria) || undefined;
  const q = firstParam(sp.q)?.trim() || undefined;

  const filtros = {
    prioridad: prioridades,
    profesionalId: area,
    disciplinaId: disciplina,
    categoriaId: categoria,
    search: q,
  };

  // Todos los roles ven todos los seguimientos (la regla de edición/eliminación
  // es por propiedad del registro, aplicada en el componente y en las Server Actions)
  const semana = semanaActual();
  const [{ items, total }, conteo, turnos, disciplinas, profesionalesRaw] = await Promise.all([
    getSeguimientos({ ...filtros, tipoSeguimiento: tipo, page, pageSize: PAGE_SIZE }),
    getConteoPorTipoSeguimiento(filtros),
    veTurnos
      ? getResumenTurnos({
          rango: { desdeDb: semana.desdeDb, finExclusivoDb: semana.finExclusivoDb },
          desdeHoyDb: fechaDbDesdeClave(hoyEnArgentina()),
          // Mismo scoping que /turnos: admin ve todos, el resto solo los propios.
          profesionalId: isAdmin ? undefined : userId,
          limite: LIMITE_TURNOS,
        })
      : null,
    getDisciplinasConCategorias(),
    // Filtro "Profesional" (admin): lista completa, no derivada de la página actual.
    isAdmin ? getProfesionalesSeguimientos() : Promise.resolve([]),
  ]);

  // Resolver nombres de los profesionales presentes en ESTA página
  const profesionalesMap =
    items.length > 0 ? await getNombresDeUsuarios(items.map((s) => s.profesionalId)) : {};

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
    deportistas: s.deportistas.map((x) => x.deportista),
  }));

  const profesionales = profesionalesRaw.map((p) => ({
    id: p.id,
    nombre: `${p.apellido} ${p.nombre}`.trim() || p.id,
  }));

  const filasPorTipo = TIPOS_SEGUIMIENTO.map((t) => ({
    tipo: t,
    cantidad: conteo.porTipo[t],
    activo: t === tipo,
    href: hrefConTipo(sp, t, t === tipo),
  }));

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
        currentUserId={userId}
        profesionales={profesionales}
        currentPrioridades={prioridades}
        currentTipo={tipo ?? null}
        currentArea={area ?? ''}
        currentSearch={q ?? ''}
        disciplinas={disciplinas}
        currentDisciplina={disciplina ?? ''}
        currentCategoria={categoria ?? ''}
        lateral={
          <>
            <PanelPorTipo filas={filasPorTipo} total={conteo.total} />
            {turnos && <PanelProximosTurnos turnos={turnos.proximos} />}
          </>
        }
      />
    </div>
  );
}
