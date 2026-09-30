import { describe, test, expect, vi, beforeEach } from 'vitest';

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: { $queryRaw: vi.fn() },
}));

vi.mock('@/lib/db', () => ({ prisma: mockPrisma }));

import { getNivelTriageActual } from '../triage';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('getNivelTriageActual', () => {
  test('arma el Map desde las filas crudas', async () => {
    mockPrisma.$queryRaw.mockResolvedValue([
      { deportista_id: 'd1', nivel: 'ROJO' },
      { deportista_id: 'd2', nivel: 'VERDE' },
    ]);

    const map = await getNivelTriageActual();

    expect(map.get('d1')).toBe('ROJO');
    expect(map.get('d2')).toBe('VERDE');
    expect(map.size).toBe(2);
  });

  test('sin ids consulta toda la tabla', async () => {
    mockPrisma.$queryRaw.mockResolvedValue([]);
    await getNivelTriageActual();

    expect(mockPrisma.$queryRaw).toHaveBeenCalledTimes(1);
    const [query] = mockPrisma.$queryRaw.mock.calls[0];
    expect(query.values).toEqual([]);
    expect(query.sql).toContain('DISTINCT ON (triage.deportista_id)');
    expect(query.sql).not.toContain('WHERE');
  });

  // El nivel vigente es el snapshot MÁS reciente: el `DESC` sobre calculated_at
  // (y que deportista_id vaya primero, para que el DISTINCT ON sea válido) es
  // toda la corrección de este helper. Si alguien lo invierte, tiene que fallar acá.
  test('ordena por deportista_id y calculated_at DESC — devuelve el snapshot más reciente', async () => {
    mockPrisma.$queryRaw.mockResolvedValue([]);
    await getNivelTriageActual();

    const [query] = mockPrisma.$queryRaw.mock.calls[0];
    expect(query.sql).toContain('ORDER BY triage.deportista_id, triage.calculated_at DESC');
  });

  test('con ids los pasa como parámetros del IN', async () => {
    mockPrisma.$queryRaw.mockResolvedValue([{ deportista_id: 'd1', nivel: 'AMARILLO' }]);
    await getNivelTriageActual(['d1', 'd2']);

    const [query] = mockPrisma.$queryRaw.mock.calls[0];
    expect(query.values).toEqual(['d1', 'd2']);
    expect(query.sql).toContain('WHERE triage.deportista_id IN (?,?)');
  });

  test('con un array vacío devuelve Map vacío sin tocar la DB', async () => {
    const map = await getNivelTriageActual([]);

    expect(map.size).toBe(0);
    expect(mockPrisma.$queryRaw).not.toHaveBeenCalled();
  });

  test('deportistas sin triage simplemente no están en el Map', async () => {
    mockPrisma.$queryRaw.mockResolvedValue([{ deportista_id: 'd1', nivel: 'NARANJA' }]);
    const map = await getNivelTriageActual(['d1', 'd2']);

    expect(map.get('d2')).toBeUndefined();
  });
});
