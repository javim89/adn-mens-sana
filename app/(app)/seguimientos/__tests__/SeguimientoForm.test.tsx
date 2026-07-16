import { describe, test, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
  tipoSeguimiento: null,
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
        role="medico"
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
        role="medico"
        profesionales={[]}
      />,
    );
    expect(screen.queryByTestId('profesional-combobox')).toBeNull();

    rerender(
      <SeguimientoForm
        mode="create"
        isAdmin={true}
        role="admin"
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
        role="medico"
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
        role="medico"
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
        role="medico"
        profesionales={[]}
        initialData={sampleInitialData}
      />,
    );
    const tituloInput = screen.getByPlaceholderText(/Evaluación de rodilla/i);
    expect((tituloInput as HTMLInputElement).value).toBe('Seguimiento de rodilla');
  });

  // ---- New tests for tipo selector and role-based options ----

  test('con role="medico" se muestra selector con opciones Genérico, Traumatología, Historia Clínica', async () => {
    const user = userEvent.setup();
    render(
      <SeguimientoForm
        mode="create"
        isAdmin={false}
        role="medico"
        profesionales={[]}
      />,
    );
    // The selector button is labeled with the current selection (defaults to GENERICO)
    const tipoButton = screen.getByRole('button', { name: /Genérico/i });
    await user.click(tipoButton);
    expect(screen.getByRole('button', { name: /^Traumatología$/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /^Historia Clínica$/i })).toBeDefined();
    expect(screen.queryByRole('button', { name: /Evaluación Psicológica/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /Evaluación Cardiológica/i })).toBeNull();
  });

  test('con role="psicologo" se muestra selector con opciones Genérico, Evaluación Psicológica', async () => {
    const user = userEvent.setup();
    render(
      <SeguimientoForm
        mode="create"
        isAdmin={false}
        role="psicologo"
        profesionales={[]}
      />,
    );
    const tipoButton = screen.getByRole('button', { name: /Genérico/i });
    await user.click(tipoButton);
    expect(screen.getByRole('button', { name: /^Evaluación Psicológica$/i })).toBeDefined();
    expect(screen.queryByRole('button', { name: /Traumatología/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /Historia Clínica/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /Evaluación Cardiológica/i })).toBeNull();
  });

  test('con role="kinesiologo" NO se muestra el selector de tipo', () => {
    render(
      <SeguimientoForm
        mode="create"
        isAdmin={false}
        role="kinesiologo"
        profesionales={[]}
      />,
    );
    expect(screen.queryByText('Tipo de seguimiento')).toBeNull();
  });

  test('cuando el usuario selecciona tipo TRAUMATOLOGIA, aparece la sección "Estabilidad"', async () => {
    const user = userEvent.setup();
    render(
      <SeguimientoForm
        mode="create"
        isAdmin={false}
        role="medico"
        profesionales={[]}
      />,
    );
    // Open tipo selector and pick Traumatología
    await user.click(screen.getByRole('button', { name: /Genérico/i }));
    await user.click(screen.getByRole('button', { name: /^Traumatología$/i }));
    // The Estabilidad section title should now be visible
    expect(screen.getByText('Estabilidad')).toBeDefined();
  });

  test('cuando el usuario selecciona tipo EVALUACION_PSICOLOGICA, aparecen los campos CPRD numéricos', async () => {
    const user = userEvent.setup();
    render(
      <SeguimientoForm
        mode="create"
        isAdmin={false}
        role="psicologo"
        profesionales={[]}
      />,
    );
    await user.click(screen.getByRole('button', { name: /Genérico/i }));
    await user.click(screen.getByRole('button', { name: /^Evaluación Psicológica$/i }));
    expect(screen.getByText('CPRD – Características Psicológicas')).toBeDefined();
    expect(screen.getByText(/Control de Estrés/i)).toBeDefined();
  });

  test('los campos genéricos (descripción, recomendaciones) siempre se muestran independientemente del tipo', async () => {
    const user = userEvent.setup();
    render(
      <SeguimientoForm
        mode="create"
        isAdmin={false}
        role="medico"
        profesionales={[]}
      />,
    );

    // Present before changing tipo
    expect(screen.getByPlaceholderText(/Detalles del seguimiento/i)).toBeDefined();
    expect(screen.getByPlaceholderText(/Indicaciones, plan de acción/i)).toBeDefined();

    // Change tipo to Traumatología
    await user.click(screen.getByRole('button', { name: /Genérico/i }));
    await user.click(screen.getByRole('button', { name: /^Traumatología$/i }));

    // Still present
    expect(screen.getByPlaceholderText(/Detalles del seguimiento/i)).toBeDefined();
    expect(screen.getByPlaceholderText(/Indicaciones, plan de acción/i)).toBeDefined();
  });
});
