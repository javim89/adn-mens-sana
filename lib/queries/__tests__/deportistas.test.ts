import { describe, test, expect, vi, beforeEach } from 'vitest';

const { mockPrisma, mockGetNivelTriageActual } = vi.hoisted(() => ({
  mockPrisma: {
    deportista: { findMany: vi.fn(), count: vi.fn() },
  },
  mockGetNivelTriageActual: vi.fn(),
}));

vi.mock('@/lib/db', () => ({ prisma: mockPrisma }));
vi.mock('@/lib/queries/triage', () => ({ getNivelTriageActual: mockGetNivelTriageActual }));

import { getDeportistas } from '../deportistas';

const FILA_1 = {
  id: 'd1',
  nombre: 'Ana',
  apellido: 'Álvarez',
  dni: '11111111',
  disciplinaId: 'disc-1',
  disciplina: { id: 'disc-1', nombre: 'Fútbol' },
  categoriaId: 'cat-1',
  categoria: { id: 'cat-1', nombre: 'Primera' },
  estado: 'ACTIVO',
};

const FILA_2 = { ...FILA_1, id: 'd2', nombre: 'Bruno', apellido: 'Benítez', dni: '22222222' };

function whereDeFindMany() {
  return mockPrisma.deportista.findMany.mock.calls[0][0].where;
}

function whereDeCount() {
  return mockPrisma.deportista.count.mock.calls[0][0].where;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockPrisma.deportista.findMany.mockResolvedValue([FILA_1, FILA_2]);
  mockPrisma.deportista.count.mockResolvedValue(2);
  mockGetNivelTriageActual.mockResolvedValue(new Map());
});

describe('getDeportistas — sin filtro de triage', () => {
  test('pide el nivel solo para los ids de la página', async () => {
    await getDeportistas({});

    expect(mockGetNivelTriageActual).toHaveBeenCalledTimes(1);
    expect(mockGetNivelTriageActual).toHaveBeenCalledWith(['d1', 'd2']);
  });

  test('el where no lleva filtro por id', async () => {
    await getDeportistas({ estado: 'ACTIVO' });

    expect(whereDeFindMany()).not.toHaveProperty('id');
    expect(whereDeFindMany()).toMatchObject({ estado: 'ACTIVO' });
  });

  test('adjunta el nivel a cada fila, null cuando no hay snapshot', async () => {
    mockGetNivelTriageActual.mockResolvedValue(new Map([['d1', 'ROJO']]));

    const { deportistas } = await getDeportistas({});

    expect(deportistas[0].nivelTriage).toBe('ROJO');
    expect(deportistas[1].nivelTriage).toBeNull();
  });

  test('no selecciona fechaIngreso', async () => {
    await getDeportistas({});

    expect(mockPrisma.deportista.findMany.mock.calls[0][0].select).not.toHaveProperty(
      'fechaIngreso',
    );
  });
});

describe('getDeportistas — con filtro de triage', () => {
  test('un nivel concreto se traduce a id.in con los que matchean', async () => {
    mockGetNivelTriageActual.mockResolvedValue(
      new Map([
        ['d1', 'ROJO'],
        ['d2', 'VERDE'],
        ['d3', 'ROJO'],
      ]),
    );
    mockPrisma.deportista.findMany.mockResolvedValue([FILA_1]);

    await getDeportistas({ nivelTriage: 'ROJO' });

    expect(whereDeFindMany()).toMatchObject({ id: { in: ['d1', 'd3'] } });
    expect(whereDeCount()).toEqual(whereDeFindMany());
  });

  test('SIN_CALCULAR se traduce a id.notIn con todos los que tienen snapshot', async () => {
    mockGetNivelTriageActual.mockResolvedValue(
      new Map([
        ['d1', 'ROJO'],
        ['d2', 'VERDE'],
      ]),
    );

    await getDeportistas({ nivelTriage: 'SIN_CALCULAR' });

    expect(whereDeFindMany()).toMatchObject({ id: { notIn: ['d1', 'd2'] } });
    expect(whereDeCount()).toEqual(whereDeFindMany());
  });

  test('resuelve los niveles una sola vez, sobre toda la tabla', async () => {
    mockGetNivelTriageActual.mockResolvedValue(new Map([['d1', 'ROJO']]));

    await getDeportistas({ nivelTriage: 'ROJO' });

    expect(mockGetNivelTriageActual).toHaveBeenCalledTimes(1);
    expect(mockGetNivelTriageActual).toHaveBeenCalledWith();
  });

  test('se compone con el resto de los filtros', async () => {
    mockGetNivelTriageActual.mockResolvedValue(new Map([['d1', 'ROJO']]));

    await getDeportistas({ nivelTriage: 'ROJO', disciplinaId: 'disc-1', estado: 'ACTIVO' });

    expect(whereDeFindMany()).toMatchObject({
      disciplinaId: 'disc-1',
      estado: 'ACTIVO',
      id: { in: ['d1'] },
    });
  });

  test('ningún deportista en ese nivel deja un id.in vacío', async () => {
    mockGetNivelTriageActual.mockResolvedValue(new Map([['d1', 'VERDE']]));
    mockPrisma.deportista.findMany.mockResolvedValue([]);
    mockPrisma.deportista.count.mockResolvedValue(0);

    const { deportistas, total } = await getDeportistas({ nivelTriage: 'ROJO' });

    expect(whereDeFindMany()).toMatchObject({ id: { in: [] } });
    expect(deportistas).toEqual([]);
    expect(total).toBe(0);
  });

  test('las filas devueltas traen el nivel del Map ya resuelto', async () => {
    mockGetNivelTriageActual.mockResolvedValue(new Map([['d1', 'ROJO']]));
    mockPrisma.deportista.findMany.mockResolvedValue([FILA_1]);

    const { deportistas } = await getDeportistas({ nivelTriage: 'ROJO' });

    expect(deportistas[0].nivelTriage).toBe('ROJO');
  });
});
