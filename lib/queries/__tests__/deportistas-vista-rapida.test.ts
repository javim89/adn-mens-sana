import { describe, test, expect, vi, beforeEach } from 'vitest';

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    seguimiento: { findMany: vi.fn() },
    asistencia: { groupBy: vi.fn() },
    turno: { findFirst: vi.fn() },
  },
}));

vi.mock('@/lib/tenant/db', async () =>
  (await import('@/test-utils/tenant')).moduloDbMock(mockPrisma),
);
vi.mock('@/lib/queries/triage', () => ({ getNivelTriageActual: vi.fn() }));

import { getVistaRapidaDeportista, mesDeClave } from '../deportistas';

// Miércoles 11 de marzo de 2026, 12:00 ART.
const AHORA = new Date('2026-03-11T15:00:00.000Z');

beforeEach(() => {
  vi.clearAllMocks();
  mockPrisma.seguimiento.findMany.mockResolvedValue([]);
  mockPrisma.asistencia.groupBy.mockResolvedValue([]);
  mockPrisma.turno.findFirst.mockResolvedValue(null);
});

describe('mesDeClave', () => {
  test('primer día del mes y del siguiente', () => {
    expect(mesDeClave('2026-03-11')).toEqual({ desdeClave: '2026-03-01', finExclusivoClave: '2026-04-01' });
  });

  test('diciembre pasa al año siguiente', () => {
    expect(mesDeClave('2026-12-31')).toEqual({ desdeClave: '2026-12-01', finExclusivoClave: '2027-01-01' });
  });
});

describe('getVistaRapidaDeportista', () => {
  test('presentismo del mes con la definición "no ausente" y el mes half-open', async () => {
    mockPrisma.asistencia.groupBy.mockResolvedValue([
      { estado: 'PRESENTE', _count: { _all: 6 } },
      { estado: 'LLEGO_TARDE', _count: { _all: 1 } },
      { estado: 'AUSENTE', _count: { _all: 1 } },
    ]);

    const r = await getVistaRapidaDeportista('d1', AHORA);

    expect(r.presentismoMes).toEqual({ registros: 8, asistencias: 7, porcentaje: 88 });
    const [args] = mockPrisma.asistencia.groupBy.mock.calls[0];
    expect(args.where).toEqual({
      deportistaId: 'd1',
      entrenamiento: {
        fecha: {
          gte: new Date('2026-03-01T00:00:00.000Z'),
          lt: new Date('2026-04-01T00:00:00.000Z'),
        },
      },
    });
  });

  test('sin registros el porcentaje es null', async () => {
    const r = await getVistaRapidaDeportista('d1', AHORA);
    expect(r.presentismoMes.porcentaje).toBeNull();
    expect(r.proximoTurno).toBeNull();
  });

  test('últimos 3 seguimientos y próximo turno desde hoy', async () => {
    const turno = { id: 't1', titulo: 'Control', fecha: new Date('2026-03-12T00:00:00.000Z'), hora: '10:00', lugar: 'Sede' };
    mockPrisma.turno.findFirst.mockResolvedValue(turno);

    const r = await getVistaRapidaDeportista('d1', AHORA);

    const seg = mockPrisma.seguimiento.findMany.mock.calls[0][0];
    expect(seg.where).toEqual({ deportistas: { some: { deportistaId: 'd1' } } });
    expect(seg.take).toBe(3);
    expect(seg.orderBy).toEqual({ fecha: 'desc' });
    const t = mockPrisma.turno.findFirst.mock.calls[0][0];
    expect(t.where).toEqual({
      deportistas: { some: { deportistaId: 'd1' } },
      fecha: { gte: new Date('2026-03-11T00:00:00.000Z') },
    });
    expect(r.proximoTurno).toEqual(turno);
  });
  test('con profesionalId el próximo turno se limita a ese profesional', async () => {
    await getVistaRapidaDeportista('d1', AHORA, 'user_pro');
    const t = mockPrisma.turno.findFirst.mock.calls[0][0];
    expect(t.where).toEqual({
      deportistas: { some: { deportistaId: 'd1' } },
      fecha: { gte: new Date('2026-03-11T00:00:00.000Z') },
      profesionalId: 'user_pro',
    });
  });
});
