import { render, screen } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import DeportistasTable from '../_components/DeportistasTable';
import type { DeportistaListItem } from '@/lib/types/deportistas';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => ({ get: vi.fn() }),
}));

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

const mockDeportistas: DeportistaListItem[] = [
  {
    id: '1',
    nombre: 'Juan',
    apellido: 'García',
    dni: '12345678',
    disciplina: 'FUTBOL',
    categoria: 'PRIMERA',
    estado: 'ACTIVO',
    fechaIngreso: new Date('2022-01-01'),
  },
  {
    id: '2',
    nombre: 'María',
    apellido: 'López',
    dni: '87654321',
    disciplina: 'BASQUET',
    categoria: 'RESERVA',
    estado: 'INACTIVO',
    fechaIngreso: null,
  },
];

describe('DeportistasTable', () => {
  const defaultProps = {
    deportistas: mockDeportistas,
    total: 2,
    page: 1,
    pageSize: 20,
    filters: {},
  };

  test('renderiza la lista de deportistas en la tabla', () => {
    render(<DeportistasTable {...defaultProps} />);
    expect(screen.getByText('García, Juan')).toBeInTheDocument();
    expect(screen.getByText('López, María')).toBeInTheDocument();
  });

  test('muestra el nombre completo como "Apellido, Nombre"', () => {
    render(<DeportistasTable {...defaultProps} />);
    expect(screen.getByText('García, Juan')).toBeInTheDocument();
  });

  test('muestra badge de estado Activo con clase verde', () => {
    render(<DeportistasTable {...defaultProps} />);
    const badges = screen.getAllByText('Activo');
    // The first badge (row badge, not the select option)
    const badge = badges.find((el) => el.tagName.toLowerCase() === 'span');
    expect(badge).toHaveClass('bg-green-100');
  });

  test('muestra badge de estado Inactivo con clase gris', () => {
    render(<DeportistasTable {...defaultProps} />);
    const badges = screen.getAllByText('Inactivo');
    const badge = badges.find((el) => el.tagName.toLowerCase() === 'span');
    expect(badge).toHaveClass('bg-gray-100');
  });

  test('input de búsqueda existe en el DOM', () => {
    render(<DeportistasTable {...defaultProps} />);
    expect(screen.getByPlaceholderText(/buscar por nombre/i)).toBeInTheDocument();
  });

  test('selects de filtro están presentes', () => {
    render(<DeportistasTable {...defaultProps} />);
    expect(screen.getByDisplayValue('Todas las disciplinas')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Todas las categorías')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Todos los estados')).toBeInTheDocument();
  });

  test('muestra mensaje cuando la lista está vacía', () => {
    render(<DeportistasTable {...defaultProps} deportistas={[]} total={0} />);
    expect(screen.getByText(/no se encontraron deportistas/i)).toBeInTheDocument();
  });

  test('NO renderiza paginación cuando total <= pageSize', () => {
    render(<DeportistasTable {...defaultProps} total={2} pageSize={20} />);
    expect(screen.queryByText('Anterior')).not.toBeInTheDocument();
  });

  test('renderiza paginación cuando total > pageSize', () => {
    render(<DeportistasTable {...defaultProps} total={25} pageSize={20} />);
    expect(screen.getByText('Anterior')).toBeInTheDocument();
    expect(screen.getByText('Siguiente')).toBeInTheDocument();
  });

  test('botón Nuevo deportista tiene href correcto', () => {
    render(<DeportistasTable {...defaultProps} />);
    const link = screen.getByText('Nuevo deportista').closest('a');
    expect(link).toHaveAttribute('href', '/deportistas/nuevo');
  });

  test('muestra botón Limpiar cuando hay filtros activos', () => {
    render(
      <DeportistasTable
        {...defaultProps}
        filters={{ search: 'García' }}
      />,
    );
    expect(screen.getByText('Limpiar')).toBeInTheDocument();
  });

  test('no muestra botón Limpiar cuando no hay filtros', () => {
    render(<DeportistasTable {...defaultProps} filters={{}} />);
    expect(screen.queryByText('Limpiar')).not.toBeInTheDocument();
  });
});
