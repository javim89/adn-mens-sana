import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Fija que el runner consulte a través de `getReadOnlyPrisma()` y no del
 * cliente principal.
 *
 * Existe por un motivo concreto: la capa de solo lectura estuvo documentada
 * antes de estar implementada. Un test que solo mockee `@/lib/db` pasa igual
 * aunque el runner ignore el cliente de solo lectura, porque el fallback
 * devuelve justamente ese cliente. Acá se mockea `@/lib/db-readonly` con una
 * instancia distinguible, así que si alguien vuelve a apuntar el runner al
 * cliente principal, esto falla.
 */

const { readOnlyClient, principal, getReadOnlyPrisma } = vi.hoisted(() => {
  const queryRawUnsafe = vi.fn();
  const executeRawUnsafe = vi.fn();
  const transaction = vi.fn();

  const readOnlyClient = {
    __id: 'readonly',
    $queryRawUnsafe: queryRawUnsafe,
    $executeRawUnsafe: executeRawUnsafe,
    $transaction: transaction,
  };

  const principal = {
    __id: 'principal',
    $queryRawUnsafe: vi.fn(),
    $transaction: vi.fn(),
  };

  return {
    readOnlyClient,
    principal,
    getReadOnlyPrisma: vi.fn(() => readOnlyClient),
  };
});

vi.mock('@/lib/db', () => ({ prisma: principal }));
vi.mock('@/lib/db-readonly', () => ({
  getReadOnlyPrisma,
  isReadOnlyConfigured: () => true,
}));

const { runQuery, runRawSql } = await import('../run');

const spec = {
  mode: 'builder' as const,
  dataset: 'deportistas',
  dimensions: ['estado'],
  measures: ['cantidad'],
};

beforeEach(() => {
  vi.clearAllMocks();
  readOnlyClient.$queryRawUnsafe.mockResolvedValue([{ estado: 'ACTIVO', cantidad: 1 }]);
  readOnlyClient.$transaction.mockImplementation(
    (fn: (tx: typeof readOnlyClient) => unknown) => fn(readOnlyClient),
  );
});

describe('runQuery', () => {
  it('consulta con el cliente de solo lectura', async () => {
    await runQuery(spec);

    expect(getReadOnlyPrisma).toHaveBeenCalled();
    expect(readOnlyClient.$queryRawUnsafe).toHaveBeenCalled();
  });

  it('no usa el cliente principal', async () => {
    await runQuery(spec);
    expect(principal.$queryRawUnsafe).not.toHaveBeenCalled();
  });
});

describe('runRawSql', () => {
  it('abre la transacción con el cliente de solo lectura', async () => {
    await runRawSql('SELECT 1 AS n');

    expect(getReadOnlyPrisma).toHaveBeenCalled();
    expect(readOnlyClient.$transaction).toHaveBeenCalled();
    expect(principal.$transaction).not.toHaveBeenCalled();
  });

  // Las tres capas tienen que seguir apiladas: cambiar de cliente no reemplaza
  // a la transacción de solo lectura ni al timeout.
  it('mantiene READ ONLY y el statement_timeout dentro de la transacción', async () => {
    await runRawSql('SELECT 1 AS n');

    const ejecutados = readOnlyClient.$executeRawUnsafe.mock.calls.map((c) => c[0]);
    expect(ejecutados).toContain('SET TRANSACTION READ ONLY');
    expect(ejecutados.some((s: string) => s.includes('statement_timeout'))).toBe(true);
  });

  it('el guard sigue rechazando antes de tocar la base', async () => {
    await expect(runRawSql('DELETE FROM deportistas')).rejects.toThrow();
    expect(readOnlyClient.$transaction).not.toHaveBeenCalled();
  });
});
