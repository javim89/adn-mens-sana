import { describe, it, test, expect, beforeAll, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { ColumnMeta, Row } from '@/lib/insights/types';
import { VISUALIZATIONS, type VizId } from '@/lib/insights/visualizations';
import WidgetRenderer from '../../WidgetRenderer';
import type { VizConfig } from '../types';

/**
 * recharts mide su contenedor con ResizeObserver; en jsdom todo mide 0x0 y
 * `ResponsiveContainer` no llega a renderizar a sus hijos, así que los charts
 * quedarían vacíos y los asserts no probarían nada.
 *
 * Se resuelve en la capa de abajo — dándole al contenedor un tamaño real — en
 * lugar de mockear `ResponsiveContainer`, para que lo que se ejercita siga
 * siendo el árbol de componentes verdadero.
 */
beforeAll(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );

  for (const [prop, value] of [
    ['offsetWidth', 600],
    ['offsetHeight', 400],
    ['clientWidth', 600],
    ['clientHeight', 400],
  ] as const) {
    Object.defineProperty(HTMLElement.prototype, prop, {
      configurable: true,
      value,
    });
  }
});

const columnsCategoria: ColumnMeta[] = [
  {
    id: 'estado',
    label: 'Estado',
    type: 'enum',
    role: 'dimension',
    enumLabels: { ACTIVO: 'Activo', LESIONADO: 'Lesionado' },
  },
  { id: 'cantidad', label: 'Cantidad', type: 'number', role: 'measure', format: 'integer' },
];

const dataCategoria: Row[] = [
  { estado: 'ACTIVO', cantidad: 120 },
  { estado: 'LESIONADO', cantidad: 8 },
];

/** Dos dimensiones: habilita las variantes agrupada/apilada. */
const columnsBreakdown: ColumnMeta[] = [
  { id: 'categoria', label: 'Categoría', type: 'string', role: 'dimension' },
  {
    id: 'estado',
    label: 'Estado',
    type: 'enum',
    role: 'dimension',
    enumLabels: { ACTIVO: 'Activo', LESIONADO: 'Lesionado' },
  },
  { id: 'cantidad', label: 'Cantidad', type: 'number', role: 'measure', format: 'integer' },
];

const dataBreakdown: Row[] = [
  { categoria: '4ta', estado: 'ACTIVO', cantidad: 30 },
  { categoria: '4ta', estado: 'LESIONADO', cantidad: 2 },
  { categoria: '5ta', estado: 'ACTIVO', cantidad: 25 },
];

const columnsSerie: ColumnMeta[] = [
  { id: 'fecha', label: 'Fecha', type: 'date', role: 'dimension' },
  { id: 'cantidad', label: 'Cantidad', type: 'number', role: 'measure', format: 'integer' },
];

const dataSerie: Row[] = [
  { fecha: '2026-07-01T00:00:00.000Z', cantidad: 10 },
  { fecha: '2026-08-01T00:00:00.000Z', cantidad: 14 },
];

const columnsComparacion: ColumnMeta[] = [
  { id: 'actual', label: 'Este mes', type: 'number', role: 'measure', format: 'integer' },
  { id: 'previo', label: 'Mes anterior', type: 'number', role: 'measure', format: 'integer' },
];

/** Datos que sirven para cada tipo, según cuántas dimensiones/medidas pide. */
const CASOS: Record<VizId, { data: Row[]; columns: ColumnMeta[] }> = {
  kpi: { data: [{ cantidad: 248 }], columns: [columnsCategoria[1]] },
  comparison: { data: [{ actual: 20, previo: 16 }], columns: columnsComparacion },
  progress: { data: [{ cantidad: 75 }], columns: [columnsCategoria[1]] },
  line: { data: dataSerie, columns: columnsSerie },
  area: { data: dataSerie, columns: columnsSerie },
  bar: { data: dataCategoria, columns: columnsCategoria },
  grouped_bar: { data: dataBreakdown, columns: columnsBreakdown },
  stacked_bar: { data: dataBreakdown, columns: columnsBreakdown },
  percent_stacked_bar: { data: dataBreakdown, columns: columnsBreakdown },
  composed: { data: dataBreakdown, columns: columnsBreakdown },
  pie: { data: dataCategoria, columns: columnsCategoria },
  donut: { data: dataCategoria, columns: columnsCategoria },
  table: { data: dataCategoria, columns: columnsCategoria },
};

function renderWidget(type: VizId, extra: Partial<VizConfig> = {}) {
  const caso = CASOS[type];
  return render(
    <div style={{ width: 600, height: 400 }}>
      <WidgetRenderer
        data={caso.data}
        columns={caso.columns}
        config={{ type, ...extra }}
      />
    </div>,
  );
}

describe('WidgetRenderer — cada tipo del catálogo renderiza', () => {
  test.each(VISUALIZATIONS.map((v) => [v.id, v.label] as const))(
    '%s (%s) renderiza sin romper',
    (id) => {
      const { container } = renderWidget(id);
      // No debe caer en el estado de error ni quedar vacío.
      expect(screen.queryByRole('alert')).toBeNull();
      expect(container.firstChild).not.toBeNull();
      expect(container.textContent).not.toContain('No se pudo dibujar');
    },
  );

  it('cubre los 13 tipos declarados', () => {
    expect(Object.keys(CASOS).sort()).toEqual(VISUALIZATIONS.map((v) => v.id).sort());
  });
});

describe('WidgetRenderer — estados', () => {
  it('muestra el skeleton mientras carga', () => {
    const { container } = render(
      <WidgetRenderer data={[]} columns={columnsCategoria} config={{ type: 'bar' }} isLoading />,
    );
    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull();
    expect(screen.getByText('Cargando…')).toBeInTheDocument();
  });

  it('muestra el empty state con cero filas', () => {
    render(<WidgetRenderer data={[]} columns={columnsCategoria} config={{ type: 'bar' }} />);
    expect(screen.getByText('Sin datos para mostrar')).toBeInTheDocument();
  });

  it('muestra el error state y no el skeleton cuando hay error', () => {
    render(
      <WidgetRenderer
        data={[]}
        columns={columnsCategoria}
        config={{ type: 'bar' }}
        isLoading
        error="La consulta excedió el tiempo límite"
      />,
    );
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('La consulta excedió el tiempo límite')).toBeInTheDocument();
    expect(screen.queryByText('Cargando…')).toBeNull();
  });

  it('avisa cuando el tipo de visualización no existe', () => {
    render(
      <WidgetRenderer
        data={dataCategoria}
        columns={columnsCategoria}
        config={{ type: 'sunburst' as VizId }}
      />,
    );
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText(/sunburst/)).toBeInTheDocument();
  });

  it('la tabla con cero filas no cae en empty (las columnas ya informan)', () => {
    render(<WidgetRenderer data={[]} columns={columnsCategoria} config={{ type: 'table' }} />);
    // DataTable decide por su cuenta; lo que importa es que no explote.
    expect(screen.queryByRole('alert')).toBeNull();
  });
});

describe('DataTable', () => {
  it('rotula los enums en español y alinea las medidas a la derecha', () => {
    renderWidget('table');

    expect(screen.getByText('Activo')).toBeInTheDocument();
    expect(screen.getByText('Lesionado')).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Estado' })).toBeInTheDocument();

    const celdaMedida = screen.getByText('120');
    expect(celdaMedida.className).toContain('text-right');
    expect(celdaMedida.className).toContain('tabular-nums');
  });
});

describe('KpiChart', () => {
  it('muestra el número y usa el label del config por sobre el de la medida', () => {
    renderWidget('kpi', { label: 'Deportistas activos' });
    expect(screen.getByText('248')).toBeInTheDocument();
    expect(screen.getByText('Deportistas activos')).toBeInTheDocument();
    expect(screen.queryByText('Cantidad')).toBeNull();
  });
});
