import { describe, test, expect, vi, beforeEach } from 'vitest';

const { mockPrisma, mockMiembros, mockNombres } = vi.hoisted(() => ({
  mockPrisma: { turno: { findMany: vi.fn(), count: vi.fn(), groupBy: vi.fn() } },
  mockMiembros: vi.fn(),
  mockNombres: vi.fn(),
}));

vi.mock('@/lib/tenant/db', async () =>
  (await import('@/test-utils/tenant')).moduloDbMock(mockPrisma),
);
vi.mock('@/lib/tenant/miembros', () => ({
  getMiembrosDelClub: mockMiembros,
  getNombresDeUsuarios: mockNombres,
  nombreVisible: (m: { nombre: string; apellido: string; email: string; userId: string }) =>
    `${m.nombre} ${m.apellido}`.trim() || m.email || m.userId,
}));

import { filtroFechaTurnos, getTurnos, getTurnosPorProfesional } from '../turnos';
import { semanaDeClave } from '@/lib/utils/fecha';

beforeEach(() => {
  vi.clearAllMocks();
  mockPrisma.turno.findMany.mockResolvedValue([]);
  mockPrisma.turno.count.mockResolvedValue(0);
  mockPrisma.turno.groupBy.mockResolvedValue([]);
  mockMiembros.mockResolvedValue([]);
  mockNombres.mockResolvedValue({});
});

describe('getTurnos — semana', () => {
  test('desde/hasta de la semana van half-open sobre fecha, en findMany y count', async () => {
    const semana = semanaDeClave('2026-03-11');
    await getTurnos({ desde: semana.desdeClave, hasta: semana.hastaClave });

    const where = mockPrisma.turno.findMany.mock.calls[0][0].where;
    expect(where.fecha).toEqual({
      gte: new Date('2026-03-09T00:00:00.000Z'),
      lt: new Date('2026-03-16T00:00:00.000Z'),
    });
    expect(mockPrisma.turno.count.mock.calls[0][0].where).toEqual(where);
  });

  test('sin desde/hasta no filtra por fecha (modo "Todos")', async () => {
    await getTurnos({ profesionalId: 'user_p' });

    const where = mockPrisma.turno.findMany.mock.calls[0][0].where;
    expect(where).not.toHaveProperty('fecha');
    expect(where.profesionalId).toBe('user_p');
  });

  test('una fecha inválida se ignora en vez de tirar', () => {
    expect(filtroFechaTurnos('2026-02-31', 'basura')).toEqual({});
    expect(filtroFechaTurnos('2026-03-09', undefined)).toEqual({
      fecha: { gte: new Date('2026-03-09T00:00:00.000Z') },
    });
  });

  test('trae la categoría de cada deportista', async () => {
    await getTurnos();

    const include = mockPrisma.turno.findMany.mock.calls[0][0].include;
    expect(include.deportistas.include.deportista.select.categoria).toEqual({
      select: { id: true, nombre: true },
    });
  });
});

describe('getTurnosPorProfesional', () => {
  test('agrupa por profesional en el rango y resuelve nombre y rol', async () => {
    mockPrisma.turno.groupBy.mockResolvedValue([
      { profesionalId: 'u1', _count: { _all: 2 } },
      { profesionalId: 'u2', _count: { _all: 5 } },
      { profesionalId: 'u_ex', _count: { _all: 2 } },
    ]);
    mockMiembros.mockResolvedValue([
      { userId: 'u1', rol: 'medico', nombre: 'Ana', apellido: 'Torres', email: 'a@x.com' },
      { userId: 'u2', rol: 'nutricionista', nombre: 'Luis', apellido: 'Paz', email: 'l@x.com' },
    ]);
    mockNombres.mockResolvedValue({ u_ex: 'Ex Miembro' });

    const r = await getTurnosPorProfesional('2026-03-09', '2026-03-15');

    const [args] = mockPrisma.turno.groupBy.mock.calls[0];
    expect(args.by).toEqual(['profesionalId']);
    expect(args.where).toEqual({
      fecha: {
        gte: new Date('2026-03-09T00:00:00.000Z'),
        lt: new Date('2026-03-16T00:00:00.000Z'),
      },
    });
    expect(mockMiembros).toHaveBeenCalledWith({ incluirInactivos: true });
    expect(mockNombres).toHaveBeenCalledWith(['u_ex']);
    expect(r).toEqual([
      { profesionalId: 'u2', nombre: 'Luis Paz', rol: 'nutricionista', cantidad: 5 },
      { profesionalId: 'u1', nombre: 'Ana Torres', rol: 'medico', cantidad: 2 },
      { profesionalId: 'u_ex', nombre: 'Ex Miembro', rol: null, cantidad: 2 },
    ]);
  });

  test('sin turnos no consulta Clerk', async () => {
    const r = await getTurnosPorProfesional();

    expect(r).toEqual([]);
    expect(mockPrisma.turno.groupBy.mock.calls[0][0].where).toEqual({});
    expect(mockMiembros).not.toHaveBeenCalled();
  });

  test('si todos son miembros no pide nombres sueltos', async () => {
    mockPrisma.turno.groupBy.mockResolvedValue([{ profesionalId: 'u1', _count: { _all: 1 } }]);
    mockMiembros.mockResolvedValue([
      { userId: 'u1', rol: 'medico', nombre: 'Ana', apellido: 'Torres', email: 'a@x.com' },
    ]);

    await getTurnosPorProfesional();

    expect(mockNombres).not.toHaveBeenCalled();
  });
});
