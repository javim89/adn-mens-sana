import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const { mockFetch } = vi.hoisted(() => ({ mockFetch: vi.fn() }));

vi.mock('@/lib/api/insights', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/insights')>('@/lib/api/insights');
  return { ...actual, fetchInsightsQuery: mockFetch };
});

import WidgetEditorDialog, { type WidgetDraft } from '../WidgetEditorDialog';

beforeAll(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
});

beforeEach(() => {
  mockFetch.mockReset();
  mockFetch.mockResolvedValue({ data: [], columns: [], meta: { rowCount: 0, truncated: false, elapsedMs: 1 } });
});

function renderDialog(props: { permiteSql?: boolean; widget?: WidgetDraft }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <WidgetEditorDialog open onOpenChange={() => {}} dashboardNombre="Panorama" onSave={() => {}} {...props} />
    </QueryClientProvider>,
  );
}

const widgetSql: WidgetDraft = {
  id: 'w_sql',
  titulo: 'Consulta propia',
  tipo: 'table',
  querySpec: { mode: 'sql', sql: 'SELECT 1 AS uno' },
  vizConfig: { type: 'table' },
};

describe('WidgetEditorDialog — modo SQL', () => {
  it('un admin del club no ve la opción SQL', () => {
    renderDialog({});
    expect(screen.queryByRole('button', { name: 'SQL' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Constructor visual' })).not.toBeInTheDocument();
  });

  it('el staff de BioTeam ve el selector de modo', () => {
    renderDialog({ permiteSql: true });
    expect(screen.getByRole('button', { name: 'SQL' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Constructor visual' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('un widget SQL existente se muestra de solo lectura, con el aviso', () => {
    renderDialog({ widget: widgetSql });
    expect(screen.getByLabelText('Consulta SQL')).toHaveAttribute('readonly');
    expect(screen.getByRole('note')).toHaveTextContent('Solo el equipo de soporte puede editarla');
  });

  it('el staff puede editar un widget SQL', () => {
    renderDialog({ permiteSql: true, widget: widgetSql });
    expect(screen.getByLabelText('Consulta SQL')).not.toHaveAttribute('readonly');
    expect(screen.queryByRole('note')).not.toBeInTheDocument();
  });
});

const widgetBarras: WidgetDraft = {
  id: 'w_bar',
  titulo: 'Deportistas por disciplina',
  tipo: 'bar',
  querySpec: { mode: 'builder', dataset: 'deportistas', dimensions: ['disciplina'], measures: ['cantidad'] },
  vizConfig: { type: 'bar' },
};

describe('WidgetEditorDialog — constructor visual', () => {
  it('rotula los pasos como Datos / Medida / Agrupar por / Gráfico', () => {
    renderDialog({ widget: widgetBarras });
    expect(screen.getByText('Datos', { selector: 'label' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Medida' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Agrupar por' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Gráfico' })).toBeInTheDocument();
  });

  it('el tipo de gráfico es un toggle con íconos; "Otros" lista el resto', async () => {
    const user = userEvent.setup();
    renderDialog({ widget: widgetBarras });
    const barras = screen.getByRole('button', { name: 'Barras' });
    const tabla = screen.getByRole('button', { name: 'Tabla' });
    expect(barras).toHaveAttribute('aria-pressed', 'true');
    expect(tabla).toHaveAttribute('aria-pressed', 'false');

    await user.click(tabla);
    expect(tabla).toHaveAttribute('aria-pressed', 'true');
    expect(barras).toHaveAttribute('aria-pressed', 'false');

    const otros = screen.getByRole('combobox', { name: 'Otros tipos de gráfico' });
    expect(otros).toHaveValue('');
    await user.selectOptions(otros, 'donut');
    expect(otros).toHaveValue('donut');
    expect(screen.getByRole('button', { name: 'Tabla' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('deshabilita los tipos incompatibles con la consulta (Líneas sin fecha)', () => {
    renderDialog({ widget: widgetBarras });
    expect(screen.getByRole('button', { name: 'Líneas' })).toBeDisabled();
  });

  it('las opciones avanzadas arrancan colapsadas y se abren', async () => {
    const user = userEvent.setup();
    renderDialog({ widget: widgetBarras });
    const toggle = screen.getByRole('button', { name: 'Opciones avanzadas' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByLabelText('Límite de filas')).toBeNull();
    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByLabelText('Límite de filas')).toBeInTheDocument();
  });

  it('con filtros o límite guardados, las opciones avanzadas arrancan abiertas', () => {
    renderDialog({
      widget: { ...widgetBarras, querySpec: { ...widgetBarras.querySpec, limit: 10 } as WidgetDraft['querySpec'] },
    });
    expect(screen.getByRole('button', { name: 'Opciones avanzadas' })).toHaveAttribute('aria-expanded', 'true');
  });
});
