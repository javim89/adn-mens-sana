import { render, screen, fireEvent } from '@testing-library/react';
import { describe, test, expect, vi } from 'vitest';
import TabDeportivo from '../_components/tabs/TabDeportivo';
import type { DeportistaFormData } from '@/lib/types/deportistas';

// Radix Select uses a portal and doesn't render options until opened.
// Mock the shadcn select primitives to render all options inline.
vi.mock('@/app/components/ui/select', () => ({
  Select: ({ children, value, onValueChange }: { children: React.ReactNode; value?: string; onValueChange?: (v: string) => void }) => (
    <div data-testid="select" data-value={value}>{children}</div>
  ),
  SelectTrigger: ({ children, id, className }: { children: React.ReactNode; id?: string; className?: string }) => (
    <button id={id} className={className} role="combobox">{children}</button>
  ),
  SelectValue: ({ placeholder }: { placeholder?: string }) => <span>{placeholder}</span>,
  SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <div role="option" data-value={value}>{children}</div>
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

  test('renderiza select de Categoría con opciones', () => {
    render(<TabDeportivo data={emptyData} onChange={vi.fn()} />);
    expect(screen.getByLabelText(/categoría/i)).toBeInTheDocument();
    expect(screen.getByText('Primera')).toBeInTheDocument();
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
