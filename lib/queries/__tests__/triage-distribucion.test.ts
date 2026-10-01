import { describe, test, expect, vi, beforeEach } from 'vitest';

/**
 * `getDistribucionTriage` va en su propio archivo y no dentro de
 * `triage.test.ts` a propósito: ese archivo assertea el texto exacto del
 * `ORDER BY` de `getNivelTriageActual`, y que siga verde **sin una sola edición**
 * después de extraer los fragmentos `Prisma.Sql` compartidos es la prueba de que
 * el refactor fue inerte. Tocarlo para sumar un mock destruiría esa prueba.
 */
const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    $queryRaw: vi.fn(),
    deportista: { count: vi.fn() },
  },
}));

vi.mock('@/lib/db', () => ({ prisma: mockPrisma }));

import { getDistribucionTriage } from '../triage';

const CORTE = new Date('2026-03-09T03:00:00.000Z');

/** Una fila cruda como la devuelve el `$queryRaw` (ya con los casts aplicados). */
function fila(
  nivel: string,
  actual: number,
  previo: number,
  totalPrevio: number,
  ultimoPrevio: Date | null = null,
) {
  return {
    nivel,
    actual,
    previo,
    total_previo: totalPrevio,
    ultimo_previo: ultimoPrevio,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockPrisma.deportista.count.mockResolvedValue(0);
});

describe('getDistribucionTriage — el SQL', () => {
  beforeEach(() => {
    mockPrisma.$queryRaw.mockResolvedValue([]);
  });

  /**
   * LA trampa de `$queryRaw` en este repo: sin `::int`, Postgres devuelve `bigint`,
   * Prisma lo entrega como `BigInt` y tanto el render de React como
   * `JSON.stringify` explotan. Ya pasó una vez (`lib/insights/run.ts:29` convierte
   * bigint → Number a mano). Si alguien agrega un COUNT sin cast, falla acá.
   */
  test('todos los COUNT(*) llevan ::int para no devolver BigInt', async () => {
    await getDistribucionTriage(CORTE);

    const [query] = mockPrisma.$queryRaw.mock.calls[0];
    const counts = query.sql.match(/COUNT\(\*\)(::int)?/g) ?? [];
    expect(counts.length).toBeGreaterThan(0);
    expect(counts.every((c: string) => c === 'COUNT(*)::int')).toBe(true);
  });

  // `::text` para no depender de cómo Prisma mapea el enum en una query cruda.
  test('el nivel sale casteado a ::text', async () => {
    await getDistribucionTriage(CORTE);

    const [query] = mockPrisma.$queryRaw.mock.calls[0];
    expect(query.sql).toContain('COALESCE(a.nivel, p.nivel)::text AS nivel');
  });

  /**
   * El corte va como PARÁMETRO, no interpolado en el texto. Interpolarlo sería
   * inyección y además dejaría que el driver serialice la fecha de cualquier forma.
   */
  test('el corte del CTE previo viaja como parámetro, no interpolado', async () => {
    await getDistribucionTriage(CORTE);

    const [query] = mockPrisma.$queryRaw.mock.calls[0];
    expect(query.sql).toContain('WHERE triage.calculated_at < ?');
    expect(query.values).toEqual([CORTE]);
    expect(query.sql).not.toContain('2026-03-09');
  });

  /**
   * El número de la card tiene que coincidir con el listado que linkea. La card
   * lleva `filter[estado]=ACTIVO` en la URL, así que la query cuenta con el mismo
   * criterio: `getDeportistas` con `filter[nivelTriage]` NO filtra por estado.
   */
  test('solo cuenta deportistas ACTIVOS, igual que el link de la card', async () => {
    await getDistribucionTriage(CORTE);

    const [query] = mockPrisma.$queryRaw.mock.calls[0];
    expect(query.sql).toContain("SELECT id FROM deportistas WHERE estado = 'ACTIVO'");
    expect(query.sql).toContain('JOIN activos ON activos.id = triage.deportista_id');
  });

  // El mismo par indivisible que usa `getNivelTriageActual`: si se invierte, los
  // dos CTEs devuelven el snapshot más VIEJO de cada deportista.
  test('los dos CTEs ordenan por deportista_id y calculated_at DESC', async () => {
    await getDistribucionTriage(CORTE);

    const [query] = mockPrisma.$queryRaw.mock.calls[0];
    const ordenes = query.sql.match(
      /ORDER BY triage\.deportista_id, triage\.calculated_at DESC/g,
    );
    expect(ordenes).toHaveLength(2);
    expect(query.sql.match(/DISTINCT ON \(triage\.deportista_id\)/g)).toHaveLength(2);
  });

  // FULL OUTER: un nivel que existe hoy pero no existía antes (o al revés) tiene
  // que aparecer igual. Un INNER JOIN lo perdería y el delta mentiría.
  test('une los dos conteos con FULL OUTER JOIN', async () => {
    await getDistribucionTriage(CORTE);

    const [query] = mockPrisma.$queryRaw.mock.calls[0];
    expect(query.sql).toContain('FULL OUTER JOIN conteo_previo p ON p.nivel = a.nivel');
  });

  test('el denominador sale de un count de ACTIVOS, no de la tabla de triage', async () => {
    await getDistribucionTriage(CORTE);

    expect(mockPrisma.deportista.count).toHaveBeenCalledWith({
      where: { estado: 'ACTIVO' },
    });
  });
});

describe('getDistribucionTriage — el resultado', () => {
  test('hace zero-fill de los 4 niveles aunque la query devuelva uno solo', async () => {
    mockPrisma.$queryRaw.mockResolvedValue([fila('ROJO', 3, 1, 12)]);
    mockPrisma.deportista.count.mockResolvedValue(10);

    const r = await getDistribucionTriage(CORTE);

    expect(r.actual).toEqual({ VERDE: 0, AMARILLO: 0, NARANJA: 0, ROJO: 3 });
    expect(r.previo).toEqual({ VERDE: 0, AMARILLO: 0, NARANJA: 0, ROJO: 1 });
  });

  test('suma el total con triage a partir de los conteos actuales', async () => {
    mockPrisma.$queryRaw.mockResolvedValue([
      fila('VERDE', 5, 6, 10),
      fila('ROJO', 3, 1, 10),
    ]);
    mockPrisma.deportista.count.mockResolvedValue(20);

    const r = await getDistribucionTriage(CORTE);

    expect(r.totalConTriage).toBe(8);
    expect(r.sinCalcular).toBe(12);
    expect(r.totalActivos).toBe(20);
  });

  /**
   * EL CASO REAL DEL DÍA 1, no un borde exótico: la base no tiene seed de triage,
   * el cron escribe filas *dentro* de la semana actual, así que no hay NADA antes
   * del corte. `previo` tiene que ser `null` y no un objeto en cero: si fuera
   * cero, la UI no podría distinguir "no hay base" de "había base y era 0", y
   * mostraría un 0% mentiroso o un Infinity.
   */
  test('sin ninguna fila antes del corte devuelve previo: null, NO un objeto en cero', async () => {
    mockPrisma.$queryRaw.mockResolvedValue([fila('ROJO', 3, 0, 0)]);

    const r = await getDistribucionTriage(CORTE);

    expect(r.previo).toBeNull();
    expect(r.ultimoPrevio).toBeNull();
    expect(r.actual.ROJO).toBe(3);
  });

  test('con base previa devuelve el objeto de conteos, incluso si un nivel está en cero', async () => {
    mockPrisma.$queryRaw.mockResolvedValue([fila('ROJO', 3, 0, 15)]);

    const r = await getDistribucionTriage(CORTE);

    // total_previo = 15 ⇒ HAY base; que ROJO estuviera en 0 es un dato, no un hueco.
    expect(r.previo).not.toBeNull();
    expect(r.previo?.ROJO).toBe(0);
  });

  /**
   * Si el cron falló una semana, el baseline no es "la semana anterior" sino la
   * última corrida que haya. La UI usa esta fecha para decir "vs. 9 de marzo" en
   * lugar de afirmar algo que no es cierto.
   */
  test('expone el ultimoPrevio para que la UI no afirme "vs. la semana anterior" de más', async () => {
    const ultimo = new Date('2026-03-02T11:00:00.000Z');
    mockPrisma.$queryRaw.mockResolvedValue([fila('VERDE', 2, 2, 8, ultimo)]);

    const r = await getDistribucionTriage(CORTE);

    expect(r.ultimoPrevio).toEqual(ultimo);
  });

  /**
   * Base completamente vacía: la query devuelve 0 filas (el FULL OUTER JOIN de dos
   * conjuntos vacíos no produce nada, así que ni `total_previo` llega). Tiene que
   * salir todo en cero y `sinCalcular` igual al plantel entero — que es justamente
   * la información útil, y el motivo de que el bucket exista.
   */
  test('con la tabla de triage vacía todo queda en cero y sinCalcular es el plantel', async () => {
    mockPrisma.$queryRaw.mockResolvedValue([]);
    mockPrisma.deportista.count.mockResolvedValue(250);

    const r = await getDistribucionTriage(CORTE);

    expect(r.actual).toEqual({ VERDE: 0, AMARILLO: 0, NARANJA: 0, ROJO: 0 });
    expect(r.previo).toBeNull();
    expect(r.totalConTriage).toBe(0);
    expect(r.sinCalcular).toBe(250);
  });

  // Defensa contra el dato incoherente: si hubiera más snapshots que activos (una
  // carrera con una baja, por ejemplo), sinCalcular no puede volverse negativo.
  test('sinCalcular nunca es negativo', async () => {
    mockPrisma.$queryRaw.mockResolvedValue([fila('VERDE', 30, 0, 0)]);
    mockPrisma.deportista.count.mockResolvedValue(10);

    expect((await getDistribucionTriage(CORTE)).sinCalcular).toBe(0);
  });

  // Un nivel nuevo en la base y todavía no en NIVEL_TRIAGE_LABELS se ignora: la
  // barra prefiere quedar corta antes que tirar el dashboard entero.
  test('un nivel desconocido no rompe el render', async () => {
    mockPrisma.$queryRaw.mockResolvedValue([
      fila('VERDE', 2, 2, 5),
      fila('VIOLETA', 9, 9, 5),
    ]);

    const r = await getDistribucionTriage(CORTE);

    expect(Object.keys(r.actual).sort()).toEqual(['AMARILLO', 'NARANJA', 'ROJO', 'VERDE']);
    expect(r.totalConTriage).toBe(2);
  });
});
