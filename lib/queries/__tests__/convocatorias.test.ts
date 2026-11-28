import { describe, test, expect, vi, beforeEach } from 'vitest';

const { mockPrisma, mockNombres, mockGetFotoUrl } = vi.hoisted(() => ({
  mockPrisma: {
    convocatoria: { findMany: vi.fn(), count: vi.fn(), findUnique: vi.fn() },
  },
  mockNombres: vi.fn(),
  mockGetFotoUrl: vi.fn(),
}));

vi.mock('@/lib/tenant/db', async () =>
  (await import('@/test-utils/tenant')).moduloDbMock(mockPrisma),
);
vi.mock('@/lib/tenant/miembros', () => ({ getNombresDeUsuarios: mockNombres }));
vi.mock('@/lib/s3', () => ({ getFotoUrl: mockGetFotoUrl }));

import { getConvocatoriaById, getConvocatorias } from '../convocatorias';

beforeEach(() => {
  vi.clearAllMocks();
  mockPrisma.convocatoria.findMany.mockResolvedValue([]);
  mockPrisma.convocatoria.count.mockResolvedValue(0);
  mockNombres.mockResolvedValue({ user_e: 'Carlos Entrenador' });
  mockGetFotoUrl.mockImplementation(async (key: string | null) => (key ? `https://s3/${key}` : null));
});

describe('getConvocatorias', () => {
  test('incluye esPropio de local y visitante para derivar la condición', async () => {
    await getConvocatorias({ callerId: 'u', isAdmin: true });

    const include = mockPrisma.convocatoria.findMany.mock.calls[0][0].include;
    expect(include.evento.include.local).toEqual({ select: { nombre: true, esPropio: true } });
    expect(include.evento.include.visitante).toEqual({ select: { nombre: true, esPropio: true } });
  });
});

describe('getConvocatoriaById', () => {
  const fila = {
    id: 'conv_1',
    eventoTorneoId: 'ev_1',
    disciplinaId: 'disc_1',
    categoriaId: 'cat_1',
    horaCitacion: '14:00',
    lugar: 'Estadio',
    observaciones: null,
    entrenadorId: 'user_e',
    registradoPor: 'user_r',
    disciplina: { nombre: 'Fútbol' },
    categoria: { nombre: '4ta' },
    evento: {
      estado: 'REPROGRAMADO',
      dia: { fecha: new Date('2026-03-14T00:00:00.000Z') },
      local: { nombre: 'Talleres', esPropio: false },
      visitante: { nombre: 'Gimnasia LP', esPropio: true },
    },
    convocados: [
      {
        deportista: {
          id: 'd1',
          apellido: 'Torres',
          nombre: 'Ana',
          posicion: 'Arquero',
          estado: 'ACTIVO',
          fotoKey: 'clubes/club_test/deportistas/a.jpg',
        },
      },
      {
        deportista: {
          id: 'd2',
          apellido: 'Paz',
          nombre: 'Luis',
          posicion: null,
          estado: 'LESIONADO',
          fotoKey: null,
        },
      },
    ],
  };

  test('null si no existe', async () => {
    mockPrisma.convocatoria.findUnique.mockResolvedValue(null);
    expect(await getConvocatoriaById('x')).toBeNull();
    expect(mockNombres).not.toHaveBeenCalled();
  });

  test('pide estado y foto de los convocados', async () => {
    mockPrisma.convocatoria.findUnique.mockResolvedValue(fila);
    await getConvocatoriaById('conv_1');

    const include = mockPrisma.convocatoria.findUnique.mock.calls[0][0].include;
    expect(include.convocados.include.deportista.select).toMatchObject({
      posicion: true,
      estado: true,
      fotoKey: true,
    });
  });

  test('serializa condición, rival, entrenador, chips y convocados', async () => {
    mockPrisma.convocatoria.findUnique.mockResolvedValue(fila);

    const r = await getConvocatoriaById('conv_1');

    expect(mockNombres).toHaveBeenCalledWith(['user_e']);
    expect(r).toMatchObject({
      entrenadorNombre: 'Carlos Entrenador',
      disciplina: 'Fútbol',
      categoria: '4ta',
      partido: {
        fecha: '2026-03-14',
        local: 'Talleres',
        visitante: 'Gimnasia LP',
        estado: 'REPROGRAMADO',
        condicion: 'Visitante',
        rival: 'Talleres',
      },
    });
    expect(r?.convocados).toEqual([
      {
        id: 'd1',
        apellido: 'Torres',
        nombre: 'Ana',
        posicion: 'Arquero',
        estado: 'ACTIVO',
        fotoUrl: 'https://s3/clubes/club_test/deportistas/a.jpg',
      },
      { id: 'd2', apellido: 'Paz', nombre: 'Luis', posicion: null, estado: 'LESIONADO', fotoUrl: null },
    ]);
  });

  test('si el entrenador no se resuelve queda el id', async () => {
    mockPrisma.convocatoria.findUnique.mockResolvedValue(fila);
    mockNombres.mockResolvedValue({});

    const r = await getConvocatoriaById('conv_1');

    expect(r?.entrenadorNombre).toBe('user_e');
  });
});
