import { describe, it, expect } from 'vitest';
import type { ColumnMeta, Row } from '@/lib/insights/types';
import {
  X_KEY,
  buildChartData,
  formatCategory,
  resolveBreakdownColumn,
  resolveXColumn,
  toNumber,
  toPercentStack,
} from '../helpers';
import type { VizConfig } from '../types';

const dimEstado: ColumnMeta = {
  id: 'estado',
  label: 'Estado',
  type: 'enum',
  role: 'dimension',
  enumLabels: { ACTIVO: 'Activo', LESIONADO: 'Lesionado' },
};
const dimCategoria: ColumnMeta = {
  id: 'categoria',
  label: 'Categoría',
  type: 'string',
  role: 'dimension',
};
const dimFecha: ColumnMeta = { id: 'fecha', label: 'Fecha', type: 'date', role: 'dimension' };
const medCantidad: ColumnMeta = {
  id: 'cantidad',
  label: 'Cantidad',
  type: 'number',
  role: 'measure',
  format: 'integer',
};

const cfg = (extra: Partial<VizConfig> = {}): VizConfig => ({ type: 'bar', ...extra });

describe('formatCategory', () => {
  it('traduce los enums al español', () => {
    expect(formatCategory('LESIONADO', dimEstado)).toBe('Lesionado');
  });

  it('deja intacto un valor sin traducción', () => {
    expect(formatCategory('4ta', dimCategoria)).toBe('4ta');
  });

  it('muestra los vacíos como "Sin dato"', () => {
    expect(formatCategory(null, dimEstado)).toBe('Sin dato');
    expect(formatCategory('', dimEstado)).toBe('Sin dato');
  });

  it('traduce los booleanos', () => {
    expect(formatCategory(true)).toBe('Sí');
    expect(formatCategory(false)).toBe('No');
  });

  // Regresión: las fechas del motor son fechas de calendario que llegan como
  // medianoche UTC. Formateadas en la zona local (UTC-3) se corrían un día.
  it('formatea el inicio de mes en UTC, sin correrse de mes', () => {
    expect(formatCategory('2026-01-01T00:00:00.000Z', dimFecha)).toMatch(/ene.*2026/i);
  });

  it('formatea un día suelto en UTC, sin correrse de día', () => {
    expect(formatCategory('2026-03-08T12:00:00.000Z', dimFecha)).toBe('08/03/2026');
  });
});

describe('toNumber', () => {
  it('convierte los strings numéricos que devuelve Postgres', () => {
    expect(toNumber('42')).toBe(42);
    expect(toNumber('22.85')).toBe(22.85);
  });

  it('trata null y vacío como cero', () => {
    expect(toNumber(null)).toBe(0);
    expect(toNumber('')).toBe(0);
  });

  it('no propaga NaN', () => {
    expect(toNumber('no es un número')).toBe(0);
  });
});

describe('resolveXColumn / resolveBreakdownColumn', () => {
  const columns = [dimCategoria, dimEstado, medCantidad];

  it('el eje por defecto es la primera dimensión', () => {
    expect(resolveXColumn(columns, cfg())?.id).toBe('categoria');
  });

  it('el config puede sobreescribir el eje', () => {
    expect(resolveXColumn(columns, cfg({ xKey: 'estado' }))?.id).toBe('estado');
  });

  it('el breakdown por defecto es la otra dimensión', () => {
    expect(resolveBreakdownColumn(columns, cfg())?.id).toBe('estado');
  });

  it('breakdownKey en null desactiva el pivoteo', () => {
    expect(resolveBreakdownColumn(columns, cfg({ breakdownKey: null }))).toBeUndefined();
  });
});

describe('buildChartData', () => {
  const data: Row[] = [
    { categoria: '4ta', estado: 'ACTIVO', cantidad: 30 },
    { categoria: '4ta', estado: 'LESIONADO', cantidad: 2 },
    { categoria: '5ta', estado: 'ACTIVO', cantidad: 25 },
  ];

  it('sin breakdown, una serie por medida', () => {
    const out = buildChartData(data, dimCategoria, [medCantidad]);
    expect(out.seriesKeys).toEqual(['cantidad']);
    expect(out.rows).toHaveLength(3);
  });

  it('con breakdown, pivotea la segunda dimensión a columnas', () => {
    const out = buildChartData(data, dimCategoria, [medCantidad], dimEstado);

    expect(out.seriesKeys).toEqual(['ACTIVO', 'LESIONADO']);
    expect(out.seriesLabels).toEqual({ ACTIVO: 'Activo', LESIONADO: 'Lesionado' });
    expect(out.rows).toHaveLength(2);

    const cuarta = out.rows.find((r) => r[X_KEY] === '4ta');
    expect(cuarta).toMatchObject({ ACTIVO: 30, LESIONADO: 2 });
  });

  // Recharts apila mal si una serie falta en una fila: tiene que venir en 0.
  it('rellena con 0 las series ausentes de una fila', () => {
    const out = buildChartData(data, dimCategoria, [medCantidad], dimEstado);
    const quinta = out.rows.find((r) => r[X_KEY] === '5ta');
    expect(quinta?.LESIONADO).toBe(0);
  });

  it('agrupa los valores repetidos de la misma celda', () => {
    const repetidos: Row[] = [
      { categoria: '4ta', estado: 'ACTIVO', cantidad: 10 },
      { categoria: '4ta', estado: 'ACTIVO', cantidad: 5 },
    ];
    const out = buildChartData(repetidos, dimCategoria, [medCantidad], dimEstado);
    expect(out.rows[0].ACTIVO).toBe(15);
  });
});

describe('toPercentStack', () => {
  it('normaliza cada fila a 100', () => {
    const rows = [{ [X_KEY]: '4ta', a: 30, b: 10 }];
    const out = toPercentStack(rows, ['a', 'b']);
    expect(out[0].a).toBe(75);
    expect(out[0].b).toBe(25);
  });

  it('no divide por cero cuando la fila suma 0', () => {
    const out = toPercentStack([{ [X_KEY]: 'x', a: 0, b: 0 }], ['a', 'b']);
    expect(out[0].a).toBe(0);
    expect(out[0].b).toBe(0);
  });
});
