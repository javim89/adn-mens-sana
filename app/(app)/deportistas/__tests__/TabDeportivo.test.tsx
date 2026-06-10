import { render, screen, fireEvent } from '@testing-library/react';
import { describe, test, expect, vi } from 'vitest';
import TabDeportivo from '../_components/tabs/TabDeportivo';
import type { DeportistaFormData } from '@/lib/types/deportistas';

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
