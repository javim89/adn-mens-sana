'use server';

/**
 * CRUD de dashboards, widgets y filtros de Insights.
 *
 * La ejecución de queries va por `POST /api/insights/query` (el dashboard
 * resuelve N widgets en paralelo y necesita la caché de TanStack Query); acá
 * solo vive la persistencia, que sí se beneficia de `revalidatePath`.
 *
 * Todo lo que llega del cliente pasa por los schemas de `lib/insights/schemas`
 * antes de tocar la base: un `querySpec` con un dataset inexistente guardado en
 * un widget es una bomba de tiempo que revienta recién al renderizar.
 */

import { auth, currentUser } from '@clerk/nextjs/server';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import {
  dashboardInputSchema,
  dashboardLayoutSchema,
  filterInputSchema,
  formatZodError,
  widgetInputSchema,
  type DashboardInput,
  type FilterInput,
  type WidgetInput,
} from '@/lib/insights/schemas';
import type { InsightsSpec } from '@/lib/insights/types';
import type { VizId } from '@/lib/insights/visualizations';
import type { Prisma } from '@/lib/generated/prisma/client';

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

type Ok<T> = { success: true } & T;
type Fail = { success: false; error: string };
export type ActionResult<T = object> = Ok<T> | Fail;

export type DashboardListItem = {
  id: string;
  slug: string;
  nombre: string;
  descripcion: string | null;
  esSistema: boolean;
  orden: number;
  widgetCount: number;
  updatedAt: Date;
};

export type DashboardWidget = {
  id: string;
  titulo: string;
  descripcion: string | null;
  tipo: VizId;
  querySpec: InsightsSpec;
  vizConfig: Record<string, unknown>;
  x: number;
  y: number;
  w: number;
  h: number;
};

export type DashboardFilter = {
  id: string;
  label: string;
  dataset: string;
  dimension: string;
  operator: string;
  valorDefault: unknown;
  orden: number;
  widgetIds: string[];
};

export type DashboardDetail = {
  id: string;
  slug: string;
  nombre: string;
  descripcion: string | null;
  esSistema: boolean;
  orden: number;
  widgets: DashboardWidget[];
  filtros: DashboardFilter[];
};

// ---------------------------------------------------------------------------
// Guard
// ---------------------------------------------------------------------------

async function assertAdmin(): Promise<Fail | { success: true; userId: string }> {
  const { userId } = await auth();
  if (!userId) return { success: false, error: 'No autorizado' };
  const user = await currentUser();
  if (user?.publicMetadata?.role !== 'admin') {
    return { success: false, error: 'Acceso denegado: se requiere rol admin' };
  }
  return { success: true, userId };
}

function fail(error: unknown, fallback: string): Fail {
  return { success: false, error: error instanceof Error ? error.message : fallback };
}

// ---------------------------------------------------------------------------
// Mapeo Prisma → DTO
// ---------------------------------------------------------------------------

type WidgetRow = {
  id: string;
  titulo: string;
  descripcion: string | null;
  tipo: string;
  querySpec: unknown;
  vizConfig: unknown;
  x: number;
  y: number;
  w: number;
  h: number;
};

function toWidget(row: WidgetRow): DashboardWidget {
  return {
    id: row.id,
    titulo: row.titulo,
    descripcion: row.descripcion,
    tipo: row.tipo as VizId,
    querySpec: row.querySpec as InsightsSpec,
    vizConfig: (row.vizConfig ?? {}) as Record<string, unknown>,
    x: row.x,
    y: row.y,
    w: row.w,
    h: row.h,
  };
}

type FilterRow = {
  id: string;
  label: string;
  dataset: string;
  dimension: string;
  operator: string;
  valorDefault: unknown;
  orden: number;
  targets: { widgetId: string }[];
};

function toFilter(row: FilterRow): DashboardFilter {
  return {
    id: row.id,
    label: row.label,
    dataset: row.dataset,
    dimension: row.dimension,
    operator: row.operator,
    valorDefault: row.valorDefault ?? null,
    orden: row.orden,
    widgetIds: row.targets.map((t) => t.widgetId),
  };
}

function asJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

// ---------------------------------------------------------------------------
// Slugs
// ---------------------------------------------------------------------------

function slugify(nombre: string): string {
  const base = nombre
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return base || 'dashboard';
}

async function uniqueSlug(nombre: string): Promise<string> {
  const base = slugify(nombre);
  const taken = await prisma.insightsDashboard.findMany({
    where: { slug: { startsWith: base } },
    select: { slug: true },
  });
  const used = new Set(taken.map((row) => row.slug));
  if (!used.has(base)) return base;
  let n = 2;
  while (used.has(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}

async function nextOrden(): Promise<number> {
  const last = await prisma.insightsDashboard.findFirst({
    orderBy: { orden: 'desc' },
    select: { orden: true },
  });
  return (last?.orden ?? 0) + 1;
}

// ---------------------------------------------------------------------------
// Dashboards
// ---------------------------------------------------------------------------

export async function getDashboards(): Promise<
  ActionResult<{ dashboards: DashboardListItem[] }>
> {
  try {
    const guard = await assertAdmin();
    if (!guard.success) return guard;

    const rows = await prisma.insightsDashboard.findMany({
      orderBy: [{ orden: 'asc' }, { nombre: 'asc' }],
      select: {
        id: true,
        slug: true,
        nombre: true,
        descripcion: true,
        esSistema: true,
        orden: true,
        updatedAt: true,
        _count: { select: { widgets: true } },
      },
    });

    return {
      success: true,
      dashboards: rows.map((row) => ({
        id: row.id,
        slug: row.slug,
        nombre: row.nombre,
        descripcion: row.descripcion,
        esSistema: row.esSistema,
        orden: row.orden,
        widgetCount: row._count.widgets,
        updatedAt: row.updatedAt,
      })),
    };
  } catch (error) {
    console.error('getDashboards error:', error);
    return fail(error, 'Error al listar los dashboards');
  }
}

/** Acepta el cuid o el slug — la vista del dashboard por defecto usa el slug. */
export async function getDashboard(
  id: string,
): Promise<ActionResult<{ dashboard: DashboardDetail }>> {
  try {
    const guard = await assertAdmin();
    if (!guard.success) return guard;

    const row = await prisma.insightsDashboard.findFirst({
      where: { OR: [{ id }, { slug: id }] },
      include: {
        widgets: { orderBy: [{ y: 'asc' }, { x: 'asc' }] },
        filtros: { orderBy: { orden: 'asc' }, include: { targets: true } },
      },
    });
    if (!row) return { success: false, error: 'Dashboard no encontrado' };

    return {
      success: true,
      dashboard: {
        id: row.id,
        slug: row.slug,
        nombre: row.nombre,
        descripcion: row.descripcion,
        esSistema: row.esSistema,
        orden: row.orden,
        widgets: row.widgets.map(toWidget),
        filtros: row.filtros.map(toFilter),
      },
    };
  } catch (error) {
    console.error('getDashboard error:', error);
    return fail(error, 'Error al obtener el dashboard');
  }
}

export async function createDashboard(
  input: DashboardInput,
): Promise<ActionResult<{ id: string; slug: string }>> {
  try {
    const guard = await assertAdmin();
    if (!guard.success) return guard;

    const parsed = dashboardInputSchema.safeParse(input);
    if (!parsed.success) return { success: false, error: formatZodError(parsed.error) };

    const created = await prisma.insightsDashboard.create({
      data: {
        slug: await uniqueSlug(parsed.data.nombre),
        nombre: parsed.data.nombre,
        descripcion: parsed.data.descripcion ?? null,
        orden: await nextOrden(),
        creadoPor: guard.userId,
      },
      select: { id: true, slug: true },
    });

    revalidatePath('/insights');
    return { success: true, id: created.id, slug: created.slug };
  } catch (error) {
    console.error('createDashboard error:', error);
    return fail(error, 'Error al crear el dashboard');
  }
}

export async function updateDashboard(
  id: string,
  input: DashboardInput,
): Promise<ActionResult> {
  try {
    const guard = await assertAdmin();
    if (!guard.success) return guard;

    const parsed = dashboardInputSchema.safeParse(input);
    if (!parsed.success) return { success: false, error: formatZodError(parsed.error) };

    const existing = await prisma.insightsDashboard.findUnique({ where: { id } });
    if (!existing) return { success: false, error: 'Dashboard no encontrado' };

    await prisma.insightsDashboard.update({
      where: { id },
      data: {
        nombre: parsed.data.nombre,
        descripcion: parsed.data.descripcion ?? null,
      },
    });

    revalidatePath('/insights');
    return { success: true };
  } catch (error) {
    console.error('updateDashboard error:', error);
    return fail(error, 'Error al actualizar el dashboard');
  }
}

export async function deleteDashboard(id: string): Promise<ActionResult> {
  try {
    const guard = await assertAdmin();
    if (!guard.success) return guard;

    const existing = await prisma.insightsDashboard.findUnique({ where: { id } });
    if (!existing) return { success: false, error: 'Dashboard no encontrado' };
    if (existing.esSistema) {
      return { success: false, error: 'No se puede eliminar un dashboard del sistema' };
    }

    await prisma.insightsDashboard.delete({ where: { id } });

    revalidatePath('/insights');
    return { success: true };
  } catch (error) {
    console.error('deleteDashboard error:', error);
    return fail(error, 'Error al eliminar el dashboard');
  }
}

export async function duplicateDashboard(
  id: string,
): Promise<ActionResult<{ id: string; slug: string }>> {
  try {
    const guard = await assertAdmin();
    if (!guard.success) return guard;

    const source = await prisma.insightsDashboard.findUnique({
      where: { id },
      include: {
        widgets: true,
        filtros: { include: { targets: true } },
      },
    });
    if (!source) return { success: false, error: 'Dashboard no encontrado' };

    const nombre = `${source.nombre} (copia)`;
    const slug = await uniqueSlug(nombre);
    const orden = await nextOrden();
    const creadoPor = guard.userId;

    const created = await prisma.$transaction(async (tx) => {
      const dashboard = await tx.insightsDashboard.create({
        data: {
          slug,
          nombre,
          descripcion: source.descripcion,
          orden,
          esSistema: false,
          creadoPor,
        },
        select: { id: true, slug: true },
      });

      const widgetIdMap = new Map<string, string>();
      for (const widget of source.widgets) {
        const copy = await tx.insightsWidget.create({
          data: {
            dashboardId: dashboard.id,
            titulo: widget.titulo,
            descripcion: widget.descripcion,
            tipo: widget.tipo,
            querySpec: asJson(widget.querySpec),
            vizConfig: asJson(widget.vizConfig),
            x: widget.x,
            y: widget.y,
            w: widget.w,
            h: widget.h,
          },
          select: { id: true },
        });
        widgetIdMap.set(widget.id, copy.id);
      }

      for (const filtro of source.filtros) {
        await tx.insightsFilter.create({
          data: {
            dashboardId: dashboard.id,
            label: filtro.label,
            dataset: filtro.dataset,
            dimension: filtro.dimension,
            operator: filtro.operator,
            valorDefault:
              filtro.valorDefault === null ? undefined : asJson(filtro.valorDefault),
            orden: filtro.orden,
            targets: {
              createMany: {
                data: filtro.targets
                  .map((t) => widgetIdMap.get(t.widgetId))
                  .filter((widgetId): widgetId is string => Boolean(widgetId))
                  .map((widgetId) => ({ widgetId })),
              },
            },
          },
        });
      }

      return dashboard;
    });

    revalidatePath('/insights');
    return { success: true, id: created.id, slug: created.slug };
  } catch (error) {
    console.error('duplicateDashboard error:', error);
    return fail(error, 'Error al duplicar el dashboard');
  }
}

// ---------------------------------------------------------------------------
// Widgets
// ---------------------------------------------------------------------------

/**
 * Persiste el draft completo del editor en una transacción: crea los widgets
 * nuevos, actualiza los existentes y borra los que ya no están.
 *
 * Un `id` que no pertenece al dashboard se trata como widget nuevo — el editor
 * usa ids temporales para los widgets que todavía no se guardaron. Por eso la
 * respuesta devuelve los widgets persistidos **en el mismo orden** que la
 * entrada: es lo que le permite al cliente remapear sus ids temporales.
 */
export async function saveDashboardLayout(
  id: string,
  widgets: WidgetInput[],
): Promise<ActionResult<{ widgets: DashboardWidget[] }>> {
  try {
    const guard = await assertAdmin();
    if (!guard.success) return guard;

    const parsed = dashboardLayoutSchema.safeParse(widgets);
    if (!parsed.success) return { success: false, error: formatZodError(parsed.error) };

    const dashboard = await prisma.insightsDashboard.findUnique({ where: { id } });
    if (!dashboard) return { success: false, error: 'Dashboard no encontrado' };

    const saved = await prisma.$transaction(async (tx) => {
      const existing = await tx.insightsWidget.findMany({
        where: { dashboardId: id },
        select: { id: true },
      });
      const existingIds = new Set(existing.map((w) => w.id));
      const keptIds = new Set<string>();
      const result: DashboardWidget[] = [];

      for (const widget of parsed.data) {
        const data = {
          titulo: widget.titulo,
          descripcion: widget.descripcion ?? null,
          tipo: widget.vizConfig.type,
          querySpec: asJson(widget.querySpec),
          vizConfig: asJson(widget.vizConfig),
          x: widget.x,
          y: widget.y,
          w: widget.w,
          h: widget.h,
        };

        if (widget.id && existingIds.has(widget.id)) {
          const updated = await tx.insightsWidget.update({
            where: { id: widget.id },
            data,
          });
          keptIds.add(updated.id);
          result.push(toWidget(updated));
        } else {
          const created = await tx.insightsWidget.create({
            data: { dashboardId: id, ...data },
          });
          result.push(toWidget(created));
        }
      }

      const removed = [...existingIds].filter((widgetId) => !keptIds.has(widgetId));
      if (removed.length > 0) {
        await tx.insightsWidget.deleteMany({ where: { id: { in: removed } } });
      }

      return result;
    });

    revalidatePath('/insights');
    return { success: true, widgets: saved };
  } catch (error) {
    console.error('saveDashboardLayout error:', error);
    return fail(error, 'Error al guardar el dashboard');
  }
}

export async function saveWidget(
  dashboardId: string,
  widget: WidgetInput,
): Promise<ActionResult<{ widget: DashboardWidget }>> {
  try {
    const guard = await assertAdmin();
    if (!guard.success) return guard;

    const parsed = widgetInputSchema.safeParse(widget);
    if (!parsed.success) return { success: false, error: formatZodError(parsed.error) };

    const dashboard = await prisma.insightsDashboard.findUnique({
      where: { id: dashboardId },
    });
    if (!dashboard) return { success: false, error: 'Dashboard no encontrado' };

    const input = parsed.data;
    const data = {
      titulo: input.titulo,
      descripcion: input.descripcion ?? null,
      tipo: input.vizConfig.type,
      querySpec: asJson(input.querySpec),
      vizConfig: asJson(input.vizConfig),
      x: input.x,
      y: input.y,
      w: input.w,
      h: input.h,
    };

    const existing = input.id
      ? await prisma.insightsWidget.findUnique({ where: { id: input.id } })
      : null;

    const saved =
      existing && existing.dashboardId === dashboardId
        ? await prisma.insightsWidget.update({ where: { id: existing.id }, data })
        : await prisma.insightsWidget.create({ data: { dashboardId, ...data } });

    revalidatePath('/insights');
    return { success: true, widget: toWidget(saved) };
  } catch (error) {
    console.error('saveWidget error:', error);
    return fail(error, 'Error al guardar el widget');
  }
}

export async function deleteWidget(id: string): Promise<ActionResult> {
  try {
    const guard = await assertAdmin();
    if (!guard.success) return guard;

    const existing = await prisma.insightsWidget.findUnique({ where: { id } });
    if (!existing) return { success: false, error: 'Widget no encontrado' };

    await prisma.insightsWidget.delete({ where: { id } });

    revalidatePath('/insights');
    return { success: true };
  } catch (error) {
    console.error('deleteWidget error:', error);
    return fail(error, 'Error al eliminar el widget');
  }
}

export async function duplicateWidget(
  id: string,
): Promise<ActionResult<{ widget: DashboardWidget }>> {
  try {
    const guard = await assertAdmin();
    if (!guard.success) return guard;

    const source = await prisma.insightsWidget.findUnique({ where: { id } });
    if (!source) return { success: false, error: 'Widget no encontrado' };

    const created = await prisma.insightsWidget.create({
      data: {
        dashboardId: source.dashboardId,
        titulo: `${source.titulo} (copia)`,
        descripcion: source.descripcion,
        tipo: source.tipo,
        querySpec: asJson(source.querySpec),
        vizConfig: asJson(source.vizConfig),
        x: source.x,
        y: source.y + source.h,
        w: source.w,
        h: source.h,
      },
    });

    revalidatePath('/insights');
    return { success: true, widget: toWidget(created) };
  } catch (error) {
    console.error('duplicateWidget error:', error);
    return fail(error, 'Error al duplicar el widget');
  }
}

// ---------------------------------------------------------------------------
// Filtros de dashboard
// ---------------------------------------------------------------------------

export async function saveFilter(
  dashboardId: string,
  filter: FilterInput,
): Promise<ActionResult<{ filter: DashboardFilter }>> {
  try {
    const guard = await assertAdmin();
    if (!guard.success) return guard;

    const parsed = filterInputSchema.safeParse(filter);
    if (!parsed.success) return { success: false, error: formatZodError(parsed.error) };

    const dashboard = await prisma.insightsDashboard.findUnique({
      where: { id: dashboardId },
    });
    if (!dashboard) return { success: false, error: 'Dashboard no encontrado' };

    const input = parsed.data;

    const targetWidgets = await prisma.insightsWidget.findMany({
      where: { id: { in: input.widgetIds }, dashboardId },
      select: { id: true },
    });
    if (targetWidgets.length !== new Set(input.widgetIds).size) {
      return {
        success: false,
        error: 'Algún widget objetivo no pertenece a este dashboard',
      };
    }

    const data = {
      label: input.label,
      dataset: input.dataset,
      dimension: input.dimension,
      operator: input.operator,
      valorDefault:
        input.valorDefault === undefined || input.valorDefault === null
          ? undefined
          : asJson(input.valorDefault),
      orden: input.orden,
    };

    const existing = input.id
      ? await prisma.insightsFilter.findUnique({ where: { id: input.id } })
      : null;

    const saved = await prisma.$transaction(async (tx) => {
      if (existing && existing.dashboardId === dashboardId) {
        await tx.insightsFilterTarget.deleteMany({ where: { filterId: existing.id } });
        return tx.insightsFilter.update({
          where: { id: existing.id },
          data: {
            ...data,
            targets: {
              createMany: { data: targetWidgets.map((w) => ({ widgetId: w.id })) },
            },
          },
          include: { targets: true },
        });
      }
      return tx.insightsFilter.create({
        data: {
          dashboardId,
          ...data,
          targets: {
            createMany: { data: targetWidgets.map((w) => ({ widgetId: w.id })) },
          },
        },
        include: { targets: true },
      });
    });

    revalidatePath('/insights');
    return { success: true, filter: toFilter(saved) };
  } catch (error) {
    console.error('saveFilter error:', error);
    return fail(error, 'Error al guardar el filtro');
  }
}

export async function deleteFilter(id: string): Promise<ActionResult> {
  try {
    const guard = await assertAdmin();
    if (!guard.success) return guard;

    const existing = await prisma.insightsFilter.findUnique({ where: { id } });
    if (!existing) return { success: false, error: 'Filtro no encontrado' };

    await prisma.insightsFilter.delete({ where: { id } });

    revalidatePath('/insights');
    return { success: true };
  } catch (error) {
    console.error('deleteFilter error:', error);
    return fail(error, 'Error al eliminar el filtro');
  }
}
