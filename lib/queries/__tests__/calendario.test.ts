import { describe, test, expect, vi, beforeEach } from 'vitest';

const { mockPrisma } = vi.hoisted(() => {
  const mockPrisma = {
    categoria: { findMany: vi.fn() },
    diaCalendario: { findMany: vi.fn() },
    eventoTorneo: { findMany: vi.fn() },
  };
  return { mockPrisma };
});

vi.mock('@/lib/db', () => ({ prisma: mockPrisma }));

import { getCalendarioData, toDateString } from '../calendario';

describe('toDateString (regresión anti-timezone)', () => {
  test('convierte un Date UTC-medianoche en YYYY-MM-DD sin corrimiento', () => {
    expect(toDateString(new Date('2026-03-07T00:00:00.000Z'))).toBe('2026-03-07');
  });

  test('no desplaza fechas de fin de mes', () => {
    expect(toDateString(new Date('2026-10-31T00:00:00.000Z'))).toBe('2026-10-31');
  });
});

describe('getCalendarioData', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockPrisma.categoria.findMany.mockResolvedValue([
      { id: 'cat-4', nombre: '4ta', orden: 1 },
    ]);

    mockPrisma.diaCalendario.findMany.mockResolvedValue([
      {
        id: 'dia-1',
        fecha: new Date('2026-03-07T00:00:00.000Z'),
        tipo: 'TORNEO',
        numeroFecha: 1,
      },
      {
        id: 'dia-2',
        fecha: new Date('2026-07-18T00:00:00.000Z'),
        tipo: 'RECESO',
        numeroFecha: null,
      },
    ]);

    mockPrisma.eventoTorneo.findMany.mockResolvedValue([
      {
        id: 'ev-1',
        categoriaId: 'cat-4',
        estado: 'PROGRAMADO',
        dia: { fecha: new Date('2026-03-07T00:00:00.000Z') },
        categoria: { nombre: '4ta' },
        local: { nombre: 'GIMNASIA (LP)' },
        visitante: { nombre: 'GIMNASIA' },
      },
    ]);
  });

  test('devuelve las 3 colecciones con la forma esperada', async () => {
    const data = await getCalendarioData();

    expect(data.categorias).toEqual([
      { id: 'cat-4', nombre: '4ta', grupo: 'CUARTA_QUINTA_SEXTA' },
    ]);

    expect(data.dias).toEqual([
      { fecha: '2026-03-07', tipo: 'TORNEO', numeroFecha: 1 },
      { fecha: '2026-07-18', tipo: 'RECESO', numeroFecha: null },
    ]);

    expect(data.eventos).toEqual([
      {
        id: 'ev-1',
        fecha: '2026-03-07',
        categoriaId: 'cat-4',
        categoriaNombre: '4ta',
        grupo: 'CUARTA_QUINTA_SEXTA',
        local: 'GIMNASIA (LP)',
        visitante: 'GIMNASIA',
        estado: 'PROGRAMADO',
      },
    ]);
  });

  test('ordena categorias por orden y dias por fecha (pasa los orderBy correctos)', async () => {
    await getCalendarioData();
    expect(mockPrisma.categoria.findMany).toHaveBeenCalledWith({
      orderBy: { orden: 'asc' },
    });
    expect(mockPrisma.diaCalendario.findMany).toHaveBeenCalledWith({
      orderBy: { fecha: 'asc' },
    });
    expect(mockPrisma.eventoTorneo.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        include: { dia: true, categoria: true, local: true, visitante: true },
      }),
    );
  });

  test('serializa la fecha del evento desde el día relacionado', async () => {
    const data = await getCalendarioData();
    expect(data.eventos[0].fecha).toBe('2026-03-07');
  });
});
