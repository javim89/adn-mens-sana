import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SeguimientosTable from '../_components/SeguimientosTable';
import type { SeguimientoListItem } from '@/lib/types/seguimientos';

// Mock next/navigation (URL-driven filtering + pagination)
const mockPush = vi.fn();
const mockReplace = vi.fn();
const mockRefresh = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace, refresh: mockRefresh }),
  usePathname: () => '/seguimientos',
  useSearchParams: () => new URLSearchParams(''),
}));

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode; [key: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

// Mock DeleteSeguimientoModal to simplify tests
vi.mock('../_components/DeleteSeguimientoModal', () => ({
  default: ({ seguimientoTitulo }: { seguimientoTitulo: string }) => (
    <button data-testid="delete-btn" aria-label={`Eliminar ${seguimientoTitulo}`}>
      Eliminar
    </button>
  ),
}));

const makeSeguimiento = (overrides: Partial<SeguimientoListItem> = {}): SeguimientoListItem => ({
  id: 'seg-1',
  fecha: '2026-07-01',
  titulo: 'Evaluación de rodilla',
  descripcion: null,
  recomendaciones: null,
  resultadosEvaluacion: null,
  prioridad: 'MEDIA',
  proximaCita: null,
  alertaSeguimiento: null,
  tipoSeguimiento: null,
  profesionalId: 'prof-medico-123',
  profesionalNombre: 'Dr. García',
  deportistaId: 'dep-1',
  deportistaNombre: 'Pérez, Juan',
  ...overrides,
});

// Helper con defaults para las nuevas props obligatorias
function renderTable(props: Partial<React.ComponentProps<typeof SeguimientosTable>> = {}) {
  const items = props.initialSeguimientos ?? [];
  return render(
    <SeguimientosTable
      initialSeguimientos={items}
      total={props.total ?? items.length}
      page={props.page ?? 0}
      pageSize={props.pageSize ?? 50}
      isAdmin={props.isAdmin ?? false}
      canWrite={props.canWrite ?? false}
      currentUserId={props.currentUserId ?? 'user-x'}
      profesionales={props.profesionales ?? []}
      currentPrioridad={props.currentPrioridad ?? ''}
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

describe('SeguimientosTable', () => {
  test('renderiza "No hay seguimientos" cuando el array está vacío', () => {
    renderTable({ initialSeguimientos: [], total: 0 });
    expect(screen.getAllByText(/No hay seguimientos/i).length).toBeGreaterThan(0);
  });

  test('renderiza filas con datos de seguimientos de prueba', () => {
    const data = [
      makeSeguimiento({ id: 'seg-1', titulo: 'Seguimiento rodilla' }),
      makeSeguimiento({ id: 'seg-2', titulo: 'Control nutricional', prioridad: 'ALTA' }),
    ];
    renderTable({ initialSeguimientos: data, total: 2 });
    expect(screen.getAllByText('Seguimiento rodilla').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Control nutricional').length).toBeGreaterThan(0);
  });

  test('el contador del header muestra el total del server, no el largo de la página', () => {
    const data = [makeSeguimiento({ id: 'seg-1' })];
    renderTable({ initialSeguimientos: data, total: 4911 });
    expect(screen.getByText(/4911 seguimientos/)).toBeDefined();
  });

  test('el botón "Nuevo seguimiento" se muestra cuando canWrite=true', () => {
    renderTable({ initialSeguimientos: [], total: 0, canWrite: true });
    expect(screen.getByText('Nuevo seguimiento')).toBeDefined();
  });

  test('el botón "Nuevo seguimiento" NO se muestra cuando canWrite=false', () => {
    renderTable({ initialSeguimientos: [], total: 0, canWrite: false });
    expect(screen.queryByText('Nuevo seguimiento')).toBeNull();
  });

  test('cambiar el filtro de prioridad navega actualizando la URL y reseteando page', async () => {
    const user = userEvent.setup();
    const data = [makeSeguimiento({ id: 'seg-1', prioridad: 'URGENTE' })];
    renderTable({ initialSeguimientos: data, total: 1, canWrite: true });

    await user.click(screen.getByRole('button', { name: 'Todas las prioridades' }));
    await user.click(screen.getByRole('button', { name: 'Urgente' }));

    expect(mockPush).toHaveBeenCalledTimes(1);
    const url = mockPush.mock.calls[0][0] as string;
    expect(url).toContain('prioridad=URGENTE');
    expect(url).not.toContain('page=');
  });

  test('escribir en la búsqueda actualiza la URL con debounce (router.replace)', async () => {
    const user = userEvent.setup();
    const data = [makeSeguimiento()];
    renderTable({ initialSeguimientos: data, total: 1, canWrite: true });

    const input = screen.getByPlaceholderText('Buscar por título o deportista...');
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
    const data = [makeSeguimiento()];

    const { rerender } = renderTable({ initialSeguimientos: data, total: 1 });
    expect(screen.queryByText('Área responsable')).toBeNull();

    rerender(
      <SeguimientosTable
        initialSeguimientos={data}
        total={1}
        page={0}
        pageSize={50}
        isAdmin={true}
        canWrite={true}
        currentUserId="user-x"
        profesionales={[]}
        currentPrioridad=""
        currentArea=""
        currentSearch=""
      />,
    );
    expect(screen.getByText('Área responsable')).toBeDefined();
  });

  test('el select de área usa la lista completa de profesionales (no derivada de la página)', async () => {
    const user = userEvent.setup();
    const data = [makeSeguimiento({ profesionalId: 'prof-A', profesionalNombre: 'Dr. A' })];
    renderTable({
      initialSeguimientos: data,
      total: 1,
      isAdmin: true,
      canWrite: true,
      profesionales: [
        { id: 'prof-A', nombre: 'Dr. A' },
        { id: 'prof-B', nombre: 'Dr. B' },
      ],
    });

    await user.click(screen.getByRole('button', { name: 'Todas las áreas' }));
    // Ambos profesionales aparecen aunque solo prof-A esté en la página actual
    expect(screen.getByRole('button', { name: 'Dr. B' })).toBeDefined();
  });

  test('botones Editar/Eliminar visibles si isAdmin=true (independientemente del profesionalId)', () => {
    const data = [makeSeguimiento({ profesionalId: 'otro-prof-999' })];
    renderTable({
      initialSeguimientos: data,
      total: 1,
      isAdmin: true,
      canWrite: true,
      currentUserId: 'user-admin-123',
    });
    expect(screen.getAllByTitle('Editar seguimiento').length).toBeGreaterThan(0);
    expect(screen.getAllByTestId('delete-btn').length).toBeGreaterThan(0);
  });

  test('botones Editar/Eliminar visibles si currentUserId === profesionalId aunque no sea admin', () => {
    const data = [makeSeguimiento({ profesionalId: 'prof-medico-123' })];
    renderTable({
      initialSeguimientos: data,
      total: 1,
      canWrite: true,
      currentUserId: 'prof-medico-123',
    });
    expect(screen.getAllByTitle('Editar seguimiento').length).toBeGreaterThan(0);
    expect(screen.getAllByTestId('delete-btn').length).toBeGreaterThan(0);
  });

  test('botones Editar/Eliminar NO visibles si no es admin y no es dueño', () => {
    const data = [makeSeguimiento({ profesionalId: 'prof-medico-123' })];
    renderTable({
      initialSeguimientos: data,
      total: 1,
      canWrite: true,
      currentUserId: 'otro-usuario-distinto',
    });
    expect(screen.queryByTitle('Editar seguimiento')).toBeNull();
    expect(screen.queryByTestId('delete-btn')).toBeNull();
  });

  test('botón Ver seguimiento visible para usuario sin permisos de edición (no admin, no dueño)', () => {
    const data = [makeSeguimiento({ id: 'seg-1', profesionalId: 'prof-medico-123' })];
    renderTable({ initialSeguimientos: data, total: 1, currentUserId: 'otro-usuario-distinto' });
    const viewLinks = screen.getAllByTitle('Ver seguimiento');
    expect(viewLinks.length).toBeGreaterThan(0);
    viewLinks.forEach((link) => {
      expect((link as HTMLAnchorElement).href).toContain('/seguimientos/seg-1');
    });
  });

  test('botón Ver seguimiento visible para admin', () => {
    const data = [makeSeguimiento({ id: 'seg-1', profesionalId: 'otro-prof-999' })];
    renderTable({
      initialSeguimientos: data,
      total: 1,
      isAdmin: true,
      canWrite: true,
      currentUserId: 'user-admin-123',
    });
    const viewLinks = screen.getAllByTitle('Ver seguimiento');
    expect(viewLinks.length).toBeGreaterThan(0);
    viewLinks.forEach((link) => {
      expect((link as HTMLAnchorElement).href).toContain('/seguimientos/seg-1');
    });
  });

  test('botón Ver seguimiento visible para el propio profesional', () => {
    const data = [makeSeguimiento({ id: 'seg-1', profesionalId: 'prof-medico-123' })];
    renderTable({
      initialSeguimientos: data,
      total: 1,
      canWrite: true,
      currentUserId: 'prof-medico-123',
    });
    const viewLinks = screen.getAllByTitle('Ver seguimiento');
    expect(viewLinks.length).toBeGreaterThan(0);
    viewLinks.forEach((link) => {
      expect((link as HTMLAnchorElement).href).toContain('/seguimientos/seg-1');
    });
  });

  test('la columna "Tipo" muestra "Traumatología" para seguimientos con tipoSeguimiento: TRAUMATOLOGIA', () => {
    const data = [makeSeguimiento({ tipoSeguimiento: 'TRAUMATOLOGIA' })];
    renderTable({ initialSeguimientos: data, total: 1 });
    expect(screen.getAllByText('Traumatología').length).toBeGreaterThan(0);
  });

  test('muestra "Genérico" para seguimientos con tipoSeguimiento: null', () => {
    const data = [makeSeguimiento({ tipoSeguimiento: null })];
    renderTable({ initialSeguimientos: data, total: 1 });
    expect(screen.getAllByText('Genérico').length).toBeGreaterThan(0);
  });

  test('botón Ver seguimiento aparece antes que Editar cuando el usuario puede modificar', () => {
    const data = [makeSeguimiento({ id: 'seg-1', profesionalId: 'prof-medico-123' })];
    renderTable({
      initialSeguimientos: data,
      total: 1,
      canWrite: true,
      currentUserId: 'prof-medico-123',
    });
    const allLinks = screen.getAllByRole('link');
    const actionLinks = allLinks.filter(
      (l) =>
        (l as HTMLAnchorElement).title === 'Ver seguimiento' ||
        (l as HTMLAnchorElement).title === 'Editar seguimiento',
    );
    for (let i = 0; i < actionLinks.length; i += 2) {
      expect((actionLinks[i] as HTMLAnchorElement).title).toBe('Ver seguimiento');
      expect((actionLinks[i + 1] as HTMLAnchorElement).title).toBe('Editar seguimiento');
    }
  });

  // -------------------------------------------------------------------------
  // Paginación
  // -------------------------------------------------------------------------

  describe('paginación', () => {
    const pageData = Array.from({ length: 50 }, (_, i) =>
      makeSeguimiento({ id: `seg-${i}`, titulo: `Seguimiento ${i}` }),
    );

    test('renderiza los controles de paginación y el indicador de página', () => {
      renderTable({ initialSeguimientos: pageData, total: 4911, page: 0, pageSize: 50 });
      // 4911 / 50 = 99 páginas
      expect(screen.getByText('Página 1 de 99')).toBeDefined();
      expect(screen.getByText(/Mostrando 1–50 de 4911/)).toBeDefined();
    });

    test('en la primera página el botón "Anterior" está deshabilitado y "Siguiente" habilitado', () => {
      renderTable({ initialSeguimientos: pageData, total: 4911, page: 0, pageSize: 50 });
      expect(screen.getByRole('button', { name: 'Página anterior' })).toHaveProperty('disabled', true);
      expect(screen.getByRole('button', { name: 'Página siguiente' })).toHaveProperty('disabled', false);
    });

    test('en la última página el botón "Siguiente" está deshabilitado', () => {
      renderTable({ initialSeguimientos: pageData, total: 100, page: 1, pageSize: 50 });
      expect(screen.getByRole('button', { name: 'Página siguiente' })).toHaveProperty('disabled', true);
      expect(screen.getByRole('button', { name: 'Página anterior' })).toHaveProperty('disabled', false);
    });

    test('clic en "Siguiente" navega a la página siguiente por URL', async () => {
      const user = userEvent.setup();
      renderTable({ initialSeguimientos: pageData, total: 4911, page: 0, pageSize: 50 });
      await user.click(screen.getByRole('button', { name: 'Página siguiente' }));
      expect(mockPush).toHaveBeenCalledTimes(1);
      expect(mockPush.mock.calls[0][0]).toContain('page=1');
    });

    test('no renderiza controles de paginación cuando total es 0', () => {
      renderTable({ initialSeguimientos: [], total: 0 });
      expect(screen.queryByRole('button', { name: 'Página siguiente' })).toBeNull();
    });
  });
});
