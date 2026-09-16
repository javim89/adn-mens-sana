import { describe, it, expect, vi, beforeEach } from 'vitest';

const queryRawUnsafe = vi.fn();
const executeRawUnsafe = vi.fn();
const transaction = vi.fn();

vi.mock('@/lib/db', () => ({
  prisma: {
    $queryRawUnsafe: (...args: unknown[]) => queryRawUnsafe(...args),
    $transaction: (...args: unknown[]) => transaction(...args),
  },
}));

const { runQuery, runRawSql, serializeRows, inferColumns } = await import('../run');

beforeEach(() => {
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
  it('ejecuta el SQL compilado con sus parámetros y serializa el resultado', async () => {
    queryRawUnsafe.mockResolvedValue([{ estado: 'ACTIVO', cantidad: BigInt(3) }]);

    const result = await runQuery({
      mode: 'builder',
      dataset: 'deportistas',
      dimensions: ['estado'],
      measures: ['cantidad'],
      limit: 50,
    });

    const [sql, ...params] = queryRawUnsafe.mock.calls[0];
    expect(sql).toContain('FROM deportistas');
    expect(params).toEqual([50]);
    expect(result.rows).toEqual([{ estado: 'ACTIVO', cantidad: 3 }]);
    expect(result.columns.map((c) => c.id)).toEqual(['estado', 'cantidad']);
  });

  it('propaga el error del compilador sin tocar la base', async () => {
    await expect(
      runQuery({
        mode: 'builder',
        dataset: 'no_existe',
        dimensions: [],
        measures: ['cantidad'],
      }),
    ).rejects.toThrow(/Dataset desconocido/);
    expect(queryRawUnsafe).not.toHaveBeenCalled();
  });
});

describe('runRawSql', () => {
  it('ejecuta dentro de una transacción read-only, con timeout y LIMIT', async () => {
    queryRawUnsafe.mockResolvedValue([{ total: BigInt(5) }]);

    const result = await runRawSql('SELECT count(*) AS total FROM deportistas');

    expect(executeRawUnsafe).toHaveBeenNthCalledWith(1, 'SET TRANSACTION READ ONLY');
    expect(executeRawUnsafe).toHaveBeenNthCalledWith(
      2,
      "SET LOCAL statement_timeout = '10s'",
    );
    expect(queryRawUnsafe).toHaveBeenCalledWith(
      'SELECT * FROM (\nSELECT count(*) AS total FROM deportistas\n) __q LIMIT 1000',
    );
    expect(result.rows).toEqual([{ total: 5 }]);
    expect(result.columns).toEqual([
      { id: 'total', label: 'total', type: 'number', role: 'measure' },
    ]);
  });

  it('saca el ";" final (y el comentario que lo siga) antes de envolver la query', async () => {
    queryRawUnsafe.mockResolvedValue([]);

    await runRawSql('SELECT 1 AS n; -- listo');

    expect(queryRawUnsafe).toHaveBeenCalledWith(
      'SELECT * FROM (\nSELECT 1 AS n\n) __q LIMIT 1000',
    );
  });

  it('deja intacto un ";" que vive dentro de un string literal', async () => {
    queryRawUnsafe.mockResolvedValue([]);

    await runRawSql("SELECT 'a;b' AS t");

    expect(queryRawUnsafe).toHaveBeenCalledWith(
      "SELECT * FROM (\nSELECT 'a;b' AS t\n) __q LIMIT 1000",
    );
  });

  it('rechaza el SQL que no pasa el guard sin abrir transacción', async () => {
    await expect(runRawSql('DELETE FROM deportistas')).rejects.toThrow(
      /SELECT o WITH/,
    );
    await expect(
      runRawSql('WITH x AS (DELETE FROM triage RETURNING id) SELECT * FROM x'),
    ).rejects.toThrow(/palabra no permitida/);
    expect(transaction).not.toHaveBeenCalled();
  });
});
