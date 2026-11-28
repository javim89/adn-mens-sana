import { describe, it, expect } from 'vitest';
import { formatearDelta, resumenSerie, specPeriodoAnterior } from '../widget-resumen';
import type { QuerySpec } from '@/lib/insights/types';
import type { ColumnMeta } from '../charts/types';

const NOW = new Date('2026-11-27T15:00:00.000Z');

const base: QuerySpec = { mode: 'builder', dataset: 'presentismo', dimensions: [], measures: ['porcentaje_presentismo'] };

describe('specPeriodoAnterior', () => {
  it('"este mes" pasa a "el mes pasado"', () => {
    const spec: QuerySpec = { ...base, filters: { op: 'all', children: [{ field: 'fecha', operator: 'this_month' }] } };
    expect(specPeriodoAnterior(spec, NOW)).toMatchObject({
      filters: { op: 'all', children: [{ field: 'fecha', operator: 'last_month' }] },
    });
  });

  it('"últimos 30 días" pasa a los 30 días anteriores (inclusive)', () => {
    const spec: QuerySpec = {
      ...base,
      filters: { op: 'all', children: [{ field: 'fecha', operator: 'last_n_days', value: 30 }] },
    };
    // Actual: 29/10 – 27/11. Anterior: 29/09 – 28/10.
    expect(specPeriodoAnterior(spec, NOW)).toMatchObject({
      filters: {
        children: [{ field: 'fecha', operator: 'between', value: ['2026-09-29', '2026-10-28T23:59:59.999Z'] }],
      },
    });
  });

  it('busca dentro de grupos "all" anidados (los filtros del dashboard envuelven los del widget)', () => {
    const spec: QuerySpec = {
      ...base,
      filters: {
        op: 'all',
        children: [
          { op: 'all', children: [{ field: 'fecha', operator: 'this_month' }] },
          { field: 'categoria', operator: 'eq', value: '4ta' },
        ],
      },
    };
    expect(specPeriodoAnterior(spec, NOW)).toMatchObject({
      filters: {
        children: [
          { op: 'all', children: [{ field: 'fecha', operator: 'last_month' }] },
          { field: 'categoria', operator: 'eq', value: '4ta' },
        ],
      },
    });
  });

  it('sin filtro de fecha relativo, en grupos "any" o en SQL devuelve null', () => {
    expect(specPeriodoAnterior(base, NOW)).toBeNull();
    expect(
      specPeriodoAnterior(
        { ...base, filters: { op: 'any', children: [{ field: 'fecha', operator: 'this_month' }] } },
        NOW,
      ),
    ).toBeNull();
    expect(specPeriodoAnterior({ mode: 'sql', sql: 'SELECT 1' }, NOW)).toBeNull();
  });
});

describe('resumenSerie', () => {
  const columns: ColumnMeta[] = [
    { id: 'fecha', label: 'Fecha', type: 'date', role: 'dimension' },
    { id: 'n', label: 'N', type: 'number', role: 'measure', format: 'integer' },
  ];

  it('promedio, máximo y variación último − primero', () => {
    const r = resumenSerie(
      [
        { fecha: '2026-01-01', n: 10 },
        { fecha: '2026-02-01', n: 30 },
        { fecha: '2026-03-01', n: 5 },
      ],
      columns,
      { type: 'line' },
      'month',
    );
    expect(r).toEqual({ promedio: '15', mejorLabel: 'Mejor mes', mejor: '30', variacion: '−5' });
  });

  it('sin grano temporal el rótulo es "Máximo"; con menos de 2 puntos, null', () => {
    expect(resumenSerie([{ fecha: 'a', n: 1 }, { fecha: 'b', n: 2 }], columns, { type: 'line' })?.mejorLabel).toBe(
      'Máximo',
    );
    expect(resumenSerie([{ fecha: 'a', n: 1 }], columns, { type: 'line' })).toBeNull();
  });

  it('con dos dimensiones (series abiertas) no aplica', () => {
    const dos: ColumnMeta[] = [{ id: 'cat', label: 'Cat', type: 'string', role: 'dimension' }, ...columns];
    expect(resumenSerie([{ fecha: 'a', cat: 'x', n: 1 }, { fecha: 'b', cat: 'y', n: 2 }], dos, { type: 'line' })).toBeNull();
  });
});

describe('formatearDelta', () => {
  it('porcentaje en puntos, con signo', () => {
    expect(formatearDelta(4, 'percent')).toBe('+4,0 pts');
    expect(formatearDelta(-1.25, 'percent')).toBe('−1,3 pts');
    expect(formatearDelta(0, 'integer')).toBe('0');
  });
});
