import { describe, test, it, expect, vi, beforeEach } from 'vitest';

const { mockAuth, mockCurrentUser, mockRevalidatePath, mockPrisma } = vi.hoisted(() => {
  const mockAuth = vi.fn().mockResolvedValue({ userId: 'user_admin_1' });
  const mockCurrentUser = vi.fn().mockResolvedValue({
    publicMetadata: { role: 'admin' },
  });
  const mockRevalidatePath = vi.fn();

  const mockPrisma = {
    insightsDashboard: {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue(null),
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: 'dash_1', slug: 'nuevo' }),
      update: vi.fn().mockResolvedValue({ id: 'dash_1' }),
      delete: vi.fn().mockResolvedValue({ id: 'dash_1' }),
    },
    insightsWidget: {
      findUnique: vi.fn().mockResolvedValue(null),
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockResolvedValue({ id: 'w_new' }),
      update: vi.fn().mockResolvedValue({ id: 'w_1' }),
      delete: vi.fn().mockResolvedValue({ id: 'w_1' }),
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
      createMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
    insightsFilter: {
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: 'f_1' }),
      update: vi.fn().mockResolvedValue({ id: 'f_1' }),
      delete: vi.fn().mockResolvedValue({ id: 'f_1' }),
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
    insightsFilterTarget: {
      createMany: vi.fn().mockResolvedValue({ count: 0 }),
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
    // `$transaction` con callback ejecuta contra el mismo mock; con array,
    // resuelve las promesas recibidas.
    $transaction: vi.fn(async (arg: unknown) =>
      typeof arg === 'function'
        ? await (arg as (tx: unknown) => Promise<unknown>)(mockPrisma)
        : await Promise.all(arg as Promise<unknown>[]),
    ),
  };

  return { mockAuth, mockCurrentUser, mockRevalidatePath, mockPrisma };
});

vi.mock('@clerk/nextjs/server', () => ({ auth: mockAuth, currentUser: mockCurrentUser }));
vi.mock('@/lib/db', () => ({ prisma: mockPrisma }));
vi.mock('next/cache', () => ({ revalidatePath: mockRevalidatePath }));

import {
  createDashboard,
  deleteDashboard,
  deleteFilter,
  deleteWidget,
  duplicateDashboard,
  duplicateWidget,
  getDashboard,
  getDashboards,
  saveDashboardLayout,
  saveFilter,
  saveWidget,
  updateDashboard,
} from '../insights';
import { querySpecSchema } from '@/lib/insights/schemas';
import { compile } from '@/lib/insights/compile';
import { VIZ_BY_ID, checkCompatibility, type VizId } from '@/lib/insights/visualizations';
import { widgetsPanoramaGeneral, widgetsViandas } from '@/scripts/seed-insights.mjs';

function asRole(role: string | null) {
  mockCurrentUser.mockResolvedValue(role ? { publicMetadata: { role } } : null);
}

const specValido = {
  mode: 'builder' as const,
  dataset: 'deportistas',
  dimensions: ['estado'],
  measures: ['cantidad'],
};

beforeEach(() => {
  vi.clearAllMocks();
  mockAuth.mockResolvedValue({ userId: 'user_admin_1' });
  asRole('admin');
  mockPrisma.insightsDashboard.findUnique.mockResolvedValue(null);
  mockPrisma.insightsDashboard.findFirst.mockResolvedValue(null);
  mockPrisma.insightsDashboard.create.mockResolvedValue({ id: 'dash_1', slug: 'nuevo' });
});

// ---------------------------------------------------------------------------
// Autorización — es lo que el layout NO protege
// ---------------------------------------------------------------------------

describe('guard de admin', () => {
  // Cada action se invoca con argumentos mínimos; lo único que se verifica es
  // que el guard corte ANTES de tocar Prisma.
  const acciones: [string, () => Promise<{ success: boolean; error?: string }>][] = [
    ['getDashboards', () => getDashboards()],
    ['getDashboard', () => getDashboard('dash_1')],
    ['createDashboard', () => createDashboard({ nombre: 'X' })],
    ['updateDashboard', () => updateDashboard('dash_1', { nombre: 'X' })],
    ['deleteDashboard', () => deleteDashboard('dash_1')],
    ['saveDashboardLayout', () => saveDashboardLayout('dash_1', [])],
    [
      'saveWidget',
      () =>
        saveWidget('dash_1', {
          titulo: 'X',
          tipo: 'table',
          querySpec: specValido,
          vizConfig: { type: 'table' },
          x: 0,
          y: 0,
          w: 6,
          h: 6,
        }),
    ],
    ['deleteWidget', () => deleteWidget('w_1')],
  ];

  test.each(acciones)('%s rechaza a un rol no admin', async (_nombre, run) => {
    asRole('entrenador');
    const result = await run();
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/admin|denegado/i);
  });

  test.each(acciones)('%s rechaza a un usuario sin sesión', async (_nombre, run) => {
    mockAuth.mockResolvedValue({ userId: null });
    const result = await run();
    expect(result.success).toBe(false);
  });

  it('no toca la base cuando el rol no alcanza', async () => {
    asRole('medico');
    await deleteDashboard('dash_1');
    expect(mockPrisma.insightsDashboard.delete).not.toHaveBeenCalled();
    expect(mockPrisma.insightsDashboard.findUnique).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Reglas de negocio
// ---------------------------------------------------------------------------

describe('deleteDashboard', () => {
  it('rechaza borrar un dashboard del sistema', async () => {
    mockPrisma.insightsDashboard.findUnique.mockResolvedValue({
      id: 'dash_sys',
      esSistema: true,
    });

    const result = await deleteDashboard('dash_sys');

    expect(result.success).toBe(false);
    expect(result.success === false && result.error).toMatch(/sistema/i);
    expect(mockPrisma.insightsDashboard.delete).not.toHaveBeenCalled();
  });

  it('borra uno normal y revalida', async () => {
    mockPrisma.insightsDashboard.findUnique.mockResolvedValue({
      id: 'dash_1',
      esSistema: false,
    });

    const result = await deleteDashboard('dash_1');

    expect(result.success).toBe(true);
    expect(mockPrisma.insightsDashboard.delete).toHaveBeenCalledWith({
      where: { id: 'dash_1' },
    });
    expect(mockRevalidatePath).toHaveBeenCalledWith('/insights');
  });

  it('avisa cuando no existe', async () => {
    mockPrisma.insightsDashboard.findUnique.mockResolvedValue(null);
    const result = await deleteDashboard('nope');
    expect(result.success).toBe(false);
    expect(result.success === false && result.error).toMatch(/no encontrado/i);
  });
});

describe('createDashboard', () => {
  it('genera un slug a partir del nombre', async () => {
    await createDashboard({ nombre: 'Panorama General 2026' });

    const data = mockPrisma.insightsDashboard.create.mock.calls[0]?.[0]?.data;
    expect(data.slug).toMatch(/^[a-z0-9-]+$/);
    expect(data.slug).toContain('panorama');
  });

  it('rechaza un nombre vacío', async () => {
    const result = await createDashboard({ nombre: '   ' });
    expect(result.success).toBe(false);
    expect(mockPrisma.insightsDashboard.create).not.toHaveBeenCalled();
  });

  it('registra quién lo creó', async () => {
    await createDashboard({ nombre: 'Mi tablero' });
    const data = mockPrisma.insightsDashboard.create.mock.calls[0]?.[0]?.data;
    expect(data.creadoPor).toBe('user_admin_1');
  });
});

// ---------------------------------------------------------------------------
// Validación del querySpec — lo que termina en el compilador de SQL
// ---------------------------------------------------------------------------

describe('validación del querySpec al persistir', () => {
  const widgetBase = {
    titulo: 'Widget',
    tipo: 'table' as const,
    vizConfig: { type: 'table' as const },
    x: 0,
    y: 0,
    w: 6,
    h: 6,
  };

  beforeEach(() => {
    // El dashboard destino tiene que existir para llegar a la escritura; los
    // casos de spec inválido cortan antes, en la validación.
    mockPrisma.insightsDashboard.findUnique.mockResolvedValue({
      id: 'dash_1',
      esSistema: false,
    });
  });

  beforeEach(() => {
    mockPrisma.insightsDashboard.findUnique.mockResolvedValue({
      id: 'dash_1',
      esSistema: false,
    });
  });

  it('rechaza un dataset que no existe en el catálogo', async () => {
    const result = await saveWidget('dash_1', {
      ...widgetBase,
      querySpec: { mode: 'builder', dataset: 'tabla_inventada', dimensions: [], measures: [] },
    });

    expect(result.success).toBe(false);
    expect(mockPrisma.insightsWidget.create).not.toHaveBeenCalled();
  });

  it('rechaza una dimensión que no pertenece al dataset', async () => {
    const result = await saveWidget('dash_1', {
      ...widgetBase,
      querySpec: {
        mode: 'builder',
        dataset: 'deportistas',
        dimensions: ['columna_que_no_existe'],
        measures: ['cantidad'],
      },
    });

    expect(result.success).toBe(false);
    expect(mockPrisma.insightsWidget.create).not.toHaveBeenCalled();
  });

  it('rechaza un tipo de visualización inexistente', async () => {
    const result = await saveWidget('dash_1', {
      ...widgetBase,
      tipo: 'sunburst' as never,
      querySpec: specValido,
    });

    expect(result.success).toBe(false);
    expect(mockPrisma.insightsWidget.create).not.toHaveBeenCalled();
  });

  it('acepta un spec válido', async () => {
    const result = await saveWidget('dash_1', { ...widgetBase, querySpec: specValido });

    expect(result.success).toBe(true);
    expect(mockPrisma.insightsWidget.create).toHaveBeenCalled();
  });

  it('rechaza SQL crudo que no pasa el guard de solo lectura', async () => {
    const result = await saveWidget('dash_1', {
      ...widgetBase,
      querySpec: { mode: 'sql', sql: 'DELETE FROM deportistas' },
    });

    expect(result.success).toBe(false);
    expect(mockPrisma.insightsWidget.create).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Guardado del layout
// ---------------------------------------------------------------------------

describe('saveDashboardLayout', () => {
  const widget = (id: string | undefined, x: number) => ({
    ...(id ? { id } : {}),
    titulo: `W${x}`,
    tipo: 'table' as const,
    querySpec: specValido,
    vizConfig: { type: 'table' as const },
    x,
    y: 0,
    w: 6,
    h: 6,
  });

  beforeEach(() => {
    mockPrisma.insightsDashboard.findUnique.mockResolvedValue({
      id: 'dash_1',
      esSistema: false,
    });
    mockPrisma.insightsWidget.findMany.mockResolvedValue([
      { id: 'w_existente' },
      { id: 'w_a_borrar' },
    ]);
  });

  it('corre todo en una transacción', async () => {
    await saveDashboardLayout('dash_1', [widget('w_existente', 0)]);
    expect(mockPrisma.$transaction).toHaveBeenCalled();
  });

  it('crea los nuevos, actualiza los existentes y borra los que ya no están', async () => {
    const result = await saveDashboardLayout('dash_1', [
      widget('w_existente', 0),
      widget(undefined, 6),
    ]);

    expect(result.success).toBe(true);
    expect(mockPrisma.insightsWidget.update).toHaveBeenCalled();
    expect(mockPrisma.insightsWidget.create).toHaveBeenCalled();
    // El que no vino en el draft se elimina.
    const deleteManyArgs = mockPrisma.insightsWidget.deleteMany.mock.calls[0]?.[0];
    expect(JSON.stringify(deleteManyArgs)).toContain('w_a_borrar');
  });

  it('persiste las posiciones de la grilla', async () => {
    await saveDashboardLayout('dash_1', [
      { ...widget('w_existente', 3), y: 2, w: 4, h: 8 },
    ]);

    const data = mockPrisma.insightsWidget.update.mock.calls[0]?.[0]?.data;
    expect(data).toMatchObject({ x: 3, y: 2, w: 4, h: 8 });
  });

  it('rechaza el guardado si algún widget trae un spec inválido', async () => {
    const result = await saveDashboardLayout('dash_1', [
      { ...widget('w_existente', 0), querySpec: { mode: 'builder', dataset: 'xx', dimensions: [], measures: [] } },
    ]);

    expect(result.success).toBe(false);
  });

  it('un layout vacío borra todos los widgets del dashboard', async () => {
    const result = await saveDashboardLayout('dash_1', []);

    expect(result.success).toBe(true);
    expect(mockPrisma.insightsWidget.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: ['w_existente', 'w_a_borrar'] } },
    });
  });

  it('trata un id desconocido como widget nuevo (id temporal del editor)', async () => {
    await saveDashboardLayout('dash_1', [widget('temp_abc', 0)]);

    expect(mockPrisma.insightsWidget.update).not.toHaveBeenCalled();
    expect(mockPrisma.insightsWidget.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ dashboardId: 'dash_1' }),
      }),
    );
  });

  it('avisa cuando el dashboard no existe, sin abrir transacción', async () => {
    mockPrisma.insightsDashboard.findUnique.mockResolvedValue(null);

    const result = await saveDashboardLayout('nope', [widget(undefined, 0)]);

    expect(result.success).toBe(false);
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Filtros de dashboard
// ---------------------------------------------------------------------------

describe('saveFilter', () => {
  const filtroBase = {
    label: 'Disciplina',
    dataset: 'deportistas',
    dimension: 'disciplina',
    operator: 'eq' as const,
    widgetIds: ['w_1'],
  };

  beforeEach(() => {
    mockPrisma.insightsDashboard.findUnique.mockResolvedValue({
      id: 'dash_1',
      esSistema: false,
    });
    mockPrisma.insightsWidget.findMany.mockResolvedValue([{ id: 'w_1' }]);
    mockPrisma.insightsFilter.create.mockResolvedValue({
      id: 'f_1',
      ...filtroBase,
      valorDefault: null,
      orden: 0,
      targets: [{ widgetId: 'w_1' }],
    });
  });

  it('persiste el filtro con sus targets', async () => {
    const result = await saveFilter('dash_1', filtroBase);

    expect(result.success).toBe(true);
    expect(mockPrisma.insightsFilter.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          dashboardId: 'dash_1',
          targets: { createMany: { data: [{ widgetId: 'w_1' }] } },
        }),
      }),
    );
  });

  it('rechaza targets que no pertenecen al dashboard', async () => {
    mockPrisma.insightsWidget.findMany.mockResolvedValue([]);

    const result = await saveFilter('dash_1', { ...filtroBase, widgetIds: ['ajeno'] });

    expect(result.success).toBe(false);
    expect(mockPrisma.insightsFilter.create).not.toHaveBeenCalled();
  });

  it('rechaza una dimensión que no existe en el dataset', async () => {
    const result = await saveFilter('dash_1', {
      ...filtroBase,
      dimension: 'nivel',
      widgetIds: [],
    });

    expect(result.success).toBe(false);
    expect(mockPrisma.insightsFilter.create).not.toHaveBeenCalled();
  });
});

describe('guard de admin — actions restantes', () => {
  const acciones: [string, () => Promise<{ success: boolean; error?: string }>][] = [
    ['duplicateDashboard', () => duplicateDashboard('dash_1')],
    ['duplicateWidget', () => duplicateWidget('w_1')],
    [
      'saveFilter',
      () =>
        saveFilter('dash_1', {
          label: 'X',
          dataset: 'deportistas',
          dimension: 'disciplina',
          operator: 'eq',
          widgetIds: [],
        }),
    ],
    ['deleteFilter', () => deleteFilter('f_1')],
  ];

  test.each(acciones)('%s rechaza a un rol no admin', async (_nombre, run) => {
    asRole('nutricionista');
    const result = await run();
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/admin|denegado/i);
  });
});

// ---------------------------------------------------------------------------
// Seed del dashboard por defecto — atrapa el drift contra el catálogo
// ---------------------------------------------------------------------------

describe('seed "Panorama general"', () => {
  it('define 12 widgets', () => {
    expect(widgetsPanoramaGeneral).toHaveLength(12);
  });

  it('cada querySpec es válido contra el catálogo y compila a SQL', () => {
    for (const w of widgetsPanoramaGeneral) {
      const parsed = querySpecSchema.safeParse(w.querySpec);
      expect(
        parsed.success ? null : `${w.titulo}: ${JSON.stringify(parsed.error.issues)}`,
      ).toBeNull();
      expect(() => compile(querySpecSchema.parse(w.querySpec))).not.toThrow();
    }
  });

  it('cada vizConfig declara un tipo de visualización conocido', () => {
    for (const w of widgetsPanoramaGeneral) {
      expect(w.vizConfig.type).toBe(w.tipo);
      expect(VIZ_BY_ID[w.tipo as VizId]).toBeDefined();
    }
  });
});

describe('seed "Viandas"', () => {
  it('define 9 widgets', () => {
    expect(widgetsViandas).toHaveLength(9);
  });

  it('cada querySpec es válido contra el catálogo y compila a SQL', () => {
    for (const w of widgetsViandas) {
      const parsed = querySpecSchema.safeParse(w.querySpec);
      expect(
        parsed.success ? null : `${w.titulo}: ${JSON.stringify(parsed.error.issues)}`,
      ).toBeNull();
      expect(() => compile(querySpecSchema.parse(w.querySpec))).not.toThrow();
    }
  });

  it('cada vizConfig declara un tipo conocido y compatible con su query', () => {
    for (const w of widgetsViandas) {
      expect(w.vizConfig.type).toBe(w.tipo);
      expect(VIZ_BY_ID[w.tipo as VizId]).toBeDefined();
      const compat = checkCompatibility(w.tipo, {
        dimensions: w.querySpec.dimensions,
        measures: w.querySpec.measures,
        timeDimension: w.querySpec.timeDimension ?? null,
      });
      expect(compat.compatible ? null : `${w.titulo}: ${compat.reason}`).toBeNull();
    }
  });

  // El % de retiro solo tiene sentido sobre el universo completo de comidas
  // esperadas; filtrar por lugar o por responsable descarta justo las no
  // retiradas y lo deja clavado en 100%.
  it('ningún widget de cobertura filtra por lugar ni por responsable', () => {
    const campos: string[] = [];
    const recorrer = (nodo: unknown) => {
      if (!nodo || typeof nodo !== 'object') return;
      if ('children' in nodo) {
        for (const hijo of (nodo as { children: unknown[] }).children) recorrer(hijo);
        return;
      }
      campos.push((nodo as { field: string }).field);
    };
    for (const w of widgetsViandas) {
      if (w.querySpec.dataset !== 'viandas_cobertura') continue;
      recorrer(w.querySpec.filters);
    }
    expect(campos).not.toContain('lugar');
    expect(campos).not.toContain('entregado_por');
  });
});
