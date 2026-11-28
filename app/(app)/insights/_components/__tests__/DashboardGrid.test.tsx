import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { DashboardWidget } from '@/lib/actions/insights';

const { mockFetch } = vi.hoisted(() => ({ mockFetch: vi.fn() }));

vi.mock('@/lib/api/insights', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/insights')>(
    '@/lib/api/insights',
  );
  return { ...actual, fetchInsightsQuery: mockFetch };
});

import DashboardGrid from '../DashboardGrid';

/**
 * react-grid-layout y recharts miden su contenedor con ResizeObserver, que en
 * jsdom no existe y devuelve 0x0. Se lo stubea y se le dan dimensiones reales
 * al DOM para que ambos rendericen de verdad.
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
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: false,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
    onchange: null,
  }));
  for (const [prop, value] of [
    ['offsetWidth', 1200],
    ['offsetHeight', 800],
    ['clientWidth', 1200],
    ['clientHeight', 800],
  ] as const) {
    Object.defineProperty(HTMLElement.prototype, prop, { configurable: true, value });
  }
});

const widget = (over: Partial<DashboardWidget> = {}): DashboardWidget => ({
  id: 'w1',
  titulo: 'Deportistas por disciplina',
  descripcion: null,
  tipo: 'bar',
  querySpec: {
    mode: 'builder',
    dataset: 'deportistas',
    dimensions: ['disciplina'],
    measures: ['cantidad'],
  },
  vizConfig: { type: 'bar' },
  x: 0,
  y: 0,
  w: 6,
  h: 8,
  ...over,
});

function renderGrid(props: Partial<React.ComponentProps<typeof DashboardGrid>> = {}) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(
    <QueryClientProvider client={client}>
      <DashboardGrid widgets={[widget()]} {...props} />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockFetch.mockResolvedValue({
    data: [{ disciplina: 'Fútbol', cantidad: 409 }],
    columns: [
      { id: 'disciplina', label: 'Disciplina', type: 'string', role: 'dimension' },
      { id: 'cantidad', label: 'Cantidad', type: 'number', role: 'measure', format: 'integer' },
    ],
    meta: { rowCount: 1, truncated: false, elapsedMs: 4 },
  });
});

describe('DashboardGrid', () => {
  it('renderiza el título del widget', async () => {
    renderGrid();
    expect(await screen.findByText('Deportistas por disciplina')).toBeInTheDocument();
  });

  it('en modo vista la grilla queda estática', () => {
    const { container } = renderGrid({ editable: false });
    expect(container.querySelector('.insights-grid.is-static')).not.toBeNull();
  });

  it('en modo edición la grilla es interactiva', () => {
    const { container } = renderGrid({ editable: true });
    expect(container.querySelector('.insights-grid.is-static')).toBeNull();
  });

  it('el asa de arrastre está en el header, no en toda la card', () => {
    const { container } = renderGrid({ editable: true });
    const handle = container.querySelector('.widget-drag-handle');
    expect(handle).not.toBeNull();
    expect(handle?.textContent).toContain('Deportistas por disciplina');
  });

  it('pide los datos del widget', async () => {
    renderGrid();
    await waitFor(() => expect(mockFetch).toHaveBeenCalled());
    expect(mockFetch).toHaveBeenCalledWith(
      expect.objectContaining({ dataset: 'deportistas' }),
    );
  });
});

describe('WidgetCard — menú de acciones', () => {
  it('en modo vista el CSV está visible en el header y no hay menú de acciones', async () => {
    renderGrid({ editable: false });

    expect(await screen.findByRole('button', { name: 'Exportar CSV de Deportistas por disciplina' })).toHaveTextContent('CSV');
    expect(screen.queryByLabelText(/Acciones de/)).toBeNull();
    expect(screen.queryByText('Editar')).toBeNull();
  });

  it('en modo edición el menú ofrece editar, duplicar y eliminar (el CSV sigue visible)', async () => {
    const user = userEvent.setup();
    renderGrid({ editable: true });

    expect(screen.getByRole('button', { name: /Exportar CSV de/ })).toBeInTheDocument();
    await user.click(await screen.findByLabelText(/Acciones de/));

    expect(await screen.findByText('Editar')).toBeInTheDocument();
    expect(screen.getByText('Duplicar')).toBeInTheDocument();
    expect(screen.getByText('Eliminar')).toBeInTheDocument();
  });

  it('avisa al padre cuando se elige Eliminar', async () => {
    const user = userEvent.setup();
    const onDeleteWidget = vi.fn();
    renderGrid({ editable: true, onDeleteWidget });

    await user.click(await screen.findByLabelText(/Acciones de/));
    await user.click(await screen.findByText('Eliminar'));

    expect(onDeleteWidget).toHaveBeenCalledWith(expect.objectContaining({ id: 'w1' }));
  });

  it('avisa al padre cuando se elige Editar', async () => {
    const user = userEvent.setup();
    const onEditWidget = vi.fn();
    renderGrid({ editable: true, onEditWidget });

    await user.click(await screen.findByLabelText(/Acciones de/));
    await user.click(await screen.findByText('Editar'));

    expect(onEditWidget).toHaveBeenCalledWith(expect.objectContaining({ id: 'w1' }));
  });
});

describe('WidgetCard — resúmenes', () => {
  it('un widget de línea muestra Promedio / Mejor semana / Variación', async () => {
    mockFetch.mockResolvedValue({
      data: [
        { fecha: '2026-09-07', porcentaje_presentismo: 80 },
        { fecha: '2026-09-14', porcentaje_presentismo: 90 },
        { fecha: '2026-09-21', porcentaje_presentismo: 85 },
      ],
      columns: [
        { id: 'fecha', label: 'Fecha', type: 'date', role: 'dimension' },
        { id: 'porcentaje_presentismo', label: '% presentismo', type: 'number', role: 'measure', format: 'percent' },
      ],
      meta: { rowCount: 3, truncated: false, elapsedMs: 4 },
    });
    renderGrid({
      widgets: [
        widget({
          titulo: 'Presentismo — últimas 12 semanas',
          tipo: 'line',
          querySpec: {
            mode: 'builder',
            dataset: 'presentismo',
            dimensions: ['fecha'],
            measures: ['porcentaje_presentismo'],
            timeGrain: 'week',
            timeDimension: 'fecha',
          },
          vizConfig: { type: 'line' },
        }),
      ],
    });
    expect(await screen.findByText('Promedio')).toBeInTheDocument();
    expect(screen.getByText('85,0%')).toBeInTheDocument();
    expect(screen.getByText('Mejor semana')).toBeInTheDocument();
    expect(screen.getByText('90,0%')).toBeInTheDocument();
    expect(screen.getByText('Variación')).toBeInTheDocument();
    expect(screen.getByText('+5,0 pts')).toBeInTheDocument();
  });

  it('un KPI con compararPeriodo consulta el período anterior y muestra la variación', async () => {
    mockFetch.mockImplementation(async (spec: { filters?: { children: { operator: string }[] } }) => {
      const anterior = spec.filters?.children.some((c) => c.operator === 'last_month');
      return {
        data: [{ seguimientos: anterior ? 10 : 14 }],
        columns: [{ id: 'seguimientos', label: 'Seguimientos', type: 'number', role: 'measure', format: 'integer' }],
        meta: { rowCount: 1, truncated: false, elapsedMs: 1 },
      };
    });
    renderGrid({
      widgets: [
        widget({
          titulo: 'Seguimientos del mes',
          tipo: 'kpi',
          querySpec: {
            mode: 'builder',
            dataset: 'seguimientos',
            dimensions: [],
            measures: ['seguimientos'],
            filters: { op: 'all', children: [{ field: 'fecha', operator: 'this_month' }] },
          },
          vizConfig: { type: 'kpi', compararPeriodo: true },
        }),
      ],
    });
    expect(await screen.findByText('+4')).toBeInTheDocument();
    expect(screen.getByText('vs. período anterior')).toBeInTheDocument();
    expect(mockFetch).toHaveBeenCalledWith(
      expect.objectContaining({ filters: { op: 'all', children: [{ field: 'fecha', operator: 'last_month' }] } }),
    );
  });
});
