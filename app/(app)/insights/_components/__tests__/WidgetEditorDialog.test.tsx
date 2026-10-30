import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
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
