import { describe, test, expect, vi, beforeEach } from 'vitest';

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    deportista: { findMany: vi.fn() },
    entregaComida: { findMany: vi.fn() },
  },
}));

vi.mock('@/lib/db', () => ({ prisma: mockPrisma }));

import { getPlantelViandas } from '../viandas';

const LESIONADO = {
  id: 'd1',
  apellido: 'Álvarez',
  nombre: 'Ana',
  estado: 'LESIONADO',
  necesidadesApoyo: { recibeAlmuerzo: true, recibeCena: false },
};

const SIN_SATELITE = {
  id: 'd2',
  apellido: 'Benítez',
  nombre: 'Bruno',
  estado: 'ACTIVO',
  necesidadesApoyo: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  mockPrisma.entregaComida.findMany.mockResolvedValue([]);
});

describe('getPlantelViandas', () => {
  test('no filtra por estado: un lesionado o suspendido sigue comiendo', async () => {
    mockPrisma.deportista.findMany.mockResolvedValue([LESIONADO]);
    await getPlantelViandas('disc-1', 'cat-1', '2026-03-14');

    const { where } = mockPrisma.deportista.findMany.mock.calls[0][0];
    expect(where).toEqual({ disciplinaId: 'disc-1', categoriaId: 'cat-1' });
    expect(where).not.toHaveProperty('estado');
  });

  test('devuelve el estado para que la UI pinte el badge', async () => {
    mockPrisma.deportista.findMany.mockResolvedValue([LESIONADO]);
    const [row] = await getPlantelViandas('disc-1', 'cat-1', '2026-03-14');
    expect(row.estado).toBe('LESIONADO');
  });

  test('ordena por apellido y nombre', async () => {
    mockPrisma.deportista.findMany.mockResolvedValue([LESIONADO]);
    await getPlantelViandas('disc-1', 'cat-1', '2026-03-14');
    const { orderBy } = mockPrisma.deportista.findMany.mock.calls[0][0];
    expect(orderBy).toEqual([{ apellido: 'asc' }, { nombre: 'asc' }]);
  });

  test('satélite ausente se traduce a no recibe ninguna vianda', async () => {
    mockPrisma.deportista.findMany.mockResolvedValue([SIN_SATELITE]);
    const [row] = await getPlantelViandas('disc-1', 'cat-1', '2026-03-14');
    expect(row.recibeAlmuerzo).toBe(false);
    expect(row.recibeCena).toBe(false);
  });

  test('preserva los flags cuando el satélite existe', async () => {
    mockPrisma.deportista.findMany.mockResolvedValue([LESIONADO]);
    const [row] = await getPlantelViandas('disc-1', 'cat-1', '2026-03-14');
    expect(row.recibeAlmuerzo).toBe(true);
    expect(row.recibeCena).toBe(false);
  });

  test('consulta las entregas del día pedido, a medianoche UTC', async () => {
    mockPrisma.deportista.findMany.mockResolvedValue([LESIONADO, SIN_SATELITE]);
    await getPlantelViandas('disc-1', 'cat-1', '2026-03-14');

    const { where } = mockPrisma.entregaComida.findMany.mock.calls[0][0];
    expect(where.fecha.toISOString()).toBe('2026-03-14T00:00:00.000Z');
    expect(where.deportistaId).toEqual({ in: ['d1', 'd2'] });
  });

  test('asocia cada entrega a su comida y a su deportista', async () => {
    mockPrisma.deportista.findMany.mockResolvedValue([LESIONADO, SIN_SATELITE]);
    mockPrisma.entregaComida.findMany.mockResolvedValue([
      {
        deportistaId: 'd1',
        comida: 'ALMUERZO',
        lugar: 'SEDE',
        entregadoPor: 'user_1',
        createdAt: new Date('2026-03-14T15:40:00.000Z'),
      },
      {
        deportistaId: 'd1',
        comida: 'DESAYUNO',
        lugar: 'BOSQUESITO',
        entregadoPor: 'user_2',
        createdAt: new Date('2026-03-14T11:00:00.000Z'),
      },
    ]);

    const [ana, bruno] = await getPlantelViandas('disc-1', 'cat-1', '2026-03-14');

    expect(Object.keys(ana.entregas).sort()).toEqual(['ALMUERZO', 'DESAYUNO']);
    expect(ana.entregas.ALMUERZO).toEqual({
      lugar: 'SEDE',
      entregadoPor: 'user_1',
      createdAt: '2026-03-14T15:40:00.000Z',
    });
    // La ausencia de la clave ES el "no retirada".
    expect(ana.entregas.CENA).toBeUndefined();
    expect(bruno.entregas).toEqual({});
  });

  test('sin deportistas no consulta entregas', async () => {
    mockPrisma.deportista.findMany.mockResolvedValue([]);
    const res = await getPlantelViandas('disc-1', 'cat-1', '2026-03-14');
    expect(res).toEqual([]);
    expect(mockPrisma.entregaComida.findMany).not.toHaveBeenCalled();
  });
});
