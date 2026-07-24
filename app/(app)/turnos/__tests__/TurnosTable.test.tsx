import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TurnosTable from '../_components/TurnosTable';
import type { TurnoListItem } from '@/lib/types/turnos';

// Mock next/navigation (URL-driven filtering + pagination)
const mockPush = vi.fn();
const mockReplace = vi.fn();
const mockRefresh = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace, refresh: mockRefresh }),
  usePathname: () => '/turnos',
  useSearchParams: () => new URLSearchParams(''),
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

const makeTurno = (overrides: Partial<TurnoListItem> = {}): TurnoListItem => ({
  id: 'turno-1',
  titulo: 'Evaluación kinésica',
  fecha: '2026-07-01',
  hora: '10:00',
  lugar: 'Consultorio 3',
  descripcion: null,
  profesionalId: 'prof-medico-123',
  profesionalNombre: 'Dr. García',
  deportistas: [{ id: 'dep-1', nombre: 'Juan', apellido: 'Pérez' }],
  ...overrides,
});

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
    />,
  );
}

beforeEach(() => {
  mockPush.mockClear();
  mockReplace.mockClear();
  mockRefresh.mockClear();
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

  test('la columna "Área responsable" aparece solo cuando isAdmin=true', () => {
    const data = [makeTurno()];

    const { rerender } = renderTable({ initialTurnos: data, total: 1 });
    expect(screen.queryByText('Área responsable')).toBeNull();

    rerender(
      <TurnosTable
        initialTurnos={data}
        total={1}
        page={0}
        pageSize={50}
        isAdmin={true}
        profesionales={[]}
        currentArea=""
        currentSearch=""
      />,
    );
    expect(screen.getByText('Área responsable')).toBeDefined();
  });

  test('cambiar el filtro de área (admin) navega actualizando la URL y reseteando page', async () => {
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

    await user.click(screen.getByRole('button', { name: 'Todas las áreas' }));
    await user.click(screen.getByRole('button', { name: 'Dr. B' }));

    expect(mockPush).toHaveBeenCalledTimes(1);
    const url = mockPush.mock.calls[0][0] as string;
    expect(url).toContain('area=prof-B');
    expect(url).not.toContain('page=');
  });

  test('el select de área usa la lista completa de profesionales (no derivada de la página)', async () => {
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

    await user.click(screen.getByRole('button', { name: 'Todas las áreas' }));
    // Ambos profesionales aparecen aunque solo prof-A esté en la página actual
    expect(screen.getByRole('button', { name: 'Dr. B' })).toBeDefined();
  });

  test('muestra botones Editar y Eliminar por fila', () => {
    const data = [makeTurno()];
    renderTable({ initialTurnos: data, total: 1 });
    expect(screen.getAllByTitle('Editar turno').length).toBeGreaterThan(0);
    expect(screen.getAllByTestId('delete-btn').length).toBeGreaterThan(0);
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
