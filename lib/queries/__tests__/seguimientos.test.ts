import { describe, test, expect, vi, beforeEach } from 'vitest';

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    seguimiento: { findMany: vi.fn(), count: vi.fn(), groupBy: vi.fn() },
  },
}));

vi.mock('@/lib/tenant/db', async () =>
  (await import('@/test-utils/tenant')).moduloDbMock(mockPrisma),
);

import {
  buildWhere,
  getConteoPorTipoSeguimiento,
  getConteoSeguimientosDeportista,
  getSeguimientos,
  parsePrioridades,
  parseTipoSeguimiento,
} from '../seguimientos';

beforeEach(() => {
  vi.clearAllMocks();
  mockPrisma.seguimiento.findMany.mockResolvedValue([]);
  mockPrisma.seguimiento.count.mockResolvedValue(0);
  mockPrisma.seguimiento.groupBy.mockResolvedValue([]);
});

describe('parsePrioridades', () => {
  test('un solo valor (links del dashboard)', () => {
    expect(parsePrioridades('ALTA')).toEqual(['ALTA']);
  });

  test('parámetro repetido', () => {
    expect(parsePrioridades(['ALTA', 'MEDIA'])).toEqual(['MEDIA', 'ALTA']);
  });

  test('separado por comas, con espacios y minúsculas', () => {
    expect(parsePrioridades('urgente, alta')).toEqual(['ALTA', 'URGENTE']);
  });

  test('mezcla de repetido y comas, sin duplicados', () => {
    expect(parsePrioridades(['ALTA,BAJA', 'ALTA'])).toEqual(['BAJA', 'ALTA']);
  });

  test('descarta lo inválido y lo vacío', () => {
    expect(parsePrioridades('CRITICA,,ALTA')).toEqual(['ALTA']);
    expect(parsePrioridades(undefined)).toEqual([]);
    expect(parsePrioridades('')).toEqual([]);
    expect(parsePrioridades([])).toEqual([]);
  });
});

describe('parseTipoSeguimiento', () => {
  test('acepta un tipo válido, en cualquier caja', () => {
    expect(parseTipoSeguimiento('antropometria')).toBe('ANTROPOMETRIA');
    expect(parseTipoSeguimiento(['TRAUMATOLOGIA', 'GENERICO'])).toBe('TRAUMATOLOGIA');
  });

  test('inválido o ausente da undefined', () => {
    expect(parseTipoSeguimiento('OTRO')).toBeUndefined();
    expect(parseTipoSeguimiento(undefined)).toBeUndefined();
  });
});

describe('buildWhere — prioridad multivalor', () => {
  test('un string queda como igualdad (compatibilidad)', () => {
    expect(buildWhere({ prioridad: 'ALTA' })).toEqual({ prioridad: 'ALTA' });
  });

  test('un array de un elemento también queda como igualdad', () => {
    expect(buildWhere({ prioridad: ['URGENTE'] })).toEqual({ prioridad: 'URGENTE' });
  });

  test('varios valores van con `in`', () => {
    expect(buildWhere({ prioridad: ['ALTA', 'URGENTE'] })).toEqual({
      prioridad: { in: ['ALTA', 'URGENTE'] },
    });
  });

  test('un array vacío no filtra', () => {
    expect(buildWhere({ prioridad: [] })).toEqual({});
  });

  test('desde la URL con comas llega como `in` a getSeguimientos', async () => {
    await getSeguimientos({ prioridad: parsePrioridades('ALTA,MEDIA') });

    const [args] = mockPrisma.seguimiento.findMany.mock.calls[0];
    expect(args.where.prioridad).toEqual({ in: ['MEDIA', 'ALTA'] });
    expect(mockPrisma.seguimiento.count.mock.calls[0][0].where).toEqual(args.where);
  });
});

describe('buildWhere — tipo', () => {
  test('GENÉRICO incluye los seguimientos sin tipo', () => {
    expect(buildWhere({ tipoSeguimiento: 'GENERICO' })).toEqual({
      AND: [{ OR: [{ tipoSeguimiento: 'GENERICO' }, { tipoSeguimiento: null }] }],
    });
  });

  test('otro tipo filtra por igualdad', () => {
    expect(buildWhere({ tipoSeguimiento: 'TRAUMATOLOGIA' })).toEqual({
      AND: [{ tipoSeguimiento: 'TRAUMATOLOGIA' }],
    });
  });
});

describe('getConteoPorTipoSeguimiento', () => {
  test('hace zero-fill de los 6 tipos y suma null en GENÉRICO', async () => {
    mockPrisma.seguimiento.groupBy.mockResolvedValue([
      { tipoSeguimiento: null, _count: { _all: 4 } },
      { tipoSeguimiento: 'GENERICO', _count: { _all: 3 } },
      { tipoSeguimiento: 'ANTROPOMETRIA', _count: { _all: 5 } },
    ]);

    const r = await getConteoPorTipoSeguimiento();

    expect(r.porTipo).toEqual({
      GENERICO: 7,
      TRAUMATOLOGIA: 0,
      HISTORIA_CLINICA: 0,
      EVALUACION_PSICOLOGICA: 0,
      EVALUACION_CARDIOLOGICA: 0,
      ANTROPOMETRIA: 5,
    });
    expect(r.total).toBe(12);
  });

  test('agrupa por tipoSeguimiento con el mismo where que el listado', async () => {
    const filtros = {
      prioridad: ['ALTA', 'URGENTE'] as const,
      profesionalId: 'user_p',
      disciplinaId: 'disc_1',
      search: 'ana',
    };
    await getConteoPorTipoSeguimiento(filtros);

    const [args] = mockPrisma.seguimiento.groupBy.mock.calls[0];
    expect(args.by).toEqual(['tipoSeguimiento']);
    expect(args._count).toEqual({ _all: true });
    expect(args.where).toEqual(buildWhere(filtros));
    expect(args.where.profesionalId).toBe('user_p');
  });

  test('ignora un filtro de tipo aunque venga en los filtros', async () => {
    await getConteoPorTipoSeguimiento({ tipoSeguimiento: 'TRAUMATOLOGIA' } as never);

    const [args] = mockPrisma.seguimiento.groupBy.mock.calls[0];
    expect(JSON.stringify(args.where)).not.toContain('tipoSeguimiento');
  });

  test('un tipo desconocido se ignora en vez de romper', async () => {
    mockPrisma.seguimiento.groupBy.mockResolvedValue([
      { tipoSeguimiento: 'INEXISTENTE', _count: { _all: 2 } },
    ]);

    const r = await getConteoPorTipoSeguimiento();

    expect(r.total).toBe(0);
  });
});

describe('getConteoSeguimientosDeportista', () => {
  test('cuenta los seguimientos en los que participa el deportista', async () => {
    mockPrisma.seguimiento.count.mockResolvedValue(9);

    const n = await getConteoSeguimientosDeportista('dep_1');

    expect(n).toBe(9);
    expect(mockPrisma.seguimiento.count).toHaveBeenCalledWith({
      where: { AND: [{ deportistas: { some: { deportistaId: 'dep_1' } } }] },
    });
  });
});
