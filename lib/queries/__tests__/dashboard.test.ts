import { describe, test, expect, vi, beforeEach } from 'vitest';

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    $queryRaw: vi.fn(),
    turno: { count: vi.fn(), findMany: vi.fn() },
    asistencia: { groupBy: vi.fn() },
    seguimiento: { groupBy: vi.fn(), findMany: vi.fn() },
    deportista: { groupBy: vi.fn(), findMany: vi.fn() },
    eventoTorneo: { findMany: vi.fn() },
  },
}));

vi.mock('@/lib/db', () => ({ prisma: mockPrisma }));

import {
  getResumenViandas,
  getResumenTurnos,
  getResumenPresentismo,
  getResumenSeguimientos,
  getResumenPlantel,
  getProximosEventos,
} from '../dashboard';

/**
 * Semana del 9 al 15 de marzo de 2026 (lunes a domingo), tal como la devuelve
 * `semanaActual`. Los bordes se pasan explícitos y no calculados por el helper:
 * así un cambio en `lib/utils/fecha.ts` no puede enmascarar un error acá.
 */
const SEMANA = {
  desdeDb: new Date('2026-03-09T00:00:00.000Z'),
  finExclusivoDb: new Date('2026-03-16T00:00:00.000Z'),
};
const SEMANA_PREVIA = {
  desdeDb: new Date('2026-03-02T00:00:00.000Z'),
  finExclusivoDb: new Date('2026-03-09T00:00:00.000Z'),
};
const HOY_DB = new Date('2026-03-11T00:00:00.000Z');

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------

describe('getResumenViandas', () => {
  beforeEach(() => {
    mockPrisma.$queryRaw.mockResolvedValue([]);
  });

  test('hace zero-fill de las 4 comidas aunque la semana esté vacía', async () => {
    const r = await getResumenViandas({ rango: SEMANA });

    expect(r.porComida).toEqual({
      DESAYUNO: { entregas: 0, fueraDeFicha: 0 },
      ALMUERZO: { entregas: 0, fueraDeFicha: 0 },
      MERIENDA: { entregas: 0, fueraDeFicha: 0 },
      CENA: { entregas: 0, fueraDeFicha: 0 },
    });
    expect(r.totalEntregas).toBe(0);
    expect(r.totalFueraDeFicha).toBe(0);
  });

  test('suma los totales sobre las filas que vuelven', async () => {
    mockPrisma.$queryRaw.mockResolvedValue([
      { comida: 'ALMUERZO', entregas: 40, fuera_de_ficha: 3 },
      { comida: 'CENA', entregas: 25, fuera_de_ficha: 2 },
      { comida: 'DESAYUNO', entregas: 10, fuera_de_ficha: 0 },
    ]);

    const r = await getResumenViandas({ rango: SEMANA });

    expect(r.totalEntregas).toBe(75);
    expect(r.totalFueraDeFicha).toBe(5);
    expect(r.porComida.MERIENDA).toEqual({ entregas: 0, fueraDeFicha: 0 });
  });

  /**
   * LA propiedad que no se puede perder: sin el `COALESCE(..., false)` un
   * deportista sin fila en `necesidades_apoyo` da NULL por el LEFT JOIN, NULL no es
   * `false` en una comparación, y el desvío queda invisible JUSTO para el caso de
   * ficha incompleta — que es el más frecuente.
   */
  test('el COALESCE(..., false) está en el SQL, para que la ficha ausente cuente como false', async () => {
    await getResumenViandas({ rango: SEMANA });

    const [query] = mockPrisma.$queryRaw.mock.calls[0];
    // Se colapsan los espacios: el SQL está alineado a mano y un reformateo no
    // tiene que romper un test sobre una propiedad semántica.
    const sql = query.sql.replace(/\s+/g, ' ');
    expect(sql).toContain('COALESCE(na.recibe_almuerzo, false) = false');
    expect(sql).toContain('COALESCE(na.recibe_cena, false) = false');
    expect(sql).toContain('LEFT JOIN necesidades_apoyo na');
  });

  /**
   * DESAYUNO y MERIENDA son de todo el plantel y NUNCA son anomalía. La regla vive
   * en el `FILTER` del SQL y no en un `if` de la UI, así que es testeable: el
   * predicado solo nombra ALMUERZO y CENA.
   */
  test('desayuno y merienda no pueden contar como fuera de ficha, por construcción del FILTER', async () => {
    await getResumenViandas({ rango: SEMANA });

    const [query] = mockPrisma.$queryRaw.mock.calls[0];
    const filtro = query.sql.slice(
      query.sql.indexOf('COUNT(*) FILTER'),
      query.sql.indexOf('FROM entregas_comida'),
    );
    expect(filtro).toContain("e.comida = 'ALMUERZO'");
    expect(filtro).toContain("e.comida = 'CENA'");
    expect(filtro).not.toContain('DESAYUNO');
    expect(filtro).not.toContain('MERIENDA');
  });

  test('los COUNT(*) llevan ::int y la comida ::text', async () => {
    await getResumenViandas({ rango: SEMANA });

    const [query] = mockPrisma.$queryRaw.mock.calls[0];
    expect(query.sql).toContain('COUNT(*)::int');
    expect(query.sql).toContain('e.comida::text AS comida');
    expect(query.sql).toContain(')::int AS fuera_de_ficha');
  });

  // Half-open: `>= desde` y `< finExclusivo`, nunca `<= hasta`.
  test('el rango es half-open y va por parámetros', async () => {
    await getResumenViandas({ rango: SEMANA });

    const [query] = mockPrisma.$queryRaw.mock.calls[0];
    expect(query.sql).toContain('WHERE e.fecha >= ? AND e.fecha < ?');
    expect(query.values).toEqual([SEMANA.desdeDb, SEMANA.finExclusivoDb]);
  });

  // Scoping de viandas: el responsable ve solo SU lugar, que es el único que opera.
  test('con lugar filtra por ese lugar y lo pasa como parámetro', async () => {
    await getResumenViandas({ rango: SEMANA, lugar: 'SEDE' });

    const [query] = mockPrisma.$queryRaw.mock.calls[0];
    expect(query.sql).toContain('AND e.lugar::text = ?');
    expect(query.values).toEqual([SEMANA.desdeDb, SEMANA.finExclusivoDb, 'SEDE']);
  });

  test('sin lugar (admin) no filtra por lugar', async () => {
    await getResumenViandas({ rango: SEMANA });

    const [query] = mockPrisma.$queryRaw.mock.calls[0];
    expect(query.sql).not.toContain('e.lugar');
    expect(query.values).toHaveLength(2);
  });

  test('lugar null se trata como admin, no como filtro vacío', async () => {
    await getResumenViandas({ rango: SEMANA, lugar: null });

    const [query] = mockPrisma.$queryRaw.mock.calls[0];
    expect(query.sql).not.toContain('e.lugar');
  });

  test('una comida desconocida no rompe el resultado', async () => {
    mockPrisma.$queryRaw.mockResolvedValue([
      { comida: 'BRUNCH', entregas: 9, fuera_de_ficha: 9 },
    ]);

    const r = await getResumenViandas({ rango: SEMANA });

    expect(r.totalEntregas).toBe(0);
    expect(Object.keys(r.porComida).sort()).toEqual([
      'ALMUERZO',
      'CENA',
      'DESAYUNO',
      'MERIENDA',
    ]);
  });
});

// ---------------------------------------------------------------------------

describe('getResumenTurnos', () => {
  beforeEach(() => {
    mockPrisma.turno.count.mockResolvedValue(7);
    mockPrisma.turno.findMany.mockResolvedValue([]);
  });

  test('cuenta la semana con bordes half-open', async () => {
    await getResumenTurnos({ rango: SEMANA, desdeHoyDb: HOY_DB });

    expect(mockPrisma.turno.count).toHaveBeenCalledWith({
      where: { fecha: { gte: SEMANA.desdeDb, lt: SEMANA.finExclusivoDb } },
    });
  });

  // Los "próximos" arrancan HOY, no el lunes: un turno del lunes pasado ya pasó.
  test('los próximos arrancan hoy, no el lunes de la semana', async () => {
    await getResumenTurnos({ rango: SEMANA, desdeHoyDb: HOY_DB });

    const [args] = mockPrisma.turno.findMany.mock.calls[0];
    expect(args.where.fecha).toEqual({ gte: HOY_DB });
    expect(args.orderBy).toEqual([{ fecha: 'asc' }, { hora: 'asc' }]);
  });

  /**
   * REGRESIÓN del scoping — se hace al revés muy fácil. `/turnos` muestra al
   * no-admin **solo los propios** (`app/(app)/turnos/page.tsx:34`), así que el
   * número de la card tiene que contar lo mismo.
   */
  test('no-admin: scopea las DOS queries por profesionalId', async () => {
    await getResumenTurnos({ rango: SEMANA, desdeHoyDb: HOY_DB, profesionalId: 'user_1' });

    expect(mockPrisma.turno.count.mock.calls[0][0].where.profesionalId).toBe('user_1');
    expect(mockPrisma.turno.findMany.mock.calls[0][0].where.profesionalId).toBe('user_1');
  });

  test('admin: ninguna de las dos queries lleva profesionalId', async () => {
    await getResumenTurnos({ rango: SEMANA, desdeHoyDb: HOY_DB });

    expect(mockPrisma.turno.count.mock.calls[0][0].where).not.toHaveProperty(
      'profesionalId',
    );
    expect(mockPrisma.turno.findMany.mock.calls[0][0].where).not.toHaveProperty(
      'profesionalId',
    );
  });

  test('aplana los deportistas de la tabla intermedia', async () => {
    mockPrisma.turno.findMany.mockResolvedValue([
      {
        id: 't1',
        titulo: 'Control',
        fecha: new Date('2026-03-12T00:00:00.000Z'),
        hora: '10:00',
        lugar: 'Sede',
        deportistas: [{ deportista: { id: 'd1', nombre: 'Ana', apellido: 'Torres' } }],
      },
    ]);

    const r = await getResumenTurnos({ rango: SEMANA, desdeHoyDb: HOY_DB });

    expect(r.totalSemana).toBe(7);
    expect(r.proximos[0].deportistas).toEqual([
      { id: 'd1', nombre: 'Ana', apellido: 'Torres' },
    ]);
  });

  test('respeta el límite de próximos', async () => {
    await getResumenTurnos({ rango: SEMANA, desdeHoyDb: HOY_DB, limite: 3 });

    expect(mockPrisma.turno.findMany.mock.calls[0][0].take).toBe(3);
  });
});

// ---------------------------------------------------------------------------

describe('getResumenPresentismo', () => {
  beforeEach(() => {
    mockPrisma.asistencia.groupBy.mockResolvedValue([]);
    mockPrisma.deportista.findMany.mockResolvedValue([]);
    mockPrisma.$queryRaw.mockResolvedValue([]);
  });

  /** Helper: los grupos tal como los devuelve `groupBy({ by: ['estado'] })`. */
  function grupos(pares: [string, number][]) {
    return pares.map(([estado, n]) => ({ estado, _count: { _all: n } }));
  }

  /**
   * LA DEFINICIÓN DE NEGOCIO: presentismo = "no ausente". `LLEGO_TARDE` y
   * `SE_RETIRO_ANTES` **cuentan como asistencia**. Si alguien las mueve al
   * numerador equivocado el número cambia y nadie sabría por qué.
   */
  test('LLEGO_TARDE y SE_RETIRO_ANTES cuentan como asistencia', async () => {
    mockPrisma.asistencia.groupBy
      .mockResolvedValueOnce(
        grupos([
          ['PRESENTE', 6],
          ['LLEGO_TARDE', 2],
          ['SE_RETIRO_ANTES', 1],
          ['AUSENTE', 1],
        ]),
      )
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const r = await getResumenPresentismo({ rango: SEMANA, rangoPrevio: SEMANA_PREVIA });

    expect(r.actual.registros).toBe(10);
    expect(r.actual.asistencias).toBe(9);
    expect(r.actual.porcentaje).toBe(90);
  });

  test('solo AUSENTE baja el porcentaje', async () => {
    mockPrisma.asistencia.groupBy
      .mockResolvedValueOnce(grupos([['AUSENTE', 4]]))
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const r = await getResumenPresentismo({ rango: SEMANA, rangoPrevio: SEMANA_PREVIA });

    expect(r.actual.porcentaje).toBe(0);
  });

  // Sin registros no hay porcentaje. `null`, nunca `NaN` ni un 0% mentiroso: con la
  // base sin seed de presentismo éste es el caso real del día 1.
  test('sin registros el porcentaje es null, nunca NaN ni 0', async () => {
    const r = await getResumenPresentismo({ rango: SEMANA, rangoPrevio: SEMANA_PREVIA });

    expect(r.actual.porcentaje).toBeNull();
    expect(r.previo.porcentaje).toBeNull();
    expect(r.actual.registros).toBe(0);
  });

  test('redondea el porcentaje al entero', async () => {
    mockPrisma.asistencia.groupBy
      .mockResolvedValueOnce(
        grupos([
          ['PRESENTE', 2],
          ['AUSENTE', 1],
        ]),
      )
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const r = await getResumenPresentismo({ rango: SEMANA, rangoPrevio: SEMANA_PREVIA });

    expect(r.actual.porcentaje).toBe(67); // 2/3 = 66.66…
  });

  test('las dos semanas usan rangos distintos y half-open', async () => {
    await getResumenPresentismo({ rango: SEMANA, rangoPrevio: SEMANA_PREVIA });

    const [actual, previo] = mockPrisma.asistencia.groupBy.mock.calls;
    expect(actual[0].where.entrenamiento.fecha).toEqual({
      gte: SEMANA.desdeDb,
      lt: SEMANA.finExclusivoDb,
    });
    expect(previo[0].where.entrenamiento.fecha).toEqual({
      gte: SEMANA_PREVIA.desdeDb,
      lt: SEMANA_PREVIA.finExclusivoDb,
    });
  });

  /**
   * REGRESIÓN del scoping — el segundo que se hace al revés fácil.
   * `getEntrenamientos` scopea al no-admin por `entrenadorId`
   * (`lib/queries/presentismo.ts:35`), y el scope va sobre el ENTRENAMIENTO porque
   * `Asistencia` no tiene entrenador propio.
   */
  test('no-admin: las tres queries scopean por entrenadorId', async () => {
    await getResumenPresentismo({
      rango: SEMANA,
      rangoPrevio: SEMANA_PREVIA,
      entrenadorId: 'user_e',
    });

    for (const [args] of mockPrisma.asistencia.groupBy.mock.calls) {
      expect(args.where.entrenamiento.entrenadorId).toBe('user_e');
    }
  });

  test('admin: ninguna query lleva entrenadorId', async () => {
    await getResumenPresentismo({ rango: SEMANA, rangoPrevio: SEMANA_PREVIA });

    for (const [args] of mockPrisma.asistencia.groupBy.mock.calls) {
      expect(args.where.entrenamiento).not.toHaveProperty('entrenadorId');
    }
  });

  // El "2 o más" se empuja a SQL con `having`: sin eso volvería una fila por cada
  // deportista con una sola ausencia, que es casi todo el plantel.
  test('el umbral de 2+ ausencias va en el having, no en JS', async () => {
    await getResumenPresentismo({ rango: SEMANA, rangoPrevio: SEMANA_PREVIA });

    const args = mockPrisma.asistencia.groupBy.mock.calls[2][0];
    expect(args.by).toEqual(['deportistaId']);
    expect(args.where.estado).toBe('AUSENTE');
    expect(args.having).toEqual({ deportistaId: { _count: { gte: 2 } } });
  });

  test('resuelve los nombres de los deportistas con ausentismo reiterado', async () => {
    mockPrisma.asistencia.groupBy
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        { deportistaId: 'd1', _count: { deportistaId: 3 } },
        { deportistaId: 'd2', _count: { deportistaId: 2 } },
      ]);
    mockPrisma.deportista.findMany.mockResolvedValue([
      { id: 'd1', nombre: 'Ana', apellido: 'Torres' },
      { id: 'd2', nombre: 'Luis', apellido: 'Paz' },
    ]);

    const r = await getResumenPresentismo({ rango: SEMANA, rangoPrevio: SEMANA_PREVIA });

    expect(r.ausentismoReiterado).toEqual([
      { id: 'd1', nombre: 'Ana', apellido: 'Torres', ausencias: 3 },
      { id: 'd2', nombre: 'Luis', apellido: 'Paz', ausencias: 2 },
    ]);
  });

  test('sin ausentes no va a buscar nombres', async () => {
    await getResumenPresentismo({ rango: SEMANA, rangoPrevio: SEMANA_PREVIA });

    expect(mockPrisma.deportista.findMany).not.toHaveBeenCalled();
  });

  // Un deportista borrado entre las dos queries no puede meter un `undefined` en la
  // lista y romper el render.
  test('un deportista sin nombre resuelto se descarta en vez de romper', async () => {
    mockPrisma.asistencia.groupBy
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ deportistaId: 'fantasma', _count: { deportistaId: 2 } }]);
    mockPrisma.deportista.findMany.mockResolvedValue([]);

    const r = await getResumenPresentismo({ rango: SEMANA, rangoPrevio: SEMANA_PREVIA });

    expect(r.ausentismoReiterado).toEqual([]);
  });

  describe('porEstado', () => {
    test('hace zero-fill de los 4 estados y vuelca lo que trae el groupBy', async () => {
      mockPrisma.asistencia.groupBy
        .mockResolvedValueOnce(
          grupos([
            ['PRESENTE', 6],
            ['AUSENTE', 3],
          ]),
        )
        .mockResolvedValueOnce(grupos([['LLEGO_TARDE', 2]]))
        .mockResolvedValueOnce([]);

      const r = await getResumenPresentismo({ rango: SEMANA, rangoPrevio: SEMANA_PREVIA });

      expect(r.actual.porEstado).toEqual({
        PRESENTE: 6,
        LLEGO_TARDE: 0,
        SE_RETIRO_ANTES: 0,
        AUSENTE: 3,
      });
      expect(r.previo.porEstado).toEqual({
        PRESENTE: 0,
        LLEGO_TARDE: 2,
        SE_RETIRO_ANTES: 0,
        AUSENTE: 0,
      });
    });

    test('la suma de porEstado coincide con registros', async () => {
      mockPrisma.asistencia.groupBy
        .mockResolvedValueOnce(
          grupos([
            ['PRESENTE', 6],
            ['LLEGO_TARDE', 2],
            ['SE_RETIRO_ANTES', 1],
            ['AUSENTE', 1],
          ]),
        )
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const r = await getResumenPresentismo({ rango: SEMANA, rangoPrevio: SEMANA_PREVIA });

      const suma = Object.values(r.actual.porEstado).reduce((a, b) => a + b, 0);
      expect(suma).toBe(r.actual.registros);
    });

    test('sin registros todos los estados quedan en 0', async () => {
      const r = await getResumenPresentismo({ rango: SEMANA, rangoPrevio: SEMANA_PREVIA });

      expect(r.actual.porEstado).toEqual({
        PRESENTE: 0,
        LLEGO_TARDE: 0,
        SE_RETIRO_ANTES: 0,
        AUSENTE: 0,
      });
    });

    test('no agrega round trips: siguen siendo 3 groupBy', async () => {
      await getResumenPresentismo({ rango: SEMANA, rangoPrevio: SEMANA_PREVIA });

      expect(mockPrisma.asistencia.groupBy).toHaveBeenCalledTimes(3);
      expect(mockPrisma.$queryRaw).toHaveBeenCalledTimes(1);
    });
  });

  describe('porDia', () => {
    const CLAVES_SEMANA = [
      '2026-03-09',
      '2026-03-10',
      '2026-03-11',
      '2026-03-12',
      '2026-03-13',
      '2026-03-14',
      '2026-03-15',
    ];

    test('siempre tiene 7 días, de lunes a domingo, aunque no haya registros', async () => {
      const r = await getResumenPresentismo({ rango: SEMANA, rangoPrevio: SEMANA_PREVIA });

      expect(r.porDia.map((d) => d.clave)).toEqual(CLAVES_SEMANA);
      for (const d of r.porDia) {
        expect(d).toEqual({ clave: d.clave, registros: 0, asistencias: 0, porcentaje: null });
      }
    });

    test('ubica cada fila en su día y deja los demás en null', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([
        { clave: '2026-03-12', registros: 3, asistencias: 2 },
        { clave: '2026-03-09', registros: 10, asistencias: 9 },
      ]);

      const r = await getResumenPresentismo({ rango: SEMANA, rangoPrevio: SEMANA_PREVIA });

      expect(r.porDia).toHaveLength(7);
      expect(r.porDia.map((d) => d.clave)).toEqual(CLAVES_SEMANA);
      expect(r.porDia[0]).toEqual({
        clave: '2026-03-09',
        registros: 10,
        asistencias: 9,
        porcentaje: 90,
      });
      // Mismo redondeo que el semanal: 2/3 = 66.66… → 67.
      expect(r.porDia[3].porcentaje).toBe(67);
      expect(r.porDia[1]).toEqual({
        clave: '2026-03-10',
        registros: 0,
        asistencias: 0,
        porcentaje: null,
      });
    });

    test('un día con registros pero sin asistencias da 0, no null', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([
        { clave: '2026-03-11', registros: 4, asistencias: 0 },
      ]);

      const r = await getResumenPresentismo({ rango: SEMANA, rangoPrevio: SEMANA_PREVIA });

      expect(r.porDia[2].porcentaje).toBe(0);
    });

    test('una fila fuera de la semana no se cuela', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([
        { clave: '2026-03-16', registros: 5, asistencias: 5 },
      ]);

      const r = await getResumenPresentismo({ rango: SEMANA, rangoPrevio: SEMANA_PREVIA });

      expect(r.porDia.every((d) => d.porcentaje === null)).toBe(true);
    });

    test('el SQL es half-open y las fechas van por parámetros', async () => {
      await getResumenPresentismo({ rango: SEMANA, rangoPrevio: SEMANA_PREVIA });

      const [query] = mockPrisma.$queryRaw.mock.calls[0];
      const sql = query.sql.replace(/\s+/g, ' ');
      expect(sql).toContain('WHERE en.fecha >= ? AND en.fecha < ?');
      expect(sql).not.toContain('<=');
      expect(sql).toContain('JOIN entrenamientos en ON en.id = a.entrenamiento_id');
      expect(sql).toContain('GROUP BY en.fecha');
      expect(query.values.slice(-2)).toEqual([SEMANA.desdeDb, SEMANA.finExclusivoDb]);
    });

    test('los COUNT llevan ::int', async () => {
      await getResumenPresentismo({ rango: SEMANA, rangoPrevio: SEMANA_PREVIA });

      const [query] = mockPrisma.$queryRaw.mock.calls[0];
      expect(query.sql).toContain('COUNT(*)::int AS registros');
      expect(query.sql).toContain(')::int AS asistencias');
    });

    // Misma definición que el semanal: LLEGO_TARDE y SE_RETIRO_ANTES cuentan, AUSENTE no.
    test('los estados presentes del SQL son los de la definición de negocio', async () => {
      await getResumenPresentismo({ rango: SEMANA, rangoPrevio: SEMANA_PREVIA });

      const [query] = mockPrisma.$queryRaw.mock.calls[0];
      expect(query.sql.replace(/\s+/g, ' ')).toContain('a.estado::text IN (?,?,?)');
      expect(query.values.slice(0, 3)).toEqual(['PRESENTE', 'LLEGO_TARDE', 'SE_RETIRO_ANTES']);
      expect(query.values).not.toContain('AUSENTE');
    });

    test('no-admin: filtra por entrenador como parámetro', async () => {
      await getResumenPresentismo({
        rango: SEMANA,
        rangoPrevio: SEMANA_PREVIA,
        entrenadorId: 'user_e',
      });

      const [query] = mockPrisma.$queryRaw.mock.calls[0];
      expect(query.sql).toContain('AND en.entrenador_id = ?');
      expect(query.values.at(-1)).toBe('user_e');
      expect(query.sql).not.toContain('user_e');
    });

    test('admin: no filtra por entrenador', async () => {
      await getResumenPresentismo({ rango: SEMANA, rangoPrevio: SEMANA_PREVIA });

      const [query] = mockPrisma.$queryRaw.mock.calls[0];
      expect(query.sql).not.toContain('entrenador_id');
      expect(query.values).toHaveLength(5);
    });
  });
});

// ---------------------------------------------------------------------------

describe('getResumenSeguimientos', () => {
  beforeEach(() => {
    mockPrisma.seguimiento.groupBy.mockResolvedValue([]);
    mockPrisma.seguimiento.findMany.mockResolvedValue([]);
  });

  function gruposPrioridad(pares: [string, number][]) {
    return pares.map(([prioridad, n]) => ({ prioridad, _count: { _all: n } }));
  }

  /**
   * REGRESIÓN del scoping — el tercero, y el que se hace al revés al copiar de
   * turnos: **seguimientos es GLOBAL**. Todos los roles ven todos; la propiedad del
   * registro solo gobierna editar y borrar (`app/(app)/seguimientos/page.tsx:45`).
   * Un `profesionalId` acá haría que el número de la card no coincida con el listado.
   */
  test('NO scopea por profesionalId: todos los roles ven todos los seguimientos', async () => {
    await getResumenSeguimientos({ desdeHoyDb: HOY_DB });

    for (const [args] of mockPrisma.seguimiento.groupBy.mock.calls) {
      expect(args).not.toHaveProperty('where');
    }
    expect(mockPrisma.seguimiento.findMany.mock.calls[0][0].where).not.toHaveProperty(
      'profesionalId',
    );
  });

  /**
   * ALTA y URGENTE van como DOS números separados, cada uno con su link: el filtro
   * `?prioridad=` del listado acepta un solo valor, así que una suma no tendría a
   * dónde linkear sin mostrar un conjunto distinto del número.
   */
  test('cuenta ALTA y URGENTE por separado, no como una suma', async () => {
    mockPrisma.seguimiento.groupBy.mockResolvedValue(
      gruposPrioridad([
        ['ALTA', 5],
        ['URGENTE', 2],
      ]),
    );

    const r = await getResumenSeguimientos({ desdeHoyDb: HOY_DB });

    expect(r.alta).toBe(5);
    expect(r.urgente).toBe(2);
    expect(r.alta).toBe(r.porPrioridad.ALTA);
    expect(r.urgente).toBe(r.porPrioridad.URGENTE);
  });

  test('un solo groupBy por prioridad', async () => {
    await getResumenSeguimientos({ desdeHoyDb: HOY_DB });

    expect(mockPrisma.seguimiento.groupBy).toHaveBeenCalledTimes(1);
    expect(mockPrisma.seguimiento.groupBy.mock.calls[0][0]).toEqual({
      by: ['prioridad'],
      _count: { _all: true },
    });
  });

  test('porPrioridad hace zero-fill de las 4 y total es la suma', async () => {
    mockPrisma.seguimiento.groupBy.mockResolvedValue(
      gruposPrioridad([
        ['BAJA', 12],
        ['URGENTE', 3],
      ]),
    );

    const r = await getResumenSeguimientos({ desdeHoyDb: HOY_DB });

    expect(r.porPrioridad).toEqual({ BAJA: 12, MEDIA: 0, ALTA: 0, URGENTE: 3 });
    expect(r.total).toBe(15);
    expect(r.alta).toBe(0);
  });

  test('sin seguimientos todo queda en 0', async () => {
    const r = await getResumenSeguimientos({ desdeHoyDb: HOY_DB });

    expect(r.porPrioridad).toEqual({ BAJA: 0, MEDIA: 0, ALTA: 0, URGENTE: 0 });
    expect(r.total).toBe(0);
    expect(r.alta).toBe(0);
    expect(r.urgente).toBe(0);
  });

  test('una prioridad desconocida no entra en el total', async () => {
    mockPrisma.seguimiento.groupBy.mockResolvedValue(
      gruposPrioridad([
        ['MEDIA', 4],
        ['CRITICA', 9],
      ]),
    );

    const r = await getResumenSeguimientos({ desdeHoyDb: HOY_DB });

    expect(r.total).toBe(4);
    expect(Object.keys(r.porPrioridad)).toHaveLength(4);
  });

  // Backlog abierto, no de la semana: es exactamente lo que muestra el link.
  test('los conteos son backlog abierto, sin filtro de fecha', async () => {
    await getResumenSeguimientos({ desdeHoyDb: HOY_DB });

    const [args] = mockPrisma.seguimiento.groupBy.mock.calls[0];
    expect(args).not.toHaveProperty('where');
  });

  /**
   * `Seguimiento` no tiene flag de "cumplida", así que una `proximaCita` pasada
   * nunca se puede cerrar y el conteo crecería para siempre. Los 90 días son la
   * mitigación; que el borde inferior EXISTA es lo que se verifica acá.
   */
  test('acota las citas vencidas a 90 días hacia atrás', async () => {
    await getResumenSeguimientos({ desdeHoyDb: HOY_DB });

    const { gte } = mockPrisma.seguimiento.findMany.mock.calls[0][0].where.proximaCita;
    expect(gte).toEqual(new Date(HOY_DB.getTime() - 90 * 86_400_000));
  });

  // 7 días hacia adelante, y el séptimo entra COMPLETO: el borde exclusivo es +8.
  test('incluye los próximos 7 días completos', async () => {
    await getResumenSeguimientos({ desdeHoyDb: HOY_DB });

    const { lt } = mockPrisma.seguimiento.findMany.mock.calls[0][0].where.proximaCita;
    expect(lt).toEqual(new Date('2026-03-19T00:00:00.000Z')); // 11 + 8
  });

  test('los rangos son configurables', async () => {
    await getResumenSeguimientos({ desdeHoyDb: HOY_DB, diasVencidas: 30, diasFuturas: 0 });

    const { gte, lt } =
      mockPrisma.seguimiento.findMany.mock.calls[0][0].where.proximaCita;
    expect(gte).toEqual(new Date('2026-02-09T00:00:00.000Z'));
    expect(lt).toEqual(new Date('2026-03-12T00:00:00.000Z'));
  });

  test('ordena las citas de la más vieja a la más nueva', async () => {
    await getResumenSeguimientos({ desdeHoyDb: HOY_DB });

    expect(mockPrisma.seguimiento.findMany.mock.calls[0][0].orderBy).toEqual({
      proximaCita: 'asc',
    });
  });

  test('aplana los deportistas de cada cita', async () => {
    mockPrisma.seguimiento.findMany.mockResolvedValue([
      {
        id: 's1',
        titulo: 'Control kinesiología',
        proximaCita: new Date('2026-03-13T00:00:00.000Z'),
        deportistas: [{ deportista: { id: 'd1', nombre: 'Ana', apellido: 'Torres' } }],
      },
    ]);

    const r = await getResumenSeguimientos({ desdeHoyDb: HOY_DB });

    expect(r.proximasCitas[0].deportistas).toEqual([
      { id: 'd1', nombre: 'Ana', apellido: 'Torres' },
    ]);
  });

  // `proximaCita` es nullable en el schema: el filtro la excluye, pero el tipo de
  // salida la exige no-nula, así que la defensa tiene que existir.
  test('descarta una cita con proximaCita nula en vez de tipar mal', async () => {
    mockPrisma.seguimiento.findMany.mockResolvedValue([
      { id: 's1', titulo: 'Sin cita', proximaCita: null, deportistas: [] },
    ]);

    const r = await getResumenSeguimientos({ desdeHoyDb: HOY_DB });

    expect(r.proximasCitas).toEqual([]);
  });
});

// ---------------------------------------------------------------------------

describe('getResumenPlantel', () => {
  test('hace zero-fill de los 4 estados y suma el total', async () => {
    mockPrisma.deportista.groupBy.mockResolvedValue([
      { estado: 'ACTIVO', _count: { _all: 240 } },
      { estado: 'LESIONADO', _count: { _all: 8 } },
    ]);

    const r = await getResumenPlantel();

    expect(r.porEstado).toEqual({
      ACTIVO: 240,
      LESIONADO: 8,
      SUSPENDIDO: 0,
      INACTIVO: 0,
    });
    expect(r.total).toBe(248);
  });

  test('con la tabla vacía devuelve todo en cero, no un objeto vacío', async () => {
    mockPrisma.deportista.groupBy.mockResolvedValue([]);

    const r = await getResumenPlantel();

    expect(r.total).toBe(0);
    expect(Object.keys(r.porEstado)).toHaveLength(4);
  });

  // El plantel es del club entero: no lleva scoping ni filtro de estado, porque
  // cada estado linkea a su propio `?filter[estado]=`.
  test('no filtra por estado: cuenta el plantel completo', async () => {
    mockPrisma.deportista.groupBy.mockResolvedValue([]);
    await getResumenPlantel();

    expect(mockPrisma.deportista.groupBy.mock.calls[0][0]).not.toHaveProperty('where');
  });

  test('un estado desconocido no entra en el total', async () => {
    mockPrisma.deportista.groupBy.mockResolvedValue([
      { estado: 'ACTIVO', _count: { _all: 10 } },
      { estado: 'JUBILADO', _count: { _all: 5 } },
    ]);

    expect((await getResumenPlantel()).total).toBe(10);
  });
});

// ---------------------------------------------------------------------------

describe('getProximosEventos', () => {
  beforeEach(() => {
    mockPrisma.eventoTorneo.findMany.mockResolvedValue([]);
  });

  // `EventoTorneo` no tiene fecha propia: cuelga de `dia.fecha`, así que tanto el
  // filtro como el orden van a través de la relación.
  test('filtra y ordena por la fecha del día del calendario', async () => {
    await getProximosEventos({ desdeHoyDb: HOY_DB });

    const [args] = mockPrisma.eventoTorneo.findMany.mock.calls[0];
    expect(args.where).toEqual({ dia: { fecha: { gte: HOY_DB } } });
    expect(args.orderBy).toEqual({ dia: { fecha: 'asc' } });
  });

  test('respeta el límite', async () => {
    await getProximosEventos({ desdeHoyDb: HOY_DB, limite: 3 });

    expect(mockPrisma.eventoTorneo.findMany.mock.calls[0][0].take).toBe(3);
  });

  test('aplana las relaciones y marca si hay convocatoria armada', async () => {
    mockPrisma.eventoTorneo.findMany.mockResolvedValue([
      {
        id: 'e1',
        estado: 'PROGRAMADO',
        dia: { fecha: new Date('2026-03-14T00:00:00.000Z') },
        categoria: { nombre: '4ta' },
        local: { nombre: 'Gimnasia LP' },
        visitante: { nombre: 'Estudiantes' },
        convocatoria: { id: 'c1' },
      },
      {
        id: 'e2',
        estado: 'SUSPENDIDO',
        dia: { fecha: new Date('2026-03-15T00:00:00.000Z') },
        categoria: { nombre: '5ta' },
        local: { nombre: 'Gimnasia LP' },
        visitante: { nombre: 'Talleres' },
        convocatoria: null,
      },
    ]);

    const r = await getProximosEventos({ desdeHoyDb: HOY_DB });

    expect(r[0]).toEqual({
      id: 'e1',
      fecha: new Date('2026-03-14T00:00:00.000Z'),
      categoria: '4ta',
      local: 'Gimnasia LP',
      visitante: 'Estudiantes',
      estado: 'PROGRAMADO',
      tieneConvocatoria: true,
    });
    expect(r[1].tieneConvocatoria).toBe(false);
  });
});
