import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockAuth, mockCurrentUser, mockRunQuery, mockRunRawSql, mockGetUserList } =
  vi.hoisted(() => ({
    mockAuth: vi.fn().mockResolvedValue({ userId: 'user_admin_1' }),
    mockCurrentUser: vi.fn().mockResolvedValue({ publicMetadata: { role: 'admin' } }),
    mockRunQuery: vi.fn(),
    mockRunRawSql: vi.fn(),
    mockGetUserList: vi.fn(),
  }));

vi.mock('@clerk/nextjs/server', () => ({
  auth: mockAuth,
  currentUser: mockCurrentUser,
  clerkClient: async () => ({ users: { getUserList: mockGetUserList } }),
}));
vi.mock('@/lib/insights/run', () => ({
  runQuery: mockRunQuery,
  runRawSql: mockRunRawSql,
}));

import { POST } from '../route';
import type { QuerySpec } from '@/lib/insights/types';

const specValido: QuerySpec = {
  mode: 'builder',
  dataset: 'deportistas',
  dimensions: ['disciplina'],
  measures: ['cantidad'],
};

const resultado = {
  columns: [
    { id: 'disciplina', label: 'Disciplina', type: 'string', role: 'dimension' },
    { id: 'cantidad', label: 'Cantidad', type: 'number', role: 'measure', format: 'integer' },
  ],
  rows: [
    { disciplina: 'Fútbol', cantidad: 42 },
    { disciplina: 'Hockey', cantidad: 17 },
  ],
};

function post(body: unknown) {
  return POST(
    new Request('http://localhost/api/insights/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    }),
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockAuth.mockResolvedValue({ userId: 'user_admin_1' });
  mockCurrentUser.mockResolvedValue({ publicMetadata: { role: 'admin' } });
  mockRunQuery.mockResolvedValue(resultado);
  mockRunRawSql.mockResolvedValue(resultado);
  mockGetUserList.mockResolvedValue({ data: [] });
});

describe('POST /api/insights/query — autorización', () => {
  it('401 sin sesión', async () => {
    mockAuth.mockResolvedValue({ userId: null });

    const res = await post({ spec: specValido });

    expect(res.status).toBe(401);
    expect(mockRunQuery).not.toHaveBeenCalled();
  });

  it('403 con un rol que no es admin', async () => {
    mockCurrentUser.mockResolvedValue({ publicMetadata: { role: 'entrenador' } });

    const res = await post({ spec: specValido });

    expect(res.status).toBe(403);
    await expect(res.json()).resolves.toEqual({
      error: 'Acceso denegado: se requiere rol admin',
    });
    expect(mockRunQuery).not.toHaveBeenCalled();
  });

  it('403 con un usuario sin rol asignado', async () => {
    mockCurrentUser.mockResolvedValue({ publicMetadata: {} });

    const res = await post({ spec: specValido });

    expect(res.status).toBe(403);
  });
});

describe('POST /api/insights/query — validación', () => {
  it('400 con un cuerpo que no es JSON', async () => {
    const res = await post('{no-json');

    expect(res.status).toBe(400);
    expect(mockRunQuery).not.toHaveBeenCalled();
  });

  it('400 sin spec', async () => {
    const res = await post({});
    expect(res.status).toBe(400);
  });

  it('400 con un dataset que no existe en el catálogo', async () => {
    const res = await post({
      spec: { mode: 'builder', dataset: 'pg_shadow', dimensions: [], measures: [] },
    });

    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toContain('pg_shadow');
    expect(mockRunQuery).not.toHaveBeenCalled();
  });

  it('400 con una dimensión que no pertenece al dataset', async () => {
    const res = await post({
      spec: {
        mode: 'builder',
        dataset: 'deportistas',
        dimensions: ['nombre; DROP TABLE deportistas--'],
        measures: ['cantidad'],
      },
    });

    expect(res.status).toBe(400);
    expect(mockRunQuery).not.toHaveBeenCalled();
  });

  it('400 con SQL crudo que no pasa el guard', async () => {
    const res = await post({ spec: { mode: 'sql', sql: 'DROP TABLE deportistas' } });

    expect(res.status).toBe(400);
    expect(mockRunRawSql).not.toHaveBeenCalled();
  });
});

describe('POST /api/insights/query — ejecución', () => {
  it('200 con un spec válido del builder', async () => {
    const res = await post({ spec: specValido });

    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      data: unknown[];
      columns: unknown[];
      meta: { rowCount: number; truncated: boolean; elapsedMs: number };
    };

    expect(body.data).toHaveLength(2);
    expect(body.columns).toHaveLength(2);
    expect(body.meta.rowCount).toBe(2);
    expect(body.meta.truncated).toBe(false);
    expect(typeof body.meta.elapsedMs).toBe('number');
    expect(mockRunQuery).toHaveBeenCalledWith(
      expect.objectContaining({ dataset: 'deportistas' }),
    );
    expect(mockRunRawSql).not.toHaveBeenCalled();
  });

  it('200 con SQL crudo válido', async () => {
    const res = await post({ spec: { mode: 'sql', sql: 'SELECT 1 AS uno' } });

    expect(res.status).toBe(200);
    expect(mockRunRawSql).toHaveBeenCalledWith('SELECT 1 AS uno');
    expect(mockRunQuery).not.toHaveBeenCalled();
  });

  it('400 cuando el compilador rechaza el spec en ejecución', async () => {
    mockRunQuery.mockRejectedValue(new Error('timeGrain requiere una dimensión de tipo date'));

    const res = await post({ spec: specValido });

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({
      error: 'timeGrain requiere una dimensión de tipo date',
    });
  });

  it('500 sin filtrar el detalle cuando falla Postgres', async () => {
    const dbError = Object.assign(new Error('relation "x" does not exist'), {
      name: 'PrismaClientKnownRequestError',
    });
    mockRunQuery.mockRejectedValue(dbError);
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    const res = await post({ spec: specValido });

    expect(res.status).toBe(500);
    const body = (await res.json()) as { error: string };
    expect(body.error).not.toContain('relation');
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it('trunca el payload cuando supera el tope y lo marca en meta', async () => {
    const relleno = 'x'.repeat(2000);
    mockRunQuery.mockResolvedValue({
      columns: resultado.columns,
      rows: Array.from({ length: 2000 }, (_, i) => ({ disciplina: relleno, cantidad: i })),
    });

    const res = await post({ spec: specValido });
    const body = (await res.json()) as {
      data: unknown[];
      meta: { rowCount: number; truncated: boolean };
    };

    expect(res.status).toBe(200);
    expect(body.meta.truncated).toBe(true);
    expect(body.data.length).toBeLessThan(2000);
    expect(body.meta.rowCount).toBe(body.data.length);
  });

  it('resuelve contra Clerk los labels de una columna de userId', async () => {
    mockRunQuery.mockResolvedValue({
      columns: [
        {
          id: 'entregado_por',
          label: 'Entregado por',
          type: 'string',
          role: 'dimension',
          labelSource: 'clerk_user',
        },
        { id: 'entregas', label: 'Entregas', type: 'number', role: 'measure', format: 'integer' },
      ],
      rows: [{ entregado_por: 'user_emp_1', entregas: 12 }],
    });
    mockGetUserList.mockResolvedValue({
      data: [
        {
          id: 'user_emp_1',
          firstName: 'Ana',
          lastName: 'López',
          publicMetadata: {},
          emailAddresses: [{ emailAddress: 'ana@club.com' }],
        },
      ],
    });

    const res = await post({ spec: specValido });
    const body = (await res.json()) as {
      data: Record<string, unknown>[];
      columns: { id: string; enumLabels?: Record<string, string> }[];
    };

    expect(res.status).toBe(200);
    // El id sigue siendo el valor de la fila; el nombre viaja en la columna.
    expect(body.data[0].entregado_por).toBe('user_emp_1');
    expect(body.columns[0].enumLabels).toEqual({ user_emp_1: 'Ana López' });
  });
});
