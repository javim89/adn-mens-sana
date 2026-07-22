import { render, screen, fireEvent } from '@testing-library/react';
import { describe, test, expect, vi } from 'vitest';
import TabDeportivo from '../_components/tabs/TabDeportivo';
import type { DeportistaFormData } from '@/lib/types/deportistas';

// CustomSelect only renders options once opened (via portal-less dropdown).
// Mock it to render the trigger plus all options inline so tests can assert on labels
// and click options directly.
vi.mock('@/app/components/ui/custom-select', () => ({
  CustomSelect: ({
    id,
    value,
    onChange,
    options,
    placeholder,
  }: {
    id?: string;
    value: string;
    onChange: (v: string) => void;
    options: Array<{ value: string; label: string }>;
    placeholder?: string;
  }) => (
    <div data-testid="custom-select" data-value={value}>
      <button id={id} role="combobox">{placeholder}</button>
      {options.map((o) => (
        <div key={o.value} role="option" data-value={o.value} onClick={() => onChange(o.value)}>
          {o.label}
        </div>
      ))}
    </div>
  ),
}));

const emptyData: DeportistaFormData = {
  apellido: '',
  nombre: '',
  dni: '',
  fechaNacimiento: '',
  vivePensionClub: false,
  vivePensionExterna: false,
  estado: 'ACTIVO',
  esRepresentante: false,
  clubesAnteriores: [],
};

describe('TabDeportivo', () => {
  test('renderiza select de Disciplina', () => {
    render(<TabDeportivo data={emptyData} onChange={vi.fn()} />);
    expect(screen.getByLabelText(/disciplina/i)).toBeInTheDocument();
  });

  test('renderiza opciones de Disciplina en español', () => {
    render(<TabDeportivo data={emptyData} onChange={vi.fn()} />);
    expect(screen.getByText('Fútbol')).toBeInTheDocument();
    expect(screen.getByText('Básquet')).toBeInTheDocument();
  });

  const categorias = [
    { id: 'cat-4ta', nombre: '4ta' },
    { id: 'cat-primera', nombre: 'Primera' },
  ];

  test('renderiza select de Categoría con opciones provistas por prop', () => {
    render(<TabDeportivo data={emptyData} onChange={vi.fn()} categorias={categorias} />);
    expect(screen.getByLabelText(/categoría/i)).toBeInTheDocument();
    expect(screen.getByText('4ta')).toBeInTheDocument();
    expect(screen.getByText('Primera')).toBeInTheDocument();
  });

  test('seleccionar una categoría setea categoriaId con el id del catálogo', () => {
    const onChange = vi.fn();
    render(<TabDeportivo data={emptyData} onChange={onChange} categorias={categorias} />);
    fireEvent.click(screen.getByText('Primera'));
    expect(onChange).toHaveBeenCalledWith({ categoriaId: 'cat-primera' });
  });

  test('renderiza select de Estado con opciones', () => {
    render(<TabDeportivo data={emptyData} onChange={vi.fn()} />);
    expect(screen.getByLabelText(/estado/i)).toBeInTheDocument();
    expect(screen.getByText('Activo')).toBeInTheDocument();
    expect(screen.getByText('Inactivo')).toBeInTheDocument();
  });

  test('checkbox "Es representante" funciona', () => {
    const onChange = vi.fn();
    render(<TabDeportivo data={emptyData} onChange={onChange} />);
    const checkbox = screen.getByLabelText(/es representante/i);
    expect(checkbox).toBeInTheDocument();
    fireEvent.click(checkbox);
    expect(onChange).toHaveBeenCalledWith({ esRepresentante: true });
  });

  test('renderiza el componente ClubAnteriorList', () => {
    render(<TabDeportivo data={emptyData} onChange={vi.fn()} />);
    expect(screen.getByText('Clubes anteriores')).toBeInTheDocument();
    expect(screen.getByText('Agregar club')).toBeInTheDocument();
  });
});
