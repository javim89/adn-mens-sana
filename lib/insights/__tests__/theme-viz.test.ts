import { describe, it, expect } from 'vitest';
import {
  SERIES_COLORS,
  TRIAGE_COLORS,
  formatCompact,
  formatValue,
  getSeriesColor,
  hasSemanticColor,
} from '../theme';
import {
  VISUALIZATIONS,
  checkCompatibility,
  firstCompatibleViz,
  isCompatible,
} from '../visualizations';

describe('formatValue — es-AR', () => {
  it('entero sin decimales y con separador de miles', () => {
    expect(formatValue(1234, 'integer')).toBe('1.234');
    expect(formatValue(1234.6, 'integer')).toBe('1.235');
  });

  it('decimal con coma', () => {
    expect(formatValue(22.85, 'decimal')).toBe('22,85');
  });

  it('porcentaje agrega el signo y asume escala 0–100', () => {
    expect(formatValue(87.5, 'percent')).toBe('87,5%');
  });

  it('los vacíos se muestran como guion, no como cero', () => {
    for (const vacio of [null, undefined, '']) {
      expect(formatValue(vacio, 'integer')).toBe('—');
    }
  });

  it('un valor no numérico se devuelve tal cual en vez de NaN', () => {
    expect(formatValue('N/D', 'integer')).toBe('N/D');
  });

  it('los strings numéricos (lo que devuelve Postgres) se formatean igual', () => {
    expect(formatValue('1500', 'integer')).toBe('1.500');
  });
});

describe('formatCompact', () => {
  it('compacta a partir de 100k', () => {
    // Intl separa el número del sufijo con un espacio estrecho (U+202F), no con
    // uno común, así que el assert usa \s en vez de un espacio literal.
    expect(formatCompact(250_000, 'integer')).toMatch(/^250\s?(k|mil)$/i);
  });

  it('no compacta por debajo del umbral', () => {
    expect(formatCompact(1234, 'integer')).toBe('1.234');
  });

  it('nunca compacta porcentajes', () => {
    expect(formatCompact(99.9, 'percent')).toBe('99,9%');
  });
});

describe('getSeriesColor', () => {
  it('usa el color semántico cuando la key es un valor con significado', () => {
    expect(getSeriesColor('ROJO', 0)).toBe(TRIAGE_COLORS.ROJO);
    expect(getSeriesColor('VERDE', 3)).toBe(TRIAGE_COLORS.VERDE);
    expect(hasSemanticColor('ROJO')).toBe(true);
  });

  it('cae en la paleta del club, por índice, para keys sin significado', () => {
    expect(getSeriesColor('futbol', 0)).toBe(SERIES_COLORS[0]);
    expect(getSeriesColor('hockey', 1)).toBe(SERIES_COLORS[1]);
    expect(hasSemanticColor('futbol')).toBe(false);
  });

  it('cicla la paleta en vez de quedarse sin color', () => {
    expect(getSeriesColor('x', SERIES_COLORS.length)).toBe(SERIES_COLORS[0]);
    expect(getSeriesColor('x', SERIES_COLORS.length + 2)).toBe(SERIES_COLORS[2]);
  });
});

describe('isCompatible', () => {
  const spec = (dimensions: string[], measures: string[], timeDimension?: string) => ({
    dimensions,
    measures,
    timeDimension,
  });

  it('KPI acepta una medida sin dimensiones', () => {
    expect(isCompatible('kpi', spec([], ['cantidad']))).toBe(true);
  });

  it('KPI rechaza que se le agregue una dimensión', () => {
    const check = checkCompatibility('kpi', spec(['estado'], ['cantidad']));
    expect(check.compatible).toBe(false);
    expect(check.reason).toMatch(/No admite dimensiones/);
  });

  it('línea exige una dimensión de fecha', () => {
    expect(isCompatible('line', spec(['estado'], ['cantidad']))).toBe(false);
    expect(isCompatible('line', spec(['fecha'], ['cantidad'], 'fecha'))).toBe(true);
  });

  it('la línea rechaza un timeDimension que no está entre las dimensiones', () => {
    expect(isCompatible('line', spec(['estado'], ['cantidad'], 'fecha'))).toBe(false);
  });

  it('torta acepta una dimensión y una medida, y rechaza dos medidas', () => {
    expect(isCompatible('pie', spec(['estado'], ['cantidad']))).toBe(true);
    expect(isCompatible('pie', spec(['estado'], ['cantidad', 'promedio']))).toBe(false);
  });

  it('un tipo inexistente nunca es compatible', () => {
    expect(isCompatible('sunburst', spec(['estado'], ['cantidad']))).toBe(false);
  });

  it('la tabla acepta cualquier combinación, incluso vacía', () => {
    expect(isCompatible('table', spec([], []))).toBe(true);
    expect(isCompatible('table', spec(['a', 'b', 'c'], ['x', 'y']))).toBe(true);
  });
});

describe('firstCompatibleViz', () => {
  it('cae en table cuando nada más encaja', () => {
    expect(firstCompatibleViz({ dimensions: ['a', 'b', 'c', 'd'], measures: [] })).toBe('table');
  });

  it('elige el primero del catálogo que encaja', () => {
    expect(firstCompatibleViz({ dimensions: [], measures: ['cantidad'] })).toBe('kpi');
  });
});

describe('catálogo de visualizaciones', () => {
  it('declara los 13 tipos con ids únicos', () => {
    const ids = VISUALIZATIONS.map((v) => v.id);
    expect(ids).toHaveLength(13);
    expect(new Set(ids).size).toBe(13);
  });

  it('cada tipo tiene rangos coherentes', () => {
    for (const viz of VISUALIZATIONS) {
      expect(viz.label.length).toBeGreaterThan(0);
      expect(viz.description.length).toBeGreaterThan(0);
      if (viz.maxDimensions !== null) {
        expect(viz.maxDimensions).toBeGreaterThanOrEqual(viz.minDimensions);
      }
      if (viz.maxMeasures !== null) {
        expect(viz.maxMeasures).toBeGreaterThanOrEqual(viz.minMeasures);
      }
    }
  });
});
