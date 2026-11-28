import { describe, test, expect, vi, beforeEach, beforeAll } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ConvocatoriasTable, { type ConvocatoriaListItem } from '../_components/ConvocatoriasTable';
import type { DisciplinaConCategorias } from '@/lib/queries/disciplinas';

beforeAll(() => {
  // cmdk y Radix (FiltroChip) usan APIs que jsdom no trae.
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
  Element.prototype.scrollIntoView ??= function () {};
  Element.prototype.hasPointerCapture ??= () => false;
});

const mockPush = vi.fn();
const mockRefresh = vi.fn();
let mockSearch = '';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
  usePathname: () => '/convocatorias',
  useSearchParams: () => new URLSearchParams(mockSearch),
}));

vi.mock('../_components/DeleteConvocatoriaModal', () => ({
  default: ({ convocatoriaLabel }: { convocatoriaLabel: string }) => (
    <button type="button" aria-label={`Eliminar ${convocatoriaLabel}`}>
      Eliminar
    </button>
  ),
}));

const disciplinas = [
  {
    id: 'futbol',
    nombre: 'Fútbol',
    categorias: [
      { id: 'cat-4', nombre: '4ta' },
      { id: 'cat-5', nombre: '5ta' },
    ],
  },
  { id: 'hockey', nombre: 'Hockey', categorias: [] },
] as unknown as DisciplinaConCategorias[];

const item = (overrides: Partial<ConvocatoriaListItem> = {}): ConvocatoriaListItem => ({
  id: 'conv-1',
  fecha: '2026-11-15',
  disciplinaNombre: 'Fútbol',
  categoriaNombre: '4ta',
  local: 'Club Propio',
  visitante: 'Estudiantes',
  rival: 'Estudiantes',
  condicion: 'Local',
  estado: 'PROGRAMADO',
  horaCitacion: '14:30',
  totalConvocados: 18,
  ...overrides,
});

function renderTable(props: Partial<React.ComponentProps<typeof ConvocatoriasTable>> = {}) {
  const items = props.items ?? [item()];
  return render(
    <ConvocatoriasTable
      items={items}
      total={props.total ?? items.length}
      page={props.page ?? 0}
      pageSize={props.pageSize ?? 25}
      disciplinas={props.disciplinas ?? disciplinas}
      currentDisciplina={props.currentDisciplina ?? ''}
      currentCategoria={props.currentCategoria ?? ''}
    />,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockSearch = '';
});

describe('ConvocatoriasTable', () => {
  test('encabezado con contador y acción "Nueva convocatoria"', () => {
    renderTable({ total: 42 });
    expect(screen.getByRole('heading', { level: 1, name: 'Convocatorias' })).toBeInTheDocument();
    expect(screen.getByText('42 convocatorias')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /nueva convocatoria/i })).toHaveAttribute(
      'href',
      '/convocatorias/nuevo',
    );
  });

  test('fila: tile con el día, citación, "vs. rival", condición, estado, categoría y convocados', () => {
    renderTable();
    const fila = screen.getByRole('table').querySelector('tbody tr') as HTMLElement;
    expect(within(fila).getByText('DOM')).toBeInTheDocument();
    expect(within(fila).getByText('15/11')).toBeInTheDocument();
    expect(within(fila).getByText('14:30')).toBeInTheDocument();
    expect(within(fila).getByRole('link', { name: 'vs. Estudiantes' })).toHaveAttribute(
      'href',
      '/convocatorias/conv-1',
    );
    expect(within(fila).getByText('Local')).toBeInTheDocument();
    expect(within(fila).getByText('Programado')).toHaveClass('bg-secundario');
    expect(within(fila).getByText('Fútbol · 4ta')).toBeInTheDocument();
    expect(within(fila).getByText('18')).toBeInTheDocument();
  });

  test('sin equipo propio muestra "local vs. visitante" y no el chip de condición', () => {
    renderTable({
      items: [item({ rival: null, condicion: null, local: 'A', visitante: 'B', estado: 'SUSPENDIDO' })],
    });
    const fila = screen.getByRole('table').querySelector('tbody tr') as HTMLElement;
    expect(within(fila).getByText('A vs. B')).toBeInTheDocument();
    expect(within(fila).queryByText('Local')).toBeNull();
    expect(within(fila).getByText('Suspendido')).toHaveClass('bg-red-100');
  });

  test('la card mobile resume disciplina, categoría y convocados', () => {
    renderTable({ items: [item({ totalConvocados: 1 })] });
    expect(screen.getByText('Fútbol · 4ta · 1 convocado')).toBeInTheDocument();
  });

  test('vacío: invita a crear la primera', () => {
    renderTable({ items: [], total: 0 });
    expect(screen.getAllByText(/No hay convocatorias cargadas/).length).toBeGreaterThan(0);
  });

  test('filtro chip de disciplina navega y resetea categoría y página', async () => {
    const user = userEvent.setup();
    mockSearch = 'categoria=cat-4&page=2';
    renderTable();
    await user.click(screen.getByRole('button', { name: 'Disciplina' }));
    await user.click(screen.getByRole('option', { name: 'Hockey' }));
    const url = mockPush.mock.calls.at(-1)![0] as string;
    expect(url).toContain('disciplina=hockey');
    expect(url).not.toContain('categoria=');
    expect(url).not.toContain('page=');
  });

  test('el chip de categoría está deshabilitado sin disciplina y filtra con disciplina', async () => {
    const user = userEvent.setup();
    const { unmount } = renderTable();
    expect(screen.getByRole('button', { name: 'Categoría' })).toBeDisabled();
    unmount();

    mockSearch = 'disciplina=futbol';
    renderTable({ currentDisciplina: 'futbol' });
    expect(screen.getByRole('button', { name: 'Disciplina: Fútbol' })).toHaveClass('bg-primario-suave');
    await user.click(screen.getByRole('button', { name: 'Categoría' }));
    await user.click(screen.getByRole('option', { name: '5ta' }));
    const url = mockPush.mock.calls.at(-1)![0] as string;
    expect(url).toContain('disciplina=futbol');
    expect(url).toContain('categoria=cat-5');
  });
});
