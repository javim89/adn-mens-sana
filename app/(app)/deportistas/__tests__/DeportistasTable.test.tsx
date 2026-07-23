import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import DeportistasTable from '../_components/DeportistasTable';
import type { JsonApiCollection } from '@/lib/types/jsonapi';
import type { DeportistaListAttributes } from '@/lib/api/deportistas';

// Mock next/navigation
const mockRouterPush = vi.fn();
const mockSearchParamsGet = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockRouterPush }),
  useSearchParams: () => ({ get: mockSearchParamsGet }),
}));

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

// Mock the fetch helpers
vi.mock('@/lib/api/deportistas', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/lib/api/deportistas')>();
  return {
    ...original,
    fetchDeportistas: vi.fn(),
    fetchDisciplinas: vi.fn(),
  };
});

import { fetchDeportistas, fetchDisciplinas } from '@/lib/api/deportistas';

// El filtro de categoría se anida al de disciplina: cada disciplina trae sus
// categorías. La tabla usa fetchDisciplinas() (no fetchCategorias).
const mockDisciplinas = [
  {
    id: 'disc-futbol',
    nombre: 'Fútbol',
    categorias: [
      { id: 'cat-primera', nombre: 'Primera' },
      { id: 'cat-reserva', nombre: 'Reserva' },
    ],
  },
  {
    id: 'disc-basquet',
    nombre: 'Básquet',
    categorias: [],
  },
];

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function makeCollection(
  items: Array<{ id: string; attrs: DeportistaListAttributes }>,
  total: number = items.length,
): JsonApiCollection<DeportistaListAttributes> {
  return {
    data: items.map((i) => ({ type: 'deportistas', id: i.id, attributes: i.attrs })),
    links: { self: '', first: '', last: '', prev: null, next: null },
    meta: { total },
  };
}

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

const mockItem1: DeportistaListAttributes = {
  nombre: 'Juan',
  apellido: 'García',
  dni: '12345678',
  disciplinaId: 'disc-futbol',
  disciplina: { id: 'disc-futbol', nombre: 'Fútbol' },
  categoriaId: 'cat-primera',
  categoria: { id: 'cat-primera', nombre: 'Primera' },
  estado: 'ACTIVO',
  fechaIngreso: '2022-01-01T00:00:00.000Z',
};

const mockItem2: DeportistaListAttributes = {
  nombre: 'María',
  apellido: 'López',
  dni: '87654321',
  disciplinaId: 'disc-basquet',
  disciplina: { id: 'disc-basquet', nombre: 'Básquet' },
  categoriaId: 'cat-reserva',
  categoria: { id: 'cat-reserva', nombre: 'Reserva' },
  estado: 'INACTIVO',
  fechaIngreso: null,
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('DeportistasTable', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: no URL params
    mockSearchParamsGet.mockReturnValue(null);
    vi.mocked(fetchDisciplinas).mockResolvedValue(mockDisciplinas);
  });

  test('renderiza la lista de deportistas obtenida de la API', async () => {
    vi.mocked(fetchDeportistas).mockResolvedValue(
      makeCollection([
        { id: '1', attrs: mockItem1 },
        { id: '2', attrs: mockItem2 },
      ]),
    );

    render(<DeportistasTable />, { wrapper });
    // Data appears after async query resolves (renders in both mobile and desktop)
    const results = await screen.findAllByText('García, Juan');
    expect(results.length).toBeGreaterThan(0);
    expect(screen.getAllByText('López, María').length).toBeGreaterThan(0);
  });

  test('muestra badge de estado Activo con clase verde', async () => {
    vi.mocked(fetchDeportistas).mockResolvedValue(
      makeCollection([{ id: '1', attrs: mockItem1 }]),
    );

    render(<DeportistasTable />, { wrapper });
    await screen.findAllByText('García, Juan');

    const badges = screen.getAllByText('Activo');
    const badge = badges.find((el) => el.tagName.toLowerCase() === 'span');
    expect(badge).toHaveClass('bg-green-100');
  });

  test('muestra badge de estado Inactivo con clase gris', async () => {
    vi.mocked(fetchDeportistas).mockResolvedValue(
      makeCollection([{ id: '2', attrs: mockItem2 }]),
    );

    render(<DeportistasTable />, { wrapper });
    await screen.findAllByText('López, María');

    const badges = screen.getAllByText('Inactivo');
    const badge = badges.find((el) => el.tagName.toLowerCase() === 'span');
    expect(badge).toHaveClass('bg-gray-100');
  });

  test('input de búsqueda existe en el DOM', async () => {
    vi.mocked(fetchDeportistas).mockResolvedValue(makeCollection([]));

    render(<DeportistasTable />, { wrapper });
    expect(screen.getByPlaceholderText(/buscar por nombre/i)).toBeInTheDocument();
  });

  test('selects de filtro están presentes', async () => {
    vi.mocked(fetchDeportistas).mockResolvedValue(makeCollection([]));

    render(<DeportistasTable />, { wrapper });
    await screen.findByPlaceholderText(/buscar/i);
    // CustomSelect renderiza triggers como <button>. Los filtros son
    // Disciplina, Categoría y Estado, identificables por su placeholder.
    expect(screen.getByRole('button', { name: /todas las disciplinas/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /todas las categorías/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /todos los estados/i })).toBeInTheDocument();
  });

  test('muestra mensaje cuando la lista está vacía', async () => {
    vi.mocked(fetchDeportistas).mockResolvedValue(makeCollection([], 0));

    render(<DeportistasTable />, { wrapper });
    // Appears in both mobile list and desktop table
    const msgs = await screen.findAllByText(/no se encontraron deportistas/i);
    expect(msgs.length).toBeGreaterThan(0);
  });

  test('NO renderiza paginación cuando total <= pageSize', async () => {
    vi.mocked(fetchDeportistas).mockResolvedValue(makeCollection([], 2));

    render(<DeportistasTable />, { wrapper });
    // allow render
    await screen.findByPlaceholderText(/buscar/i);
    expect(screen.queryByText('Anterior')).not.toBeInTheDocument();
  });

  test('renderiza paginación cuando total > pageSize', async () => {
    vi.mocked(fetchDeportistas).mockResolvedValue(makeCollection([], 25));

    render(<DeportistasTable />, { wrapper });
    expect(await screen.findByText('Anterior')).toBeInTheDocument();
    expect(screen.getByText('Siguiente')).toBeInTheDocument();
  });

  test('botón Nuevo deportista tiene href correcto', async () => {
    vi.mocked(fetchDeportistas).mockResolvedValue(makeCollection([]));

    render(<DeportistasTable />, { wrapper });
    const link = screen.getByText('Nuevo deportista').closest('a');
    expect(link).toHaveAttribute('href', '/deportistas/nuevo');
  });

  test('pasa filter[disciplina] (disciplinaId) en los params de la query cuando está en la URL', async () => {
    // El filtro de disciplina ahora usa un disciplinaId, no el código enum viejo.
    mockSearchParamsGet.mockImplementation((key: string) => {
      if (key === 'filter[disciplina]') return 'disc-futbol';
      return null;
    });

    vi.mocked(fetchDeportistas).mockResolvedValue(makeCollection([]));

    render(<DeportistasTable />, { wrapper });
    await screen.findByPlaceholderText(/buscar/i);

    expect(fetchDeportistas).toHaveBeenCalledWith(
      expect.objectContaining({ 'filter[disciplina]': 'disc-futbol' }),
    );
  });

  test('muestra el nombre de la categoría en la fila', async () => {
    vi.mocked(fetchDeportistas).mockResolvedValue(
      makeCollection([{ id: '1', attrs: mockItem1 }]),
    );

    render(<DeportistasTable />, { wrapper });
    await screen.findAllByText('García, Juan');
    // Aparece en la card mobile y en la fila de la tabla desktop
    expect(screen.getAllByText('Primera').length).toBeGreaterThan(0);
  });

  test('muestra el nombre de la disciplina en la fila', async () => {
    vi.mocked(fetchDeportistas).mockResolvedValue(
      makeCollection([{ id: '1', attrs: mockItem1 }]),
    );

    render(<DeportistasTable />, { wrapper });
    await screen.findAllByText('García, Juan');
    // El nombre de la disciplina aparece (card mobile y fila desktop).
    expect(screen.getAllByText('Fútbol').length).toBeGreaterThan(0);
  });

  test('puebla el filtro de disciplinas desde el catálogo /api/disciplinas', async () => {
    vi.mocked(fetchDeportistas).mockResolvedValue(makeCollection([]));

    render(<DeportistasTable />, { wrapper });
    await screen.findByPlaceholderText(/buscar/i);

    // El catálogo de disciplinas (con categorías anidadas) se solicitó.
    expect(fetchDisciplinas).toHaveBeenCalled();
  });

  test('pasa filter[categoriaId] en los params de la query cuando está en la URL', async () => {
    mockSearchParamsGet.mockImplementation((key: string) => {
      if (key === 'filter[categoriaId]') return 'cat-primera';
      return null;
    });

    vi.mocked(fetchDeportistas).mockResolvedValue(makeCollection([]));

    render(<DeportistasTable />, { wrapper });
    await screen.findByPlaceholderText(/buscar/i);

    expect(fetchDeportistas).toHaveBeenCalledWith(
      expect.objectContaining({ 'filter[categoriaId]': 'cat-primera' }),
    );
  });

  test('el filtro de categoría está deshabilitado sin disciplina seleccionada', async () => {
    vi.mocked(fetchDeportistas).mockResolvedValue(makeCollection([]));

    render(<DeportistasTable />, { wrapper });
    await screen.findByPlaceholderText(/buscar/i);

    // Sin disciplina en la URL, el trigger del filtro de categoría está disabled.
    const categoriaTrigger = screen.getByRole('button', { name: /todas las categorías/i });
    expect(categoriaTrigger).toBeDisabled();
  });

  test('anida el filtro de categoría al de disciplina: al elegir una disciplina se habilita y ofrece sus categorías', async () => {
    // Con una disciplina en la URL, el catálogo anidado habilita el filtro de categoría.
    mockSearchParamsGet.mockImplementation((key: string) => {
      if (key === 'filter[disciplina]') return 'disc-futbol';
      return null;
    });

    vi.mocked(fetchDeportistas).mockResolvedValue(makeCollection([]));

    render(<DeportistasTable />, { wrapper });
    await screen.findByPlaceholderText(/buscar/i);

    // Esperar a que resuelva fetchDisciplinas y se habilite el filtro de categoría.
    const categoriaTrigger = screen.getByRole('button', { name: /todas las categorías/i });
    await waitFor(() => expect(categoriaTrigger).not.toBeDisabled());

    // Al abrirlo, muestra SOLO las categorías de la disciplina elegida (Fútbol).
    fireEvent.click(categoriaTrigger);
    expect(await screen.findByText('Primera')).toBeInTheDocument();
    expect(screen.getByText('Reserva')).toBeInTheDocument();
  });

  test('pasa page[number] en los params de la query cuando está en la URL', async () => {
    mockSearchParamsGet.mockImplementation((key: string) => {
      if (key === 'page[number]') return '2';
      return null;
    });

    vi.mocked(fetchDeportistas).mockResolvedValue(makeCollection([], 50));

    render(<DeportistasTable />, { wrapper });
    await screen.findByPlaceholderText(/buscar/i);

    expect(fetchDeportistas).toHaveBeenCalledWith(
      expect.objectContaining({ 'page[number]': 2 }),
    );
  });
});
