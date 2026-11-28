import { describe, test, expect, vi, beforeEach, beforeAll } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TurnosTable, { type TurnoFila } from '../_components/TurnosTable';

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

// Mock next/navigation (URL-driven filtering + pagination)
const mockPush = vi.fn();
const mockReplace = vi.fn();
const mockRefresh = vi.fn();
let mockSearch = '';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace, refresh: mockRefresh }),
  usePathname: () => '/turnos',
  useSearchParams: () => new URLSearchParams(mockSearch),
}));

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode; [key: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

// Mock DeleteTurnoModal to simplify tests
vi.mock('../_components/DeleteTurnoModal', () => ({
  default: ({ turnoTitulo }: { turnoTitulo: string }) => (
    <button data-testid="delete-btn" aria-label={`Eliminar ${turnoTitulo}`}>
      Eliminar
    </button>
  ),
}));

const makeTurno = (overrides: Partial<TurnoFila> = {}): TurnoFila => ({
  id: 'turno-1',
  titulo: 'Evaluación kinésica',
  fecha: '2026-07-01',
  hora: '10:00',
  lugar: 'Consultorio 3',
  descripcion: null,
  profesionalId: 'prof-medico-123',
  profesionalNombre: 'Dr. García',
  deportistas: [
    { id: 'dep-1', nombre: 'Juan', apellido: 'Pérez', categoria: { id: 'c6', nombre: '6ta división' } },
  ],
  ...overrides,
});

const SEMANA = { desdeClave: '2026-11-09', hastaClave: '2026-11-15' };

// Helper con defaults para las props obligatorias
function renderTable(props: Partial<React.ComponentProps<typeof TurnosTable>> = {}) {
  const items = props.initialTurnos ?? [];
  return render(
    <TurnosTable
      initialTurnos={items}
      total={props.total ?? items.length}
      page={props.page ?? 0}
      pageSize={props.pageSize ?? 50}
      isAdmin={props.isAdmin ?? false}
      profesionales={props.profesionales ?? []}
      currentArea={props.currentArea ?? ''}
      currentSearch={props.currentSearch ?? ''}
      semana={props.semana === undefined ? SEMANA : props.semana}
      vista={props.vista}
      porProfesional={props.porProfesional}
      lateral={props.lateral}
    />,
  );
}

beforeEach(() => {
  mockPush.mockClear();
  mockReplace.mockClear();
  mockRefresh.mockClear();
  mockSearch = '';
});

describe('TurnosTable', () => {
  test('renderiza "No hay turnos" cuando el array está vacío', () => {
    renderTable({ initialTurnos: [], total: 0 });
    expect(screen.getAllByText(/No hay turnos/i).length).toBeGreaterThan(0);
  });

  test('renderiza filas con datos de turnos de prueba', () => {
    const data = [
      makeTurno({ id: 'turno-1', titulo: 'Turno rodilla' }),
      makeTurno({ id: 'turno-2', titulo: 'Control nutricional' }),
    ];
    renderTable({ initialTurnos: data, total: 2 });
    expect(screen.getAllByText('Turno rodilla').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Control nutricional').length).toBeGreaterThan(0);
  });

  test('el contador del header muestra el total del server, no el largo de la página', () => {
    const data = [makeTurno({ id: 'turno-1' })];
    renderTable({ initialTurnos: data, total: 4911 });
    expect(screen.getByText(/4911 turnos/)).toBeDefined();
  });

  test('el botón "Nuevo turno" siempre se muestra', () => {
    renderTable({ initialTurnos: [], total: 0 });
    expect(screen.getByText('Nuevo turno')).toBeDefined();
  });

  test('escribir en la búsqueda actualiza la URL con debounce (router.replace)', async () => {
    const user = userEvent.setup();
    const data = [makeTurno()];
    renderTable({ initialTurnos: data, total: 1 });

    const input = screen.getByPlaceholderText('Buscar por título, lugar o deportista...');
    await user.type(input, 'rodilla');

    await waitFor(
      () => {
        expect(mockReplace).toHaveBeenCalled();
      },
      { timeout: 1000 },
    );
    const url = mockReplace.mock.calls.at(-1)![0] as string;
    expect(url).toContain('q=rodilla');
  });

  test('muestra el profesional debajo del título, también para no-admin', () => {
    renderTable({ initialTurnos: [makeTurno({ profesionalNombre: 'Lic. Romero' })], total: 1 });
    expect(screen.getAllByText('Lic. Romero').length).toBeGreaterThan(0);
  });

  test('la fecha va en un TileFecha con día y hora', () => {
    renderTable({ initialTurnos: [makeTurno({ fecha: '2026-07-01', hora: '10:00' })], total: 1 });
    expect(screen.getAllByText('MIÉ 1/7').length).toBeGreaterThan(0);
    expect(screen.getAllByText('10:00').length).toBeGreaterThan(0);
  });

  test('los deportistas se resumen por categoría', () => {
    const turno = makeTurno({
      deportistas: [
        { id: 'a', nombre: 'A', apellido: 'A', categoria: { id: 'c6', nombre: '6ta división' } },
        { id: 'b', nombre: 'B', apellido: 'B', categoria: { id: 'c6', nombre: '6ta división' } },
        { id: 'c', nombre: 'C', apellido: 'C', categoria: { id: 'c5', nombre: '5ta división' } },
      ],
    });
    renderTable({ initialTurnos: [turno], total: 1 });
    expect(screen.getAllByText('6ta división (2) · 5ta división (1)').length).toBeGreaterThan(0);
  });

  test('el filtro "Profesional" aparece solo para admin', () => {
    const profesionales = [{ id: 'prof-A', nombre: 'Dr. A' }];
    const { unmount } = renderTable({ initialTurnos: [makeTurno()], total: 1, profesionales });
    expect(screen.queryByRole('button', { name: 'Profesional' })).toBeNull();
    unmount();
    renderTable({ initialTurnos: [makeTurno()], total: 1, isAdmin: true, profesionales });
    expect(screen.getByRole('button', { name: 'Profesional' })).toBeInTheDocument();
  });

  test('cambiar el filtro de profesional (admin) navega actualizando la URL y reseteando page', async () => {
    const user = userEvent.setup();
    mockSearch = 'page=2';
    const data = [makeTurno({ profesionalId: 'prof-A', profesionalNombre: 'Dr. A' })];
    renderTable({
      initialTurnos: data,
      total: 1,
      isAdmin: true,
      profesionales: [
        { id: 'prof-A', nombre: 'Dr. A' },
        { id: 'prof-B', nombre: 'Dr. B' },
      ],
    });

    await user.click(screen.getByRole('button', { name: 'Profesional' }));
    await user.click(screen.getByRole('option', { name: 'Dr. B' }));

    expect(mockPush).toHaveBeenCalledTimes(1);
    const url = mockPush.mock.calls[0][0] as string;
    expect(url).toContain('area=prof-B');
    expect(url).not.toContain('page=');
  });

  test('el filtro de profesional usa la lista completa (no derivada de la página)', async () => {
    const user = userEvent.setup();
    const data = [makeTurno({ profesionalId: 'prof-A', profesionalNombre: 'Dr. A' })];
    renderTable({
      initialTurnos: data,
      total: 1,
      isAdmin: true,
      profesionales: [
        { id: 'prof-A', nombre: 'Dr. A' },
        { id: 'prof-B', nombre: 'Dr. B' },
      ],
    });

    await user.click(screen.getByRole('button', { name: 'Profesional' }));
    expect(screen.getByRole('option', { name: 'Dr. B' })).toBeInTheDocument();
  });

  test('muestra botones Editar y Eliminar por fila', () => {
    const data = [makeTurno()];
    renderTable({ initialTurnos: data, total: 1 });
    expect(screen.getAllByTitle('Editar turno').length).toBeGreaterThan(0);
    expect(screen.getAllByTestId('delete-btn').length).toBeGreaterThan(0);
  });

  describe('semana', () => {
    test('el subtítulo dice la semana mostrada', () => {
      renderTable({ initialTurnos: [], total: 0 });
      expect(screen.getByText('Semana del 9 al 15 de noviembre')).toBeInTheDocument();
    });

    test('las flechas navegan a la semana anterior y siguiente', async () => {
      const user = userEvent.setup();
      renderTable({ initialTurnos: [], total: 0 });
      await user.click(screen.getByRole('button', { name: 'Semana siguiente' }));
      expect(mockPush.mock.calls.at(-1)![0]).toContain('semana=2026-11-16');
      await user.click(screen.getByRole('button', { name: 'Semana anterior' }));
      expect(mockPush.mock.calls.at(-1)![0]).toContain('semana=2026-11-02');
    });

    test('"Todos" pasa a todas las fechas y vuelve a la semana', async () => {
      const user = userEvent.setup();
      const { unmount } = renderTable({ initialTurnos: [], total: 0 });
      const todos = screen.getByRole('button', { name: 'Todos' });
      expect(todos).toHaveAttribute('aria-pressed', 'false');
      await user.click(todos);
      expect(mockPush.mock.calls.at(-1)![0]).toContain('semana=todos');
      unmount();

      mockSearch = 'semana=todos';
      renderTable({ initialTurnos: [], total: 0, semana: null });
      expect(screen.getByText('Todos los turnos')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Semana siguiente' })).toBeDisabled();
      const activo = screen.getByRole('button', { name: 'Todos' });
      expect(activo).toHaveAttribute('aria-pressed', 'true');
      await user.click(activo);
      expect(mockPush.mock.calls.at(-1)![0]).not.toContain('semana=');
    });
  });

  describe('vista por profesional', () => {
    const porProfesional = [
      { profesionalId: 'prof-A', nombre: 'Dra. Gómez', area: 'Kinesióloga', cantidad: 3 },
      { profesionalId: 'prof-B', nombre: 'Lic. Paz', area: 'Sin área', cantidad: 1 },
    ];

    test('el toggle de vista aparece solo para admin', () => {
      const { unmount } = renderTable({ initialTurnos: [], total: 0 });
      expect(screen.queryByRole('button', { name: 'Por profesional' })).toBeNull();
      unmount();
      renderTable({ initialTurnos: [], total: 0, isAdmin: true });
      expect(screen.getByRole('button', { name: 'Por profesional' })).toHaveAttribute('aria-pressed', 'false');
    });

    test('elegir "Por profesional" navega con vista=profesional', async () => {
      const user = userEvent.setup();
      renderTable({ initialTurnos: [], total: 0, isAdmin: true });
      await user.click(screen.getByRole('button', { name: 'Por profesional' }));
      expect(mockPush.mock.calls.at(-1)![0]).toContain('vista=profesional');
    });

    test('muestra una tarjeta por profesional con área y cantidad, que linkea a su lista', () => {
      mockSearch = 'vista=profesional';
      renderTable({ initialTurnos: [], total: 0, isAdmin: true, vista: 'profesional', porProfesional });
      const lista = screen.getByRole('list', { name: 'Turnos por profesional' });
      const tarjetas = within(lista).getAllByRole('listitem');
      expect(tarjetas).toHaveLength(2);
      expect(within(tarjetas[0]).getByText('Kinesióloga')).toBeInTheDocument();
      expect(within(tarjetas[0]).getByText('3 turnos')).toBeInTheDocument();
      expect(within(tarjetas[1]).getByText('1 turno')).toBeInTheDocument();
      const link = within(tarjetas[0]).getByRole('link', { name: 'Dra. Gómez' });
      expect(link.getAttribute('href')).toContain('area=prof-A');
      expect(link.getAttribute('href')).not.toContain('vista=');
      expect(screen.queryByRole('table')).toBeNull();
    });

    test('un no-admin nunca ve la vista por profesional', () => {
      renderTable({ initialTurnos: [makeTurno()], total: 1, vista: 'profesional', porProfesional });
      expect(screen.queryByRole('list', { name: 'Turnos por profesional' })).toBeNull();
      expect(screen.getByRole('table')).toBeInTheDocument();
    });
  });

  test('renderiza la columna lateral', () => {
    renderTable({ initialTurnos: [], total: 0, lateral: <p>Lateral de prueba</p> });
    expect(screen.getByRole('complementary', { name: 'Próximos turnos' })).toHaveTextContent('Lateral de prueba');
  });

  // -------------------------------------------------------------------------
  // Paginación
  // -------------------------------------------------------------------------

  describe('paginación', () => {
    const pageData = Array.from({ length: 50 }, (_, i) =>
      makeTurno({ id: `turno-${i}`, titulo: `Turno ${i}` }),
    );

    test('renderiza los controles de paginación y el indicador de página', () => {
      renderTable({ initialTurnos: pageData, total: 4911, page: 0, pageSize: 50 });
      // 4911 / 50 = 99 páginas
      expect(screen.getByText('Página 1 de 99')).toBeDefined();
      expect(screen.getByText(/Mostrando 1–50 de 4911/)).toBeDefined();
    });

    test('en la primera página el botón "Anterior" está deshabilitado y "Siguiente" habilitado', () => {
      renderTable({ initialTurnos: pageData, total: 4911, page: 0, pageSize: 50 });
      expect(screen.getByRole('button', { name: 'Página anterior' })).toHaveProperty('disabled', true);
      expect(screen.getByRole('button', { name: 'Página siguiente' })).toHaveProperty('disabled', false);
    });

    test('en la última página el botón "Siguiente" está deshabilitado', () => {
      renderTable({ initialTurnos: pageData, total: 100, page: 1, pageSize: 50 });
      expect(screen.getByRole('button', { name: 'Página siguiente' })).toHaveProperty('disabled', true);
      expect(screen.getByRole('button', { name: 'Página anterior' })).toHaveProperty('disabled', false);
    });

    test('clic en "Siguiente" navega a la página siguiente por URL', async () => {
      const user = userEvent.setup();
      renderTable({ initialTurnos: pageData, total: 4911, page: 0, pageSize: 50 });
      await user.click(screen.getByRole('button', { name: 'Página siguiente' }));
      expect(mockPush).toHaveBeenCalledTimes(1);
      expect(mockPush.mock.calls[0][0]).toContain('page=1');
    });

    test('no renderiza controles de paginación cuando total es 0', () => {
      renderTable({ initialTurnos: [], total: 0 });
      expect(screen.queryByRole('button', { name: 'Página siguiente' })).toBeNull();
    });
  });
});
