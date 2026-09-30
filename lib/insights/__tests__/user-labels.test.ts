import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockGetUserList, mockClerkClient } = vi.hoisted(() => {
  const mockGetUserList = vi.fn();
  return {
    mockGetUserList,
    mockClerkClient: vi.fn().mockResolvedValue({ users: { getUserList: mockGetUserList } }),
  };
});

vi.mock('@clerk/nextjs/server', () => ({ clerkClient: mockClerkClient }));

const { collectUserIds, resolveUserLabels } = await import('../user-labels');

import type { ColumnMeta, QueryResult } from '../types';

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

function clerkUser(
  id: string,
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    id,
    firstName: 'Ana',
    lastName: 'López',
    publicMetadata: {},
    emailAddresses: [{ emailAddress: `${id}@club.com` }],
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockClerkClient.mockResolvedValue({ users: { getUserList: mockGetUserList } });
  mockGetUserList.mockResolvedValue({ data: [clerkUser('user_1')] });
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
    mockGetUserList.mockResolvedValue({
      data: [clerkUser('user_1'), clerkUser('user_2', { firstName: 'Beto', lastName: 'Díaz' })],
    });

    const out = await resolveUserLabels(
      resultado([
        { entregado_por: 'user_1', lugar: 'SEDE', entregas: 3 },
        { entregado_por: 'user_2', lugar: 'SEDE', entregas: 1 },
      ]),
    );

    const columna = out.columns.find((c) => c.id === 'entregado_por');
    expect(columna?.enumLabels).toEqual({
      user_1: 'Ana López',
      user_2: 'Beto Díaz',
    });
  });

  it('pide a Clerk solo los ids que aparecieron en el resultado', async () => {
    await resolveUserLabels(resultado([{ entregado_por: 'user_1', entregas: 3 }]));

    expect(mockGetUserList).toHaveBeenCalledWith({ userId: ['user_1'], limit: 1 });
  });

  it('no toca las filas ni las otras columnas', async () => {
    const entrada = resultado([{ entregado_por: 'user_1', lugar: 'SEDE', entregas: 3 }]);
    const out = await resolveUserLabels(entrada);

    expect(out.rows).toEqual(entrada.rows);
    expect(out.columns.find((c) => c.id === 'lugar')).toEqual(COL_LUGAR);
    expect(out.columns.find((c) => c.id === 'entregas')).toEqual(COL_ENTREGAS);
  });

  it('cae al mail y después al id cuando el usuario no tiene nombre', async () => {
    mockGetUserList.mockResolvedValue({
      data: [
        clerkUser('user_1', { firstName: null, lastName: null }),
        clerkUser('user_2', {
          firstName: null,
          lastName: null,
          emailAddresses: [],
        }),
      ],
    });

    const out = await resolveUserLabels(
      resultado([{ entregado_por: 'user_1' }, { entregado_por: 'user_2' }]),
    );

    expect(out.columns[0].enumLabels).toEqual({
      user_1: 'user_1@club.com',
      user_2: 'user_2',
    });
  });

  it('usa el nombre de publicMetadata si el perfil de Clerk está vacío', async () => {
    mockGetUserList.mockResolvedValue({
      data: [
        clerkUser('user_1', {
          firstName: null,
          lastName: null,
          publicMetadata: { firstName: 'Carla', lastName: 'Ruiz' },
        }),
      ],
    });

    const out = await resolveUserLabels(resultado([{ entregado_por: 'user_1' }]));

    expect(out.columns[0].enumLabels).toEqual({ user_1: 'Carla Ruiz' });
  });

  it('no consulta Clerk si ninguna columna lo pide', async () => {
    const entrada: QueryResult = {
      columns: [COL_LUGAR, COL_ENTREGAS],
      rows: [{ lugar: 'SEDE', entregas: 3 }],
    };

    const out = await resolveUserLabels(entrada);

    expect(mockClerkClient).not.toHaveBeenCalled();
    expect(out).toBe(entrada);
  });

  it('devuelve el resultado intacto si Clerk falla — se ven los ids', async () => {
    mockGetUserList.mockRejectedValue(new Error('Clerk caído'));
    const entrada = resultado([{ entregado_por: 'user_1', entregas: 3 }]);

    const out = await resolveUserLabels(entrada);

    expect(out.columns.find((c) => c.id === 'entregado_por')?.enumLabels).toBeUndefined();
    expect(out.rows).toEqual(entrada.rows);
  });
});
