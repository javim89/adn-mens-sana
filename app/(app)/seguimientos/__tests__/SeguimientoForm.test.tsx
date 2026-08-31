import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SeguimientoForm from '../_components/SeguimientoForm';
import { createSeguimiento } from '@/lib/actions/seguimientos';
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

const mockedCreateSeguimiento = vi.mocked(createSeguimiento);

// Mock DeportistaSelect — invoca onChange para poder completar el campo requerido.
// Soporta multi-selección: cada botón agrega un deportista al arreglo `value`.
type DepOption = { id: string; nombre: string; apellido: string };
vi.mock('../_components/DeportistaSelect', () => ({
  default: ({
    value,
    onChange,
  }: {
    value: DepOption[];
    onChange: (next: DepOption[]) => void;
  }) => (
    <div data-testid="deportista-select">
      <button
        type="button"
        data-testid="add-dep-1"
        onClick={() => onChange([...value, { id: 'dep-1', nombre: 'Juan', apellido: 'Pérez' }])}
      >
        Agregar Juan
      </button>
      <button
        type="button"
        data-testid="add-dep-2"
        onClick={() => onChange([...value, { id: 'dep-2', nombre: 'Ana', apellido: 'Gómez' }])}
      >
        Agregar Ana
      </button>
      <span data-testid="dep-count">{value.length}</span>
    </div>
  ),
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
  deportistas: [{ id: 'dep-1', nombre: 'Juan', apellido: 'Pérez' }],
};

beforeEach(() => {
  mockedCreateSeguimiento.mockReset();
  mockedCreateSeguimiento.mockResolvedValue({ success: true, id: 'seg-new' });
});

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

  test('con role="nutricionista" la opción Antropometría está disponible y al seleccionarla se muestra la sección', async () => {
    const user = userEvent.setup();
    render(
      <SeguimientoForm
        mode="create"
        isAdmin={false}
        role="nutricionista"
        profesionales={[]}
      />,
    );
    await user.click(screen.getByRole('button', { name: /Genérico/i }));
    const opcionAntropometria = screen.getByRole('button', { name: /^Antropometría$/i });
    expect(opcionAntropometria).toBeDefined();
    await user.click(opcionAntropometria);
    expect(screen.getByText('Básicos')).toBeDefined();
    expect(screen.getByText('Pliegues')).toBeDefined();
    expect(screen.getByText('Sumatorias (auto-calculadas)')).toBeDefined();
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

  // ---- Rol social: solo genéricos ----

  test('con role="social" NO se muestra el selector de tipo ni las secciones especializadas de salud', () => {
    render(
      <SeguimientoForm
        mode="create"
        isAdmin={false}
        role="social"
        profesionales={[]}
      />,
    );

    // No selector de tipo
    expect(screen.queryByText('Tipo de seguimiento')).toBeNull();

    // No secciones especializadas de salud
    expect(screen.queryByText('Datos traumatológicos')).toBeNull();
    expect(screen.queryByText('Historia clínica')).toBeNull();
    expect(screen.queryByText('Evaluación psicológica')).toBeNull();
    expect(screen.queryByText('Evaluación cardiológica')).toBeNull();
    expect(screen.queryByText('Antropometría')).toBeNull();
  });

  test('con role="social" SÍ se renderizan los campos base', () => {
    render(
      <SeguimientoForm
        mode="create"
        isAdmin={false}
        role="social"
        profesionales={[]}
      />,
    );

    expect(screen.getByText('Deportista')).toBeDefined();
    expect(screen.getByText('Fecha')).toBeDefined();
    expect(screen.getByText('Próxima cita')).toBeDefined();
    expect(screen.getByText('Título / Motivo')).toBeDefined();
    expect(screen.getByText('Prioridad')).toBeDefined();
    expect(screen.getByPlaceholderText(/Detalles del seguimiento/i)).toBeDefined();
    expect(screen.getByPlaceholderText(/Indicaciones, plan de acción/i)).toBeDefined();
    expect(screen.getByPlaceholderText(/Mediciones, diagnósticos/i)).toBeDefined();
    expect(screen.getByPlaceholderText(/Señales de alerta a monitorear/i)).toBeDefined();
  });

  test('con role="social" el submit envía tipoSeguimiento GENERICO y datosEspecificos vacíos', async () => {
    const user = userEvent.setup();
    render(
      <SeguimientoForm
        mode="create"
        isAdmin={false}
        role="social"
        profesionales={[]}
      />,
    );

    await user.click(screen.getByTestId('add-dep-1'));

    const fechaInput = document.querySelector('input[type="date"]') as HTMLInputElement;
    fireEvent.change(fechaInput, { target: { value: '2026-08-05' } });

    await user.type(screen.getByPlaceholderText(/Evaluación de rodilla/i), 'Visita domiciliaria');

    await user.click(screen.getByText('Guardar seguimiento'));

    await waitFor(() => {
      expect(mockedCreateSeguimiento).toHaveBeenCalledTimes(1);
    });

    const payload = mockedCreateSeguimiento.mock.calls[0][0];
    expect(payload.tipoSeguimiento).toBe('GENERICO');
    expect(payload.datosEspecificos).toEqual({ tipo: 'GENERICO', datos: {} });
  });

  test('el submit envía deportistaIds con varios ids cuando se seleccionan múltiples deportistas', async () => {
    const user = userEvent.setup();
    render(
      <SeguimientoForm
        mode="create"
        isAdmin={false}
        role="medico"
        profesionales={[]}
      />,
    );

    await user.click(screen.getByTestId('add-dep-1'));
    await user.click(screen.getByTestId('add-dep-2'));

    const fechaInput = document.querySelector('input[type="date"]') as HTMLInputElement;
    fireEvent.change(fechaInput, { target: { value: '2026-08-05' } });

    await user.type(screen.getByPlaceholderText(/Evaluación de rodilla/i), 'Evaluación grupal');

    await user.click(screen.getByText('Guardar seguimiento'));

    await waitFor(() => {
      expect(mockedCreateSeguimiento).toHaveBeenCalledTimes(1);
    });

    const payload = mockedCreateSeguimiento.mock.calls[0][0];
    expect(payload.deportistaIds).toEqual(['dep-1', 'dep-2']);
  });

  test('no permite submit sin ningún deportista seleccionado (deportistaIds requerido)', async () => {
    const user = userEvent.setup();
    render(
      <SeguimientoForm
        mode="create"
        isAdmin={false}
        role="medico"
        profesionales={[]}
      />,
    );

    const fechaInput = document.querySelector('input[type="date"]') as HTMLInputElement;
    fireEvent.change(fechaInput, { target: { value: '2026-08-05' } });
    await user.type(screen.getByPlaceholderText(/Evaluación de rodilla/i), 'Sin deportista');

    await user.click(screen.getByText('Guardar seguimiento'));

    await waitFor(() => {
      expect(screen.getByText('Seleccione al menos un deportista')).toBeInTheDocument();
    });
    expect(mockedCreateSeguimiento).not.toHaveBeenCalled();
  });
});
