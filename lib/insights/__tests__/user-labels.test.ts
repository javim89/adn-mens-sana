import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockGetMiembros } = vi.hoisted(() => ({ mockGetMiembros: vi.fn() }));

vi.mock('@/lib/db', () => ({ prisma: {} }));
vi.mock('@clerk/nextjs/server', () => ({ clerkClient: vi.fn(), auth: vi.fn() }));
vi.mock('@/lib/tenant/miembros', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/tenant/miembros')>()),
  getMiembrosDelClub: mockGetMiembros,
}));

const { collectUserIds, resolveUserLabels } = await import('../user-labels');

import type { ColumnMeta, QueryResult } from '../types';

const CLUB = 'club_a';

const COL_ENTREGADO: ColumnMeta = {
  id: 'entregado_por',
  label: 'Entregado por',
  type: 'string',
  role: 'dimension',
  labelSource: 'clerk_user',
};

const COL_LUGAR: ColumnMeta = {
  id: 'lugar',
  label: 'Lugar de retiro',
  type: 'enum',
  role: 'dimension',
  enumLabels: { SEDE: 'Sede' },
};

const COL_ENTREGAS: ColumnMeta = {
  id: 'entregas',
  label: 'Entregas',
  type: 'number',
  role: 'measure',
  format: 'integer',
};

function resultado(rows: Record<string, unknown>[]): QueryResult {
  return { columns: [COL_ENTREGADO, COL_LUGAR, COL_ENTREGAS], rows };
}

function miembro(userId: string, overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    userId,
    rol: 'entrenador',
    lugarRetiro: null,
    activo: true,
    nombre: 'Ana',
    apellido: 'López',
    email: `${userId}@club.com`,
    lastSignInAt: null,
    createdAt: new Date('2026-01-01'),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetMiembros.mockResolvedValue([miembro('user_1')]);
});

describe('collectUserIds', () => {
  it('junta los ids distintos de las columnas marcadas', () => {
    const ids = collectUserIds(resultado([]).columns, [
      { entregado_por: 'user_1', lugar: 'SEDE', entregas: 3 },
      { entregado_por: 'user_2', lugar: 'SEDE', entregas: 1 },
      { entregado_por: 'user_1', lugar: 'PREDIO', entregas: 2 },
    ]);

    expect(ids).toEqual(['user_1', 'user_2']);
  });

  it('ignora las columnas sin labelSource', () => {
    const ids = collectUserIds(
      [COL_LUGAR, COL_ENTREGAS],
      [{ lugar: 'SEDE', entregas: 3 }],
    );

    expect(ids).toEqual([]);
  });

  it('descarta nulls y strings vacíos (las filas no retiradas de cobertura)', () => {
    const ids = collectUserIds(
      [COL_ENTREGADO],
      [{ entregado_por: null }, { entregado_por: '' }, { entregado_por: 'user_3' }],
    );

    expect(ids).toEqual(['user_3']);
  });
});

describe('resolveUserLabels', () => {
  it('deja el nombre en enumLabels de la columna marcada', async () => {
    mockGetMiembros.mockResolvedValue([miembro('user_1'), miembro('user_2', { nombre: 'Beto', apellido: 'Díaz' })]);

    const out = await resolveUserLabels(
      resultado([
        { entregado_por: 'user_1', lugar: 'SEDE', entregas: 3 },
        { entregado_por: 'user_2', lugar: 'SEDE', entregas: 1 },
      ]),
      CLUB,
    );

    const columna = out.columns.find((c) => c.id === 'entregado_por');
    expect(columna?.enumLabels).toEqual({
      user_1: 'Ana López',
      user_2: 'Beto Díaz',
    });
  });

  it('busca entre los miembros del club de la sesión, incluidos los inactivos', async () => {
    await resolveUserLabels(resultado([{ entregado_por: 'user_1', entregas: 3 }]), CLUB);

    expect(mockGetMiembros).toHaveBeenCalledWith({ clubId: CLUB, incluirInactivos: true });
  });

  it('un id que no es miembro del club queda como id (no se resuelve contra Clerk)', async () => {
    mockGetMiembros.mockResolvedValue([miembro('user_1')]);

    const out = await resolveUserLabels(
      resultado([{ entregado_por: 'user_1' }, { entregado_por: 'user_otro_club' }]),
      CLUB,
    );

    expect(out.columns[0].enumLabels).toEqual({ user_1: 'Ana López' });
  });

  it('no toca las filas ni las otras columnas', async () => {
    const entrada = resultado([{ entregado_por: 'user_1', lugar: 'SEDE', entregas: 3 }]);
    const out = await resolveUserLabels(entrada, CLUB);

    expect(out.rows).toEqual(entrada.rows);
    expect(out.columns.find((c) => c.id === 'lugar')).toEqual(COL_LUGAR);
    expect(out.columns.find((c) => c.id === 'entregas')).toEqual(COL_ENTREGAS);
  });

  it('cae al mail y después al id cuando el miembro no tiene nombre', async () => {
    mockGetMiembros.mockResolvedValue([
      miembro('user_1', { nombre: '', apellido: '' }),
      miembro('user_2', { nombre: '', apellido: '', email: '' }),
    ]);

    const out = await resolveUserLabels(
      resultado([{ entregado_por: 'user_1' }, { entregado_por: 'user_2' }]),
      CLUB,
    );

    expect(out.columns[0].enumLabels).toEqual({
      user_1: 'user_1@club.com',
      user_2: 'user_2',
    });
  });

  it('no consulta miembros si ninguna columna lo pide', async () => {
    const entrada: QueryResult = {
      columns: [COL_LUGAR, COL_ENTREGAS],
      rows: [{ lugar: 'SEDE', entregas: 3 }],
    };

    const out = await resolveUserLabels(entrada, CLUB);

    expect(mockGetMiembros).not.toHaveBeenCalled();
    expect(out).toBe(entrada);
  });

  it('devuelve el resultado intacto si falla la consulta — se ven los ids', async () => {
    mockGetMiembros.mockRejectedValue(new Error('Clerk caído'));
    const entrada = resultado([{ entregado_por: 'user_1', entregas: 3 }]);

    const out = await resolveUserLabels(entrada, CLUB);

    expect(out.columns.find((c) => c.id === 'entregado_por')?.enumLabels).toBeUndefined();
    expect(out.rows).toEqual(entrada.rows);
  });
});
