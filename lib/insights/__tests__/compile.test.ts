import { describe, it, test, expect } from 'vitest';
import { compile, MAX_DIMENSIONS, MAX_LIMIT } from '../compile';
import { CATALOG, DATASETS } from '../catalog';
import { isFormulaMeasure, type QuerySpec } from '../types';

// Reloj fijo para que los operadores de fecha relativos sean reproducibles.
const NOW = new Date('2026-09-15T12:00:00.000Z');

function spec(partial: Partial<QuerySpec> & { dataset: string }): QuerySpec {
  return {
    mode: 'builder',
    dimensions: [],
    measures: [],
    ...partial,
  };
}

/** Posiciones de los placeholders en el orden en que aparecen en el SQL. */
function placeholders(sql: string): number[] {
  return [...sql.matchAll(/\$(\d+)/g)].map((m) => Number(m[1]));
}

function expectParamParity(compiled: { sql: string; params: unknown[] }) {
  const found = placeholders(compiled.sql);
  // Aparecen en orden ascendente…
  expect(found).toEqual([...found].sort((a, b) => a - b));
  // …y cubren exactamente $1..$n, sin huecos ni repetidos.
  expect([...new Set(found)]).toEqual(
    Array.from({ length: compiled.params.length }, (_, i) => i + 1),
  );
}

// ---------------------------------------------------------------------------
// Estructura del catálogo
// ---------------------------------------------------------------------------

describe('catálogo', () => {
  it('expone los 11 datasets del plan', () => {
    expect(DATASETS.map((d) => d.id)).toEqual([
      'deportistas',
      'seguimientos',
      'presentismo',
      'antropometria',
      'evaluacion_psicologica',
      'turnos',
      'convocatorias',
      'triage_ultimo',
      'triage_historico',
      'viandas_entregas',
      'viandas_cobertura',
    ]);
  });

  test.each(DATASETS.map((d) => [d.id, d] as const))(
    '%s: ids únicos, en snake_case, y con grain documentado',
    (_id, dataset) => {
      const alias = /^[a-z][a-z0-9_]*$/;
      const dimIds = dataset.dimensions.map((d) => d.id);
      const measureIds = dataset.measures.map((m) => m.id);

      expect(dataset.grain.length).toBeGreaterThan(0);
      expect(new Set(dimIds).size).toBe(dimIds.length);
      expect(new Set(measureIds).size).toBe(measureIds.length);
      for (const id of [...dimIds, ...measureIds, dataset.id]) {
        expect(id).toMatch(alias);
      }

      // Una dimensión y una medida con el mismo id producirían dos columnas con
      // el mismo alias en el SELECT: Postgres lo permite, pero al mapear las
      // filas a objetos en JS una pisaría a la otra y el widget mostraría el
      // valor equivocado sin ningún error. Tiene que ser imposible por catálogo.
      const colision = dimIds.filter((id) => measureIds.includes(id));
      expect(colision, `ids compartidos entre dimensión y medida`).toEqual([]);
    },
  );

  test.each(DATASETS.map((d) => [d.id, d] as const))(
    '%s: los operandos de cada fórmula existen y no son fórmulas',
    (_id, dataset) => {
      for (const measure of dataset.measures) {
        if (!isFormulaMeasure(measure)) continue;
        for (const operand of measure.operands) {
          const target = dataset.measures.find((m) => m.id === operand);
          expect(target, `operando ${operand}`).toBeDefined();
          expect(isFormulaMeasure(target!)).toBe(false);
        }
      }
    },
  );

  it('los datasets con N:M en el camino cuentan entidades con COUNT(DISTINCT)', () => {
    const casos: [string, string][] = [
      ['seguimientos', 'seguimientos'],
      ['seguimientos', 'deportistas_alcanzados'],
      ['turnos', 'turnos'],
      ['turnos', 'deportistas_citados'],
      ['antropometria', 'mediciones'],
      ['evaluacion_psicologica', 'evaluaciones'],
      ['convocatorias', 'convocatorias'],
      ['convocatorias', 'deportistas_distintos'],
      ['viandas_entregas', 'deportistas_distintos'],
      ['viandas_cobertura', 'deportistas_distintos'],
    ];
    for (const [datasetId, measureId] of casos) {
      const measure = CATALOG[datasetId].measures.find((m) => m.id === measureId);
      expect(measure, `${datasetId}.${measureId}`).toBeDefined();
      expect(isFormulaMeasure(measure!) ? null : measure!.agg).toBe('count_distinct');
    }
  });

  it('el dataset "Triage (último)" usa un CTE con DISTINCT ON', () => {
    const cte = CATALOG.triage_ultimo.cte ?? '';
    expect(cte).toContain('DISTINCT ON (triage.deportista_id)');
    expect(cte).toContain('ORDER BY triage.deportista_id, triage.calculated_at DESC');
  });

  it('rango_etario es un CASE derivado de la edad', () => {
    const dim = CATALOG.deportistas.dimensions.find((d) => d.id === 'rango_etario');
    expect(dim?.sql).toContain("date_part('year', age(deportistas.fecha_nacimiento))");
    expect(dim?.sql.startsWith('CASE')).toBe(true);
  });

  // La columna `recibe_vianda` ya no existe, pero el id del catálogo sí: los
  // widgets y filtros guardados lo referencian y `findDimension` lanza ante un
  // id desconocido, así que borrarlo rompería el dashboard entero.
  it('deportistas sigue exponiendo recibe_vianda, ahora derivada de los dos flags', () => {
    const dim = CATALOG.deportistas.dimensions.find((d) => d.id === 'recibe_vianda');
    expect(dim).toBeDefined();
    expect(dim!.type).toBe('boolean');
    expect(dim!.sql).toContain('COALESCE(necesidades_apoyo.recibe_almuerzo, false)');
    expect(dim!.sql).toContain('COALESCE(necesidades_apoyo.recibe_cena, false)');
    expect(dim!.sql).not.toContain('necesidades_apoyo.recibe_vianda');
  });

  it('el CTE de viandas_cobertura define los tres pasos del cruce', () => {
    const cte = CATALOG.viandas_cobertura.cte ?? '';
    expect(cte).toContain('WITH viandas_dias AS (');
    expect(cte).toContain('viandas_comidas AS (');
    expect(cte).toContain('viandas_cobertura AS (');
    expect(cte).toContain(`unnest(ARRAY['DESAYUNO','ALMUERZO','MERIENDA','CENA']::"TipoComida"[])`);
    expect(cte).toContain('CROSS JOIN viandas_comidas');
    expect(cte).toContain('CROSS JOIN deportistas');
    expect(cte).toContain('COALESCE(necesidades_apoyo.recibe_almuerzo, false)');
    expect(cte).toContain('COALESCE(necesidades_apoyo.recibe_cena, false)');
    // El plantel es el actual, y se excluye solo INACTIVO: un lesionado come.
    expect(cte).toContain("deportistas.estado <> 'INACTIVO'");
  });

  // Reserva y 4ta–9na reciben solo desayuno: su merienda no es "esperada", así que
  // no puede aparecer como no retirada. El desayuno sigue siendo de todo el plantel.
  it('cobertura no espera merienda de las categorías que solo reciben desayuno', () => {
    const cte = CATALOG.viandas_cobertura.cte ?? '';
    const sinEspacios = cte.replace(/\s+/g, ' ');
    expect(sinEspacios).toContain(
      'LEFT JOIN categorias cat_vianda ON cat_vianda.id = deportistas.categoria_id',
    );
    expect(sinEspacios).toContain("viandas_comidas.comida = 'DESAYUNO'");
    expect(sinEspacios).toContain(
      "(viandas_comidas.comida = 'MERIENDA' AND (cat_vianda.nombre IS NULL OR cat_vianda.nombre NOT IN ('Reserva','9na','8va','7ma','6ta','5ta','4ta')))",
    );
    // La merienda ya no va junto al desayuno como "de todo el plantel".
    expect(cte).not.toContain("IN ('DESAYUNO','MERIENDA')");
  });

  it('viandas_entregas expone recibe_merienda derivada de la categoría', () => {
    const dim = CATALOG.viandas_entregas.dimensions.find((d) => d.id === 'recibe_merienda');
    expect(dim?.type).toBe('boolean');
    // Sin categoría SÍ recibe merienda: el IS NULL evita que `NULL NOT IN` dé NULL.
    expect(dim!.sql).toBe(
      "(categorias.nombre IS NULL OR categorias.nombre NOT IN ('Reserva','9na','8va','7ma','6ta','5ta','4ta'))",
    );

    const compiled = compile(
      spec({
        dataset: 'viandas_entregas',
        dimensions: ['comida', 'recibe_merienda'],
        measures: ['entregas'],
        filters: {
          op: 'all',
          children: [
            { field: 'comida', operator: 'in', value: ['MERIENDA'] },
            { field: 'recibe_merienda', operator: 'is_false' },
          ],
        },
      }),
      NOW,
    );
    expect(compiled.sql).toContain('LEFT JOIN categorias ON categorias.id = deportistas.categoria_id');
    expect(compiled.sql).toContain('categorias.nombre NOT IN');
    expectParamParity(compiled);
  });

  it('las medidas de cobertura cuentan con FILTER sobre entrega_id', () => {
    const measures = CATALOG.viandas_cobertura.measures;
    const retiradas = measures.find((m) => m.id === 'retiradas');
    const noRetiradas = measures.find((m) => m.id === 'no_retiradas');
    expect(isFormulaMeasure(retiradas!) ? null : retiradas!.filterSql).toBe(
      'viandas_cobertura.entrega_id IS NOT NULL',
    );
    expect(isFormulaMeasure(noRetiradas!) ? null : noRetiradas!.filterSql).toBe(
      'viandas_cobertura.entrega_id IS NULL',
    );
  });
});

// ---------------------------------------------------------------------------
// Cobertura: cada dimensión y cada medida de cada dataset compila
// ---------------------------------------------------------------------------

describe('cobertura del catálogo', () => {
  for (const dataset of DATASETS) {
    const primeraMedida = dataset.measures[0].id;

    for (const dim of dataset.dimensions) {
      it(`${dataset.id} · dimensión ${dim.id} compila`, () => {
        const compiled = compile(
          spec({ dataset: dataset.id, dimensions: [dim.id], measures: [primeraMedida] }),
          NOW,
        );
        expect(compiled.sql).toContain(`AS "${dim.id}"`);
        expect(compiled.sql).toContain(`FROM ${dataset.from}`);
        expect(compiled.sql).toContain('GROUP BY 1');
        expectParamParity(compiled);
      });
    }

    for (const measure of dataset.measures) {
      it(`${dataset.id} · medida ${measure.id} compila`, () => {
        const compiled = compile(
          spec({ dataset: dataset.id, measures: [measure.id] }),
          NOW,
        );
        expect(compiled.sql).toContain(`AS "${measure.id}"`);
        expect(compiled.columns[0]).toMatchObject({ id: measure.id, role: 'measure' });
        expectParamParity(compiled);
      });
    }
  }
});

// ---------------------------------------------------------------------------
// SQL generado
// ---------------------------------------------------------------------------

describe('SQL generado', () => {
  it('deportistas por disciplina, ordenado desc', () => {
    const compiled = compile(
      spec({
        dataset: 'deportistas',
        dimensions: ['disciplina'],
        measures: ['cantidad'],
        sort: [{ field: 'cantidad', direction: 'desc' }],
        limit: 20,
      }),
      NOW,
    );

    expect(compiled.sql).toMatchInlineSnapshot(`
      "SELECT disciplinas.nombre AS "disciplina", COUNT(*) AS "cantidad"
      FROM deportistas
      LEFT JOIN disciplinas ON disciplinas.id = deportistas.disciplina_id
      LEFT JOIN categorias ON categorias.id = deportistas.categoria_id
      LEFT JOIN datos_escolares ON datos_escolares.deportista_id = deportistas.id
      LEFT JOIN datos_sociales ON datos_sociales.deportista_id = deportistas.id
      LEFT JOIN vivienda_familiar ON vivienda_familiar.deportista_id = deportistas.id
      LEFT JOIN necesidades_apoyo ON necesidades_apoyo.deportista_id = deportistas.id
      LEFT JOIN datos_salud ON datos_salud.deportista_id = deportistas.id
      GROUP BY 1
      ORDER BY 2 DESC
      LIMIT $1"
    `);
    expect(compiled.params).toEqual([20]);
    expect(compiled.columns).toEqual([
      { id: 'disciplina', label: 'Disciplina', type: 'string', role: 'dimension' },
      {
        id: 'cantidad',
        label: 'Cantidad',
        type: 'number',
        role: 'measure',
        format: 'integer',
      },
    ]);
  });

  it('seguimientos por mes con timeGrain y filtro de enum', () => {
    const compiled = compile(
      spec({
        dataset: 'seguimientos',
        dimensions: ['fecha'],
        measures: ['seguimientos'],
        timeGrain: 'month',
        timeDimension: 'fecha',
        filters: {
          op: 'all',
          children: [
            { field: 'prioridad', operator: 'in', value: ['ALTA', 'URGENTE'] },
            { field: 'fecha', operator: 'this_year' },
          ],
        },
        sort: [{ field: 'fecha', direction: 'asc' }],
      }),
      NOW,
    );

    expect(compiled.sql).toMatchInlineSnapshot(`
      "SELECT date_trunc($1, seguimientos.fecha) AS "fecha", COUNT(DISTINCT seguimientos.id) AS "seguimientos"
      FROM seguimientos
      LEFT JOIN seguimiento_deportistas ON seguimiento_deportistas.seguimiento_id = seguimientos.id
      LEFT JOIN deportistas ON deportistas.id = seguimiento_deportistas.deportista_id
      LEFT JOIN disciplinas ON disciplinas.id = deportistas.disciplina_id
      LEFT JOIN categorias ON categorias.id = deportistas.categoria_id
      WHERE (seguimientos.prioridad = ANY($2) AND (seguimientos.fecha >= $3 AND seguimientos.fecha < $4))
      GROUP BY 1
      ORDER BY 1 ASC
      LIMIT $5"
    `);
    expect(compiled.params).toEqual([
      'month',
      ['ALTA', 'URGENTE'],
      new Date('2026-01-01T00:00:00.000Z'),
      new Date('2027-01-01T00:00:00.000Z'),
      MAX_LIMIT,
    ]);
    expectParamParity(compiled);
  });

  it('% de presentismo: la fórmula se expande con NULLIF en el denominador', () => {
    const compiled = compile(
      spec({
        dataset: 'presentismo',
        dimensions: ['categoria'],
        measures: ['porcentaje_presentismo'],
      }),
      NOW,
    );

    expect(compiled.sql).toContain(
      "(COUNT(*) FILTER (WHERE asistencias.estado = 'PRESENTE'))::numeric / NULLIF((COUNT(*))::numeric, 0) * 100",
    );
    expect(compiled.sql).toContain('AS "porcentaje_presentismo"');
  });

  it('triage último antepone el CTE al SELECT', () => {
    const compiled = compile(
      spec({
        dataset: 'triage_ultimo',
        dimensions: ['nivel'],
        measures: ['deportistas'],
      }),
      NOW,
    );

    expect(compiled.sql.startsWith('WITH triage_ultimo AS (')).toBe(true);
    expect(compiled.sql).toContain('FROM triage_ultimo');
  });

  it('cobertura de viandas emite el CTE completo antes del SELECT', () => {
    const compiled = compile(
      spec({
        dataset: 'viandas_cobertura',
        dimensions: ['comida'],
        measures: ['esperadas', 'retiradas', 'porcentaje_retiro'],
        filters: {
          op: 'all',
          children: [{ field: 'fecha', operator: 'last_n_days', value: 30 }],
        },
      }),
      NOW,
    );

    expect(compiled.sql.startsWith('WITH viandas_dias AS (')).toBe(true);
    // Las tres definiciones van antes del SELECT externo, en orden.
    const selectIndex = compiled.sql.indexOf('\nSELECT ');
    for (const parte of ['viandas_dias AS (', 'viandas_comidas AS (', 'viandas_cobertura AS (']) {
      const i = compiled.sql.indexOf(parte);
      expect(i).toBeGreaterThan(-1);
      expect(i).toBeLessThan(selectIndex);
    }
    expect(compiled.sql).toContain('FROM viandas_cobertura');
    expect(compiled.sql).toContain(
      "COUNT(*) FILTER (WHERE viandas_cobertura.entrega_id IS NOT NULL)",
    );
    expect(compiled.sql).toContain(
      'WHERE (viandas_cobertura.fecha >= $1 AND viandas_cobertura.fecha < $2)',
    );
    expectParamParity(compiled);
  });

  // `entregado_por` guarda un Clerk userId: el nombre no está en Postgres y se
  // resuelve después de la query, así que la columna tiene que salir marcada.
  it('la columna entregado_por sale marcada para resolver el nombre contra Clerk', () => {
    for (const dataset of ['viandas_entregas', 'viandas_cobertura']) {
      const compiled = compile(
        spec({
          dataset,
          dimensions: ['entregado_por'],
          measures: [dataset === 'viandas_entregas' ? 'entregas' : 'esperadas'],
        }),
        NOW,
      );

      const columna = compiled.columns.find((c) => c.id === 'entregado_por');
      expect(columna?.labelSource).toBe('clerk_user');
      expect(columna?.label).not.toMatch(/\(id\)/);
    }
  });

  // Filtrar por lugar en cobertura tiraría todas las filas "no retirada" (el
  // lado derecho del LEFT JOIN es NULL) y el % de retiro daría 100%.
  it('lugar y entregado_por de cobertura se pueden mostrar pero no filtrar', () => {
    for (const id of ['lugar', 'entregado_por']) {
      const dim = CATALOG.viandas_cobertura.dimensions.find((d) => d.id === id);
      expect(dim?.filterable).toBe(false);
      expect(dim?.label).toMatch(/no retirada/);

      // Mostrarla sí compila…
      expect(() =>
        compile(spec({ dataset: 'viandas_cobertura', dimensions: [id], measures: ['esperadas'] }), NOW),
      ).not.toThrow();

      // …filtrarla no.
      expect(() =>
        compile(
          spec({
            dataset: 'viandas_cobertura',
            measures: ['esperadas'],
            filters: { op: 'all', children: [{ field: id, operator: 'is_not_null' }] },
          }),
          NOW,
        ),
      ).toThrow(/no es filtrable/);
    }
  });

  it('las entregas sí pueden cortarse por lugar', () => {
    const dim = CATALOG.viandas_entregas.dimensions.find((d) => d.id === 'lugar');
    expect(dim?.filterable).toBeUndefined();
    const compiled = compile(
      spec({
        dataset: 'viandas_entregas',
        dimensions: ['lugar'],
        measures: ['entregas'],
        filters: {
          op: 'all',
          children: [{ field: 'lugar', operator: 'in', value: ['SEDE', 'BOSQUESITO'] }],
        },
      }),
      NOW,
    );
    expect(compiled.sql).toContain('WHERE entregas_comida.lugar = ANY($1)');
  });

  it('agrupa por posición ordinal y no reemite las expresiones', () => {
    const compiled = compile(
      spec({
        dataset: 'deportistas',
        dimensions: ['disciplina', 'categoria', 'estado'],
        measures: ['cantidad'],
        sort: [
          { field: 'estado', direction: 'asc' },
          { field: 'cantidad', direction: 'desc' },
        ],
      }),
      NOW,
    );

    expect(compiled.sql).toContain('GROUP BY 1, 2, 3');
    expect(compiled.sql).toContain('ORDER BY 3 ASC, 4 DESC');
  });

  it('count_distinct emite COUNT(DISTINCT …)', () => {
    const compiled = compile(
      spec({ dataset: 'turnos', measures: ['turnos'] }),
      NOW,
    );
    expect(compiled.sql).toContain('COUNT(DISTINCT turnos.id) AS "turnos"');
  });

  it('sin dimensiones no emite GROUP BY', () => {
    const compiled = compile(
      spec({ dataset: 'deportistas', measures: ['cantidad'] }),
      NOW,
    );
    expect(compiled.sql).not.toContain('GROUP BY');
  });

  it('solo dimensiones produce la lista de valores distintos', () => {
    const compiled = compile(
      spec({ dataset: 'deportistas', dimensions: ['provincia'] }),
      NOW,
    );
    expect(compiled.sql).toContain('GROUP BY 1');
    expect(compiled.columns).toHaveLength(1);
  });

  it('deduplica dimensiones y medidas repetidas', () => {
    const compiled = compile(
      spec({
        dataset: 'deportistas',
        dimensions: ['estado', 'estado'],
        measures: ['cantidad', 'cantidad'],
      }),
      NOW,
    );
    expect(compiled.columns.map((c) => c.id)).toEqual(['estado', 'cantidad']);
    expect(compiled.sql).toContain('GROUP BY 1');
  });
});

// ---------------------------------------------------------------------------
// Filtros
// ---------------------------------------------------------------------------

describe('filtros', () => {
  it('in usa = ANY($n) con un único parámetro array', () => {
    const compiled = compile(
      spec({
        dataset: 'triage_ultimo',
        measures: ['deportistas'],
        filters: {
          op: 'all',
          children: [{ field: 'nivel', operator: 'in', value: ['NARANJA', 'ROJO'] }],
        },
      }),
      NOW,
    );
    expect(compiled.sql).toContain('WHERE triage_ultimo.nivel = ANY($1)');
    expect(compiled.params[0]).toEqual(['NARANJA', 'ROJO']);
    expect(compiled.params).toHaveLength(2); // el array + el LIMIT
  });

  it('not_in usa <> ALL($n)', () => {
    const compiled = compile(
      spec({
        dataset: 'deportistas',
        measures: ['cantidad'],
        filters: {
          op: 'all',
          children: [{ field: 'estado', operator: 'not_in', value: ['INACTIVO'] }],
        },
      }),
      NOW,
    );
    expect(compiled.sql).toContain('WHERE deportistas.estado <> ALL($1)');
  });

  it('grupos anidados emiten AND/OR con paréntesis', () => {
    const compiled = compile(
      spec({
        dataset: 'deportistas',
        measures: ['cantidad'],
        filters: {
          op: 'all',
          children: [
            { field: 'estado', operator: 'eq', value: 'ACTIVO' },
            {
              op: 'any',
              children: [
                { field: 'vive_pension_club', operator: 'is_true' },
                { field: 'vive_pension_externa', operator: 'is_true' },
              ],
            },
          ],
        },
      }),
      NOW,
    );
    expect(compiled.sql).toContain(
      'WHERE (deportistas.estado = $1 AND (deportistas.vive_pension_club IS TRUE OR deportistas.vive_pension_externa IS TRUE))',
    );
    expectParamParity(compiled);
  });

  it('un grupo vacío no emite WHERE', () => {
    const compiled = compile(
      spec({ dataset: 'deportistas', measures: ['cantidad'], filters: { op: 'all', children: [] } }),
      NOW,
    );
    expect(compiled.sql).not.toContain('WHERE');
  });

  it('contains viaja como parámetro ILIKE con comodines', () => {
    const compiled = compile(
      spec({
        dataset: 'deportistas',
        measures: ['cantidad'],
        filters: {
          op: 'all',
          children: [{ field: 'ciudad', operator: 'contains', value: 'plata' }],
        },
      }),
      NOW,
    );
    expect(compiled.sql).toContain('deportistas.ciudad ILIKE $1');
    expect(compiled.params[0]).toBe('%plata%');
  });

  it('between de fechas emite dos parámetros', () => {
    const compiled = compile(
      spec({
        dataset: 'antropometria',
        measures: ['mediciones'],
        filters: {
          op: 'all',
          children: [{ field: 'fecha', operator: 'between', value: ['2026-01-01', '2026-06-30'] }],
        },
      }),
      NOW,
    );
    expect(compiled.sql).toContain('BETWEEN $1 AND $2');
    expect(compiled.params[0]).toBeInstanceOf(Date);
    expectParamParity(compiled);
  });

  it('is_null / is_not_null no consumen parámetros', () => {
    const compiled = compile(
      spec({
        dataset: 'deportistas',
        measures: ['cantidad'],
        filters: {
          op: 'all',
          children: [
            { field: 'fecha_ingreso', operator: 'is_null' },
            { field: 'provincia', operator: 'is_not_null' },
          ],
        },
      }),
      NOW,
    );
    expect(compiled.params).toEqual([MAX_LIMIT]);
  });

  it('rechaza un operador que no corresponde al tipo de la dimensión', () => {
    expect(() =>
      compile(
        spec({
          dataset: 'deportistas',
          measures: ['cantidad'],
          filters: {
            op: 'all',
            children: [{ field: 'estado', operator: 'contains', value: 'ACT' }],
          },
        }),
        NOW,
      ),
    ).toThrow(/no válido para la dimensión/);
  });

  it('rechaza in con una lista vacía', () => {
    expect(() =>
      compile(
        spec({
          dataset: 'deportistas',
          measures: ['cantidad'],
          filters: { op: 'all', children: [{ field: 'estado', operator: 'in', value: [] }] },
        }),
        NOW,
      ),
    ).toThrow(/lista no vacía/);
  });
});

// ---------------------------------------------------------------------------
// Fechas relativas con reloj fijo
// ---------------------------------------------------------------------------

describe('operadores de fecha relativos (reloj fijo 2026-09-15)', () => {
  function rango(operator: 'last_n_days' | 'this_month' | 'last_month' | 'this_year', value?: unknown) {
    const compiled = compile(
      spec({
        dataset: 'presentismo',
        measures: ['registros'],
        filters: { op: 'all', children: [{ field: 'fecha', operator, value }] },
      }),
      NOW,
    );
    expect(compiled.sql).toContain(
      '(entrenamientos.fecha >= $1 AND entrenamientos.fecha < $2)',
    );
    expect(compiled.sql).not.toContain('now()');
    return compiled.params.slice(0, 2) as Date[];
  }

  it('last_n_days(30) cubre los últimos 30 días incluyendo hoy', () => {
    expect(rango('last_n_days', 30)).toEqual([
      new Date('2026-08-17T00:00:00.000Z'),
      new Date('2026-09-16T00:00:00.000Z'),
    ]);
  });

  it('this_month', () => {
    expect(rango('this_month')).toEqual([
      new Date('2026-09-01T00:00:00.000Z'),
      new Date('2026-10-01T00:00:00.000Z'),
    ]);
  });

  it('last_month', () => {
    expect(rango('last_month')).toEqual([
      new Date('2026-08-01T00:00:00.000Z'),
      new Date('2026-09-01T00:00:00.000Z'),
    ]);
  });

  it('this_year', () => {
    expect(rango('this_year')).toEqual([
      new Date('2026-01-01T00:00:00.000Z'),
      new Date('2027-01-01T00:00:00.000Z'),
    ]);
  });

  it('last_month en enero retrocede al diciembre anterior', () => {
    const compiled = compile(
      spec({
        dataset: 'presentismo',
        measures: ['registros'],
        filters: { op: 'all', children: [{ field: 'fecha', operator: 'last_month' }] },
      }),
      new Date('2026-01-10T00:00:00.000Z'),
    );
    expect(compiled.params.slice(0, 2)).toEqual([
      new Date('2025-12-01T00:00:00.000Z'),
      new Date('2026-01-01T00:00:00.000Z'),
    ]);
  });

  it('last_n_days rechaza valores no enteros o negativos', () => {
    for (const value of [0, -5, 1.5, 'muchos']) {
      expect(() =>
        compile(
          spec({
            dataset: 'presentismo',
            measures: ['registros'],
            filters: {
              op: 'all',
              children: [{ field: 'fecha', operator: 'last_n_days', value }],
            },
          }),
          NOW,
        ),
      ).toThrow(/entero positivo/);
    }
  });
});

// ---------------------------------------------------------------------------
// timeGrain
// ---------------------------------------------------------------------------

describe('timeGrain', () => {
  it('pasa el grain como parámetro de date_trunc', () => {
    const compiled = compile(
      spec({
        dataset: 'triage_historico',
        dimensions: ['calculated_at'],
        measures: ['snapshots'],
        timeGrain: 'week',
      }),
      NOW,
    );
    expect(compiled.sql).toContain(
      'date_trunc($1, triage.calculated_at) AS "calculated_at"',
    );
    expect(compiled.params[0]).toBe('week');
    expect(compiled.columns[0].type).toBe('date');
  });

  it('rechaza un grain desconocido', () => {
    expect(() =>
      compile(
        spec({
          dataset: 'seguimientos',
          dimensions: ['fecha'],
          measures: ['seguimientos'],
          timeGrain: 'decade' as never,
        }),
        NOW,
      ),
    ).toThrow(/timeGrain inválido/);
  });

  it('rechaza timeGrain sobre una dimensión que no es date', () => {
    expect(() =>
      compile(
        spec({
          dataset: 'seguimientos',
          dimensions: ['disciplina'],
          measures: ['seguimientos'],
          timeGrain: 'month',
          timeDimension: 'disciplina',
        }),
        NOW,
      ),
    ).toThrow(/no es de tipo date/);
  });

  it('rechaza timeGrain sin ninguna dimensión de fecha seleccionada', () => {
    expect(() =>
      compile(
        spec({
          dataset: 'seguimientos',
          dimensions: ['disciplina'],
          measures: ['seguimientos'],
          timeGrain: 'month',
        }),
        NOW,
      ),
    ).toThrow(/requiere una dimensión de tipo date/);
  });
});

// ---------------------------------------------------------------------------
// Límites
// ---------------------------------------------------------------------------

describe('límites', () => {
  it('clampea el limit al máximo', () => {
    const compiled = compile(
      spec({ dataset: 'deportistas', measures: ['cantidad'], limit: 999999 }),
      NOW,
    );
    expect(compiled.params.at(-1)).toBe(MAX_LIMIT);
  });

  it('clampea el limit al mínimo y descarta valores inválidos', () => {
    expect(
      compile(spec({ dataset: 'deportistas', measures: ['cantidad'], limit: 0 }), NOW)
        .params.at(-1),
    ).toBe(1);
    expect(
      compile(
        spec({ dataset: 'deportistas', measures: ['cantidad'], limit: -3 }),
        NOW,
      ).params.at(-1),
    ).toBe(1);
    expect(
      compile(
        spec({ dataset: 'deportistas', measures: ['cantidad'], limit: Number.NaN }),
        NOW,
      ).params.at(-1),
    ).toBe(MAX_LIMIT);
  });

  it(`rechaza más de ${MAX_DIMENSIONS} dimensiones`, () => {
    expect(() =>
      compile(
        spec({
          dataset: 'deportistas',
          dimensions: ['disciplina', 'categoria', 'estado', 'genero', 'provincia'],
          measures: ['cantidad'],
        }),
        NOW,
      ),
    ).toThrow(/más de 4 dimensiones/);
  });

  it('rechaza una query sin dimensiones ni medidas', () => {
    expect(() => compile(spec({ dataset: 'deportistas' }), NOW)).toThrow(
      /al menos una dimensión o una medida/,
    );
  });

  it('rechaza un spec que no es de modo builder', () => {
    expect(() =>
      compile({ mode: 'sql', sql: 'SELECT 1' } as unknown as QuerySpec, NOW),
    ).toThrow(/mode "builder"/);
  });
});

// ---------------------------------------------------------------------------
// Intentos de inyección — todos deben lanzar, nunca generar SQL
// ---------------------------------------------------------------------------

describe('intentos de inyección', () => {
  it('dimensión con SQL embebido', () => {
    expect(() =>
      compile(
        spec({
          dataset: 'deportistas',
          dimensions: ['nombre; DROP TABLE deportistas--'],
          measures: ['cantidad'],
        }),
        NOW,
      ),
    ).toThrow(/Dimensión desconocida/);
  });

  it('dataset con path traversal', () => {
    expect(() =>
      compile(spec({ dataset: '../../etc', measures: ['cantidad'] }), NOW),
    ).toThrow(/Dataset desconocido/);
  });

  it('dataset que apunta a una propiedad heredada del prototipo', () => {
    for (const nombre of ['__proto__', 'constructor', 'toString']) {
      expect(() => compile(spec({ dataset: nombre, measures: ['cantidad'] }), NOW)).toThrow(
        /Dataset desconocido/,
      );
    }
  });

  it('medida con una subquery', () => {
    expect(() =>
      compile(
        spec({ dataset: 'deportistas', measures: ['COUNT(*) FROM pg_shadow'] }),
        NOW,
      ),
    ).toThrow(/Medida desconocida/);
  });

  it('sort con un statement encadenado', () => {
    expect(() =>
      compile(
        spec({
          dataset: 'deportistas',
          dimensions: ['estado'],
          measures: ['cantidad'],
          sort: [{ field: '1; DELETE FROM triage', direction: 'asc' }],
        }),
        NOW,
      ),
    ).toThrow(/no está en el SELECT/);
  });

  it('sort con una dirección arbitraria', () => {
    expect(() =>
      compile(
        spec({
          dataset: 'deportistas',
          dimensions: ['estado'],
          measures: ['cantidad'],
          sort: [{ field: 'estado', direction: 'asc; DROP TABLE triage' as never }],
        }),
        NOW,
      ),
    ).toThrow(/Dirección de orden inválida/);
  });

  it('campo de filtro desconocido', () => {
    expect(() =>
      compile(
        spec({
          dataset: 'deportistas',
          measures: ['cantidad'],
          filters: {
            op: 'all',
            children: [{ field: "estado' OR 1=1--", operator: 'eq', value: 'x' }],
          },
        }),
        NOW,
      ),
    ).toThrow(/Dimensión desconocida/);
  });

  it('operador de grupo arbitrario', () => {
    expect(() =>
      compile(
        spec({
          dataset: 'deportistas',
          measures: ['cantidad'],
          filters: {
            op: 'all) OR (1=1' as never,
            children: [{ field: 'estado', operator: 'eq', value: 'ACTIVO' }],
          },
        }),
        NOW,
      ),
    ).toThrow(/Operador de grupo inválido/);
  });

  it("el valor \"' OR '1'='1\" viaja como parámetro y no altera el SQL", () => {
    const compiled = compile(
      spec({
        dataset: 'deportistas',
        measures: ['cantidad'],
        filters: {
          op: 'all',
          children: [{ field: 'ciudad', operator: 'eq', value: "' OR '1'='1" }],
        },
      }),
      NOW,
    );
    expect(compiled.sql).toContain('WHERE deportistas.ciudad = $1');
    expect(compiled.sql).not.toContain("OR '1'='1");
    expect(compiled.params[0]).toBe("' OR '1'='1");
    expectParamParity(compiled);
  });

  it('un valor con comodines de LIKE se escapa', () => {
    const compiled = compile(
      spec({
        dataset: 'deportistas',
        measures: ['cantidad'],
        filters: {
          op: 'all',
          children: [{ field: 'ciudad', operator: 'starts_with', value: '100%_' }],
        },
      }),
      NOW,
    );
    expect(compiled.params[0]).toBe('100\\%\\_%');
  });
});
