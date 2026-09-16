import { describe, it, expect } from 'vitest';
import { applyDashboardFilters, type ActiveDashboardFilter } from '../apply-filters';
import { compile } from '../compile';
import type { QuerySpec } from '../types';

const spec: QuerySpec = {
  mode: 'builder',
  dataset: 'deportistas',
  dimensions: ['disciplina'],
  measures: ['cantidad'],
};

const filtro = (over: Partial<ActiveDashboardFilter> = {}): ActiveDashboardFilter => ({
  id: 'f1',
  dataset: 'deportistas',
  dimension: 'estado',
  operator: 'eq',
  value: 'ACTIVO',
  widgetIds: ['w1'],
  ...over,
});

describe('applyDashboardFilters', () => {
  it('inyecta el filtro en el widget al que apunta', () => {
    const out = applyDashboardFilters(spec, 'w1', [filtro()]) as QuerySpec;

    expect(out.filters).toEqual({
      op: 'all',
      children: [{ field: 'estado', operator: 'eq', value: 'ACTIVO' }],
    });
  });

  it('no toca un widget que no está entre los targets', () => {
    const out = applyDashboardFilters(spec, 'w2', [filtro()]);
    expect(out).toBe(spec);
  });

  it('ignora un filtro de otro dataset', () => {
    const out = applyDashboardFilters(spec, 'w1', [filtro({ dataset: 'turnos' })]);
    expect(out).toBe(spec);
  });

  it('ignora un filtro sin valor elegido', () => {
    for (const value of [undefined, null, '', []]) {
      expect(applyDashboardFilters(spec, 'w1', [filtro({ value })])).toBe(spec);
    }
  });

  it('aplica los operadores que no necesitan valor', () => {
    const out = applyDashboardFilters(spec, 'w1', [
      filtro({ operator: 'this_month', dimension: 'fecha_ingreso', value: undefined }),
    ]) as QuerySpec;

    expect(out.filters?.children).toHaveLength(1);
  });

  it('combina con los filtros propios del widget en vez de pisarlos', () => {
    const conPropio: QuerySpec = {
      ...spec,
      filters: { op: 'any', children: [{ field: 'genero', operator: 'eq', value: 'FEMENINO' }] },
    };

    const out = applyDashboardFilters(conPropio, 'w1', [filtro()]) as QuerySpec;

    expect(out.filters?.op).toBe('all');
    expect(out.filters?.children).toHaveLength(2);
    // El grupo propio del widget queda intacto adentro.
    expect(out.filters?.children[0]).toEqual(conPropio.filters);
  });

  it('acumula varios filtros del dashboard', () => {
    const out = applyDashboardFilters(spec, 'w1', [
      filtro(),
      filtro({ id: 'f2', dimension: 'genero', value: 'MASCULINO' }),
    ]) as QuerySpec;

    expect(out.filters?.children).toHaveLength(2);
  });

  it('no altera un spec de SQL crudo', () => {
    const sqlSpec = { mode: 'sql' as const, sql: 'SELECT 1' };
    expect(applyDashboardFilters(sqlSpec, 'w1', [filtro()])).toBe(sqlSpec);
  });

  it('no muta el spec original', () => {
    const original = JSON.parse(JSON.stringify(spec));
    applyDashboardFilters(spec, 'w1', [filtro()]);
    expect(spec).toEqual(original);
  });
});

describe('integración con el compilador', () => {
  it('el spec filtrado compila a SQL parametrizado', () => {
    const out = applyDashboardFilters(spec, 'w1', [filtro()]) as QuerySpec;
    const { sql, params } = compile(out);

    expect(sql).toContain('WHERE');
    expect(params).toContain('ACTIVO');
    // El valor viaja como parámetro, nunca interpolado.
    expect(sql).not.toContain('ACTIVO');
  });

  it('un filtro con una dimensión inexistente lo rechaza el compilador', () => {
    const out = applyDashboardFilters(spec, 'w1', [
      filtro({ dimension: 'columna_inventada' }),
    ]) as QuerySpec;

    expect(() => compile(out)).toThrow(/Dimensión desconocida/);
  });

  it('un intento de inyección en el valor sigue viajando como parámetro', () => {
    const out = applyDashboardFilters(spec, 'w1', [
      filtro({ value: "' OR '1'='1" }),
    ]) as QuerySpec;

    const { sql, params } = compile(out);
    expect(params).toContain("' OR '1'='1");
    expect(sql).not.toContain("OR '1'='1");
  });
});
