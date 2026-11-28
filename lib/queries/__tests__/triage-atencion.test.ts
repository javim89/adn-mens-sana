import { describe, test, expect, vi, beforeEach } from 'vitest';

const { mockPrisma, mockGetFotoUrl } = vi.hoisted(() => ({
  mockPrisma: { $queryRaw: vi.fn(), triage: { findFirst: vi.fn() } },
  mockGetFotoUrl: vi.fn(),
}));

vi.mock('@/lib/tenant/db', async () =>
  (await import('@/test-utils/tenant')).moduloDbMock(mockPrisma),
);
vi.mock('@/lib/s3', () => ({ getFotoUrl: mockGetFotoUrl }));

import { getAtencionPrioritaria, getTriageDeportista } from '../triage';
import { CLUB_TEST } from '@/test-utils/tenant';

beforeEach(() => {
  vi.clearAllMocks();
  mockPrisma.$queryRaw.mockResolvedValue([]);
  mockGetFotoUrl.mockImplementation(async (key: string | null) => (key ? `https://s3/${key}` : null));
});

function sqlPlano(): string {
  const [query] = mockPrisma.$queryRaw.mock.calls[0];
  return query.sql.replace(/\s+/g, ' ');
}

describe('getAtencionPrioritaria', () => {
  test('toma el snapshot vigente con el par DISTINCT ON + ORDER BY', async () => {
    await getAtencionPrioritaria();

    const sql = sqlPlano();
    expect(sql).toContain('DISTINCT ON (triage.deportista_id)');
    expect(sql).toContain('ORDER BY triage.deportista_id, triage.calculated_at DESC');
  });

  test('filtra por el club en triage y en deportistas, como parámetro', async () => {
    await getAtencionPrioritaria();

    const [query] = mockPrisma.$queryRaw.mock.calls[0];
    const sql = sqlPlano();
    expect(sql).toContain('WHERE triage.club_id = ?');
    expect(sql).toContain('WHERE d.club_id = ?');
    expect(query.values.filter((v: unknown) => v === CLUB_TEST.id)).toHaveLength(2);
    expect(query.sql).not.toContain(CLUB_TEST.id);
  });

  test('solo deportistas ACTIVOS y deja afuera los VERDE después del DISTINCT ON', async () => {
    await getAtencionPrioritaria();

    const sql = sqlPlano();
    expect(sql).toContain("d.estado = 'ACTIVO'");
    expect(sql).toContain("v.nivel::text <> 'VERDE'");
    // El filtro de nivel va en la consulta externa, no dentro del CTE `vigente`.
    const cte = sql.slice(0, sql.indexOf(') SELECT'));
    expect(cte).not.toContain('VERDE');
  });

  test('ordena ROJO > NARANJA > AMARILLO y luego por puntaje desc', async () => {
    await getAtencionPrioritaria();

    const sql = sqlPlano();
    const orden = sql.slice(sql.lastIndexOf('ORDER BY'));
    expect(orden).toMatch(/WHEN 'ROJO' THEN 0 WHEN 'NARANJA' THEN 1 WHEN 'AMARILLO' THEN 2/);
    expect(orden.indexOf('END')).toBeLessThan(orden.indexOf('v.puntaje_total DESC'));
  });

  test('el límite va como parámetro (default 5)', async () => {
    await getAtencionPrioritaria();
    expect(mockPrisma.$queryRaw.mock.calls[0][0].values.at(-1)).toBe(5);

    await getAtencionPrioritaria(3);
    const [query] = mockPrisma.$queryRaw.mock.calls[1];
    expect(query.sql).toContain('LIMIT ?');
    expect(query.values.at(-1)).toBe(3);
  });

  test('mapea las filas con foto firmada y los 2 motivos principales', async () => {
    mockPrisma.$queryRaw.mockResolvedValue([
      {
        deportista_id: 'd1',
        nombre: 'Ana',
        apellido: 'Torres',
        foto_key: 'clubes/club_test/deportistas/x.jpg',
        categoria: '4ta',
        nivel: 'ROJO',
        puntaje_total: 7,
        desglose: [
          { area: 'SOCIAL', regla: 'Vive en pensión', puntos: 2 },
          { area: 'MEDICA', regla: 'Seguimiento médico URGENTE', puntos: 3 },
          { area: 'MEDICA', regla: 'Sin obra social', puntos: 1 },
          { area: 'DEPORTIVA', regla: 'Dos o más ausencias en la semana', puntos: 2 },
        ],
      },
      {
        deportista_id: 'd2',
        nombre: 'Luis',
        apellido: 'Paz',
        foto_key: null,
        categoria: null,
        nivel: 'AMARILLO',
        puntaje_total: 2,
        desglose: 'basura',
      },
    ]);

    const r = await getAtencionPrioritaria();

    expect(r).toEqual([
      {
        deportistaId: 'd1',
        nombre: 'Ana',
        apellido: 'Torres',
        fotoUrl: 'https://s3/clubes/club_test/deportistas/x.jpg',
        categoria: '4ta',
        nivel: 'ROJO',
        puntaje: 7,
        motivos: ['Seguimiento médico URGENTE', 'Vive en pensión'],
      },
      {
        deportistaId: 'd2',
        nombre: 'Luis',
        apellido: 'Paz',
        fotoUrl: null,
        categoria: null,
        nivel: 'AMARILLO',
        puntaje: 2,
        motivos: [],
      },
    ]);
  });
});

describe('getTriageDeportista', () => {
  test('devuelve el último snapshot con motivos y desglose saneado', async () => {
    mockPrisma.triage.findFirst.mockResolvedValue({
      nivel: 'NARANJA',
      puntajeTotal: 4,
      desglose: [
        { area: 'SOCIAL', regla: 'Vive en pensión', puntos: 2 },
        { area: 'MEDICA', regla: 'Deportista lesionado', puntos: 2 },
        { regla: 'sin área', puntos: 9 },
      ],
      calculatedAt: new Date('2026-03-09T11:00:00.000Z'),
    });

    const r = await getTriageDeportista('d1');

    expect(mockPrisma.triage.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { deportistaId: 'd1' }, orderBy: { calculatedAt: 'desc' } }),
    );
    expect(r).toEqual({
      nivel: 'NARANJA',
      puntaje: 4,
      motivos: ['Vive en pensión', 'Deportista lesionado'],
      desglose: [
        { area: 'SOCIAL', regla: 'Vive en pensión', puntos: 2 },
        { area: 'MEDICA', regla: 'Deportista lesionado', puntos: 2 },
      ],
      calculatedAt: '2026-03-09T11:00:00.000Z',
    });
  });

  test('sin snapshot devuelve null', async () => {
    mockPrisma.triage.findFirst.mockResolvedValue(null);
    expect(await getTriageDeportista('d1')).toBeNull();
  });
});
