import { describe, test, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import SeguimientoForm from '../_components/SeguimientoForm';
import type { SeguimientoListItem } from '@/lib/types/seguimientos';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

// Mock server actions
vi.mock('@/lib/actions/seguimientos', () => ({
  createSeguimiento: vi.fn(),
  updateSeguimiento: vi.fn(),
}));

// Mock DeportistaSelect
vi.mock('../_components/DeportistaSelect', () => ({
  default: () => <div data-testid="deportista-select">DeportistaSelect</div>,
}));

// Mock ProfesionalCombobox
vi.mock('@/app/(app)/turnos/_components/ProfesionalCombobox', () => ({
  default: () => <div data-testid="profesional-combobox">ProfesionalCombobox</div>,
}));

const sampleInitialData: SeguimientoListItem = {
  id: 'seg-1',
  fecha: '2026-07-01',
  titulo: 'Seguimiento de rodilla',
  descripcion: 'Dolor leve en rodilla derecha',
  recomendaciones: 'Reposo 48hs',
  resultadosEvaluacion: null,
  prioridad: 'ALTA',
  proximaCita: null,
  alertaSeguimiento: null,
  profesionalId: 'prof-medico-123',
  profesionalNombre: 'Dr. García',
  deportistaId: 'dep-1',
  deportistaNombre: 'Pérez, Juan',
};

describe('SeguimientoForm', () => {
  test('renderiza el formulario en modo create con campos vacíos', () => {
    render(
      <SeguimientoForm
        mode="create"
        isAdmin={false}
        profesionales={[]}
      />,
    );
    const tituloInput = screen.getByPlaceholderText(/Evaluación de rodilla/i);
    expect(tituloInput).toBeDefined();
    expect((tituloInput as HTMLInputElement).value).toBe('');
  });

  test('el campo "Área responsable" (ProfesionalCombobox) se muestra solo cuando isAdmin=true', () => {
    const { rerender } = render(
      <SeguimientoForm
        mode="create"
        isAdmin={false}
        profesionales={[]}
      />,
    );
    expect(screen.queryByTestId('profesional-combobox')).toBeNull();

    rerender(
      <SeguimientoForm
        mode="create"
        isAdmin={true}
        profesionales={[{ id: 'p1', nombre: 'Ana', apellido: 'López', rol: 'medico' }]}
      />,
    );
    expect(screen.getByTestId('profesional-combobox')).toBeDefined();
  });

  test('el botón de submit muestra "Guardar seguimiento" en modo create', () => {
    render(
      <SeguimientoForm
        mode="create"
        isAdmin={false}
        profesionales={[]}
      />,
    );
    expect(screen.getByText('Guardar seguimiento')).toBeDefined();
  });

  test('el botón de submit muestra "Actualizar seguimiento" en modo edit', () => {
    render(
      <SeguimientoForm
        mode="edit"
        isAdmin={false}
        profesionales={[]}
        initialData={sampleInitialData}
      />,
    );
    expect(screen.getByText('Actualizar seguimiento')).toBeDefined();
  });

  test('el formulario pre-rellena los campos con initialData en modo edit', () => {
    render(
      <SeguimientoForm
        mode="edit"
        isAdmin={false}
        profesionales={[]}
        initialData={sampleInitialData}
      />,
    );
    const tituloInput = screen.getByPlaceholderText(/Evaluación de rodilla/i);
    expect((tituloInput as HTMLInputElement).value).toBe('Seguimiento de rodilla');
  });
});
