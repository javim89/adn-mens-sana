import { describe, it, expect, vi, beforeEach } from 'vitest';

const queryRawUnsafe = vi.fn();
const executeRawUnsafe = vi.fn();
const transaction = vi.fn();

const tokenDeInsights = vi.fn();

vi.mock('@/lib/db', () => ({
  prisma: {
    $queryRawUnsafe: (...args: unknown[]) => queryRawUnsafe(...args),
    $transaction: (...args: unknown[]) => transaction(...args),
  },
}));
vi.mock('@/lib/tenant/insights-sesion', () => ({
  tokenDeInsights: (...args: unknown[]) => tokenDeInsights(...args),
}));

const { runQuery, runRawSql, serializeRows, inferColumns } = await import('../run');
const { tenantCtes } = await import('../tenant-prelude');

const CLUB = 'club_a';
const TOKEN = 'a'.repeat(64);
const SET_TOKEN = "SELECT set_config('app.insights_token', $1, true)";

/** La query (sin el set_config del token) que corrió dentro de la transacción. */
function queryEjecutada(): unknown[] {
  const llamada = queryRawUnsafe.mock.calls.find((c) => c[0] !== SET_TOKEN);
  if (!llamada) throw new Error('No se ejecutó ninguna query');
  return llamada;
}

beforeEach(() => {
  tokenDeInsights.mockReset();
  tokenDeInsights.mockResolvedValue(TOKEN);
  queryRawUnsafe.mockReset();
  executeRawUnsafe.mockReset();
  transaction.mockReset();
  transaction.mockImplementation(
    (fn: (tx: { $executeRawUnsafe: typeof executeRawUnsafe; $queryRawUnsafe: typeof queryRawUnsafe }) => unknown) =>
      fn({ $executeRawUnsafe: executeRawUnsafe, $queryRawUnsafe: queryRawUnsafe }),
  );
});

describe('serializeRows', () => {
  it('convierte los BigInt de los COUNT a Number', () => {
    const rows = serializeRows([{ cantidad: BigInt(42) }]);
    expect(rows).toEqual([{ cantidad: 42 }]);
    expect(() => JSON.stringify(rows)).not.toThrow();
  });

  it('convierte los Decimal de Prisma a Number', () => {
    const decimal = { toNumber: () => 12.5, toString: () => '12.5' };
    expect(serializeRows([{ promedio: decimal }])).toEqual([{ promedio: 12.5 }]);
  });

  it('deja intactos los Date, null y strings', () => {
    const fecha = new Date('2026-09-15T00:00:00.000Z');
    expect(serializeRows([{ fecha, nombre: 'Juan', vacio: null }])).toEqual([
      { fecha, nombre: 'Juan', vacio: null },
    ]);
  });

  it('tolera un resultado que no es una lista', () => {
    expect(serializeRows(undefined)).toEqual([]);
  });
});

describe('inferColumns', () => {
  it('infiere el tipo por typeof e instanceof Date', () => {
    const columns = inferColumns([
      {
        fecha: new Date('2026-09-15T00:00:00.000Z'),
        total: 10,
        nombre: 'Juan',
        activo: true,
      },
    ]);
    expect(columns).toEqual([
      { id: 'fecha', label: 'fecha', type: 'date', role: 'dimension' },
      { id: 'total', label: 'total', type: 'number', role: 'measure' },
      { id: 'nombre', label: 'nombre', type: 'string', role: 'dimension' },
      { id: 'activo', label: 'activo', type: 'boolean', role: 'dimension' },
    ]);
  });

  it('usa la primera fila con valor no nulo para inferir', () => {
    const columns = inferColumns([{ total: null }, { total: 7 }]);
    expect(columns[0]).toMatchObject({ type: 'number', role: 'measure' });
  });

  it('sin filas no hay columnas', () => {
    expect(inferColumns([])).toEqual([]);
  });
});

describe('runQuery', () => {
  it('ejecuta el SQL compilado con el club como $1 y serializa el resultado', async () => {
    queryRawUnsafe.mockImplementation((sql: string) =>
      sql === SET_TOKEN ? [] : [{ estado: 'ACTIVO', cantidad: BigInt(3) }],
    );

    const result = await runQuery(
      {
        mode: 'builder',
        dataset: 'deportistas',
        dimensions: ['estado'],
        measures: ['cantidad'],
        limit: 50,
      },
      CLUB,
    );

    const [sql, ...params] = queryEjecutada();
    expect(sql).toContain(`WITH ${tenantCtes()}`);
    expect(sql).toContain('FROM deportistas');
    expect(params).toEqual([CLUB, 50]);
    expect(result.rows).toEqual([{ estado: 'ACTIVO', cantidad: 3 }]);
    expect(result.columns.map((c) => c.id)).toEqual(['estado', 'cantidad']);
  });

  it('corre en una transacción read-only con el token del club seteado antes de la query', async () => {
    queryRawUnsafe.mockResolvedValue([]);

    await runQuery({ mode: 'builder', dataset: 'deportistas', dimensions: [], measures: ['cantidad'] }, CLUB);

    expect(tokenDeInsights).toHaveBeenCalledWith(CLUB);
    expect(executeRawUnsafe).toHaveBeenNthCalledWith(1, 'SET TRANSACTION READ ONLY');
    expect(queryRawUnsafe.mock.calls[0]).toEqual([SET_TOKEN, TOKEN]);
    expect(queryRawUnsafe).toHaveBeenCalledTimes(2);
  });

  it('propaga el error del compilador sin tocar la base', async () => {
    await expect(
      runQuery(
        {
          mode: 'builder',
          dataset: 'no_existe',
          dimensions: [],
          measures: ['cantidad'],
        },
        CLUB,
      ),
    ).rejects.toThrow(/Dataset desconocido/);
    expect(queryRawUnsafe).not.toHaveBeenCalled();
    expect(tokenDeInsights).not.toHaveBeenCalled();
  });
});

describe('runRawSql', () => {
  const envuelta = (inner: string) => `WITH ${tenantCtes()}\nSELECT * FROM (\n${inner}\n) __q LIMIT 1000`;

  it('ejecuta dentro de una transacción read-only, con timeout, token, prelude y LIMIT', async () => {
    queryRawUnsafe.mockImplementation((sql: string) => (sql === SET_TOKEN ? [] : [{ total: BigInt(5) }]));

    const result = await runRawSql('SELECT count(*) AS total FROM deportistas', CLUB);

    expect(executeRawUnsafe).toHaveBeenNthCalledWith(1, 'SET TRANSACTION READ ONLY');
    expect(executeRawUnsafe).toHaveBeenNthCalledWith(
      2,
      "SET LOCAL statement_timeout = '10s'",
    );
    expect(queryRawUnsafe).toHaveBeenNthCalledWith(1, SET_TOKEN, TOKEN);
    expect(queryRawUnsafe).toHaveBeenNthCalledWith(
      2,
      envuelta('SELECT count(*) AS total FROM deportistas'),
      CLUB,
    );
    expect(result.rows).toEqual([{ total: 5 }]);
    expect(result.columns).toEqual([
      { id: 'total', label: 'total', type: 'number', role: 'measure' },
    ]);
  });

  it('un WITH del usuario queda adentro de la subquery, detrás del prelude', async () => {
    queryRawUnsafe.mockResolvedValue([]);

    await runRawSql('WITH x AS (SELECT id FROM deportistas) SELECT count(*) FROM x', CLUB);

    expect(queryEjecutada()).toEqual([
      envuelta('WITH x AS (SELECT id FROM deportistas) SELECT count(*) FROM x'),
      CLUB,
    ]);
  });

  it('saca el ";" final (y el comentario que lo siga) antes de envolver la query', async () => {
    queryRawUnsafe.mockResolvedValue([]);

    await runRawSql('SELECT 1 AS n; -- listo', CLUB);

    expect(queryEjecutada()).toEqual([envuelta('SELECT 1 AS n'), CLUB]);
  });

  it('deja intacto un ";" que vive dentro de un string literal', async () => {
    queryRawUnsafe.mockResolvedValue([]);

    await runRawSql("SELECT 'a;b' AS t", CLUB);

    expect(queryEjecutada()).toEqual([envuelta("SELECT 'a;b' AS t"), CLUB]);
  });

  it('rechaza el SQL que no pasa el guard sin abrir transacción', async () => {
    await expect(runRawSql('DELETE FROM deportistas', CLUB)).rejects.toThrow(
      /SELECT o WITH/,
    );
    await expect(
      runRawSql('WITH x AS (DELETE FROM triage RETURNING id) SELECT * FROM x', CLUB),
    ).rejects.toThrow(/palabra no permitida/);
    expect(transaction).not.toHaveBeenCalled();
    expect(tokenDeInsights).not.toHaveBeenCalled();
  });
});
