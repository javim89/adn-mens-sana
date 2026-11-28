import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SeguimientoForm from '../_components/SeguimientoForm';
import { createSeguimiento } from '@/lib/actions/seguimientos';
import type { SeguimientoListItem } from '@/lib/types/seguimientos';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

const { toastSuccess, toastError } = vi.hoisted(() => ({
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));
vi.mock('sonner', () => ({ toast: { success: toastSuccess, error: toastError } }));

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
  toastSuccess.mockReset();
  toastError.mockReset();
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

  test('con role="medico" se muestra selector con opciones Genérico, Traumatología, Historia Clínica', () => {
    render(
      <SeguimientoForm
        mode="create"
        isAdmin={false}
        role="medico"
        profesionales={[]}
      />,
    );
    // Píldoras (radio group) con GENERICO elegido por defecto.
    const grupo = screen.getByRole('radiogroup', { name: 'Tipo de seguimiento' });
    const radios = within(grupo).getAllByRole('radio');
    expect(radios.map((r) => r.textContent)).toEqual(['Genérico', 'Traumatología', 'Historia Clínica']);
    expect(within(grupo).getByRole('radio', { name: 'Genérico' })).toHaveAttribute('aria-checked', 'true');
    expect(within(grupo).getByRole('radio', { name: 'Traumatología' })).toHaveAttribute('aria-checked', 'false');
  });

  test('con role="psicologo" se muestra selector con opciones Genérico, Evaluación Psicológica', () => {
    render(
      <SeguimientoForm
        mode="create"
        isAdmin={false}
        role="psicologo"
        profesionales={[]}
      />,
    );
    expect(screen.getByRole('radio', { name: 'Evaluación Psicológica' })).toBeDefined();
    expect(screen.queryByRole('radio', { name: /Traumatología/i })).toBeNull();
    expect(screen.queryByRole('radio', { name: /Historia Clínica/i })).toBeNull();
    expect(screen.queryByRole('radio', { name: /Evaluación Cardiológica/i })).toBeNull();
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
    await user.click(screen.getByRole('radio', { name: 'Traumatología' }));
    expect(screen.getByRole('radio', { name: 'Traumatología' })).toHaveAttribute('aria-checked', 'true');
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
    await user.click(screen.getByRole('radio', { name: 'Evaluación Psicológica' }));
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
    const opcionAntropometria = screen.getByRole('radio', { name: 'Antropometría' });
    await user.click(opcionAntropometria);
    expect(screen.getByText('Básicos')).toBeDefined();
    expect(screen.getByText('Pliegues (mm)')).toBeDefined();
    expect(screen.getByRole('group', { name: 'Cálculos automáticos' })).toBeDefined();
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
    await user.click(screen.getByRole('radio', { name: 'Traumatología' }));

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

  // ---- Filtros de disciplina y categoría (para acotar el select de deportista) ----

  const disciplinasMock = [
    {
      id: 'disc-futbol',
      nombre: 'Fútbol',
      categorias: [
        { id: 'cat-sub15', nombre: 'Sub-15' },
        { id: 'cat-sub17', nombre: 'Sub-17' },
      ],
    },
    {
      id: 'disc-basquet',
      nombre: 'Básquet',
      categorias: [{ id: 'cat-mini', nombre: 'Mini' }],
    },
  ];

  test('sin disciplinas provistas NO se muestran los filtros de disciplina/categoría', () => {
    render(
      <SeguimientoForm mode="create" isAdmin={false} role="medico" profesionales={[]} />,
    );
    expect(screen.queryByText(/Disciplina/i)).toBeNull();
    expect(screen.queryByText(/Categoría/i)).toBeNull();
  });

  test('con disciplinas provistas se muestran los filtros y el de categoría arranca deshabilitado', () => {
    render(
      <SeguimientoForm
        mode="create"
        isAdmin={false}
        role="medico"
        profesionales={[]}
        disciplinas={disciplinasMock}
      />,
    );
    expect(screen.getByRole('button', { name: /Todas las disciplinas/i })).toBeDefined();
    // Botón del CustomSelect de categoría: por defecto muestra el placeholder y está deshabilitado
    const categoriaButton = screen.getByRole('button', { name: /Todas las categorías/i });
    expect(categoriaButton).toBeDisabled();
  });

  test('al elegir una disciplina se habilita categoría y muestra SOLO sus categorías', async () => {
    const user = userEvent.setup();
    render(
      <SeguimientoForm
        mode="create"
        isAdmin={false}
        role="medico"
        profesionales={[]}
        disciplinas={disciplinasMock}
      />,
    );

    await user.click(screen.getByRole('button', { name: /Todas las disciplinas/i }));
    await user.click(screen.getByRole('button', { name: /^Fútbol$/i }));

    const categoriaButton = screen.getByRole('button', { name: /Todas las categorías/i });
    expect(categoriaButton).not.toBeDisabled();

    await user.click(categoriaButton);
    expect(screen.getByRole('button', { name: /^Sub-15$/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /^Sub-17$/i })).toBeDefined();
    // No debe ofrecer categorías de otra disciplina
    expect(screen.queryByRole('button', { name: /^Mini$/i })).toBeNull();
  });

  // ---- Tipo en píldoras y feedback con toasts ----

  async function completarYGuardar(user: ReturnType<typeof userEvent.setup>) {
    await user.click(screen.getByTestId('add-dep-1'));
    const fechaInput = document.querySelector('input[type="date"]') as HTMLInputElement;
    fireEvent.change(fechaInput, { target: { value: '2026-08-05' } });
    await user.type(screen.getByPlaceholderText(/Evaluación de rodilla/i), 'Control');
    await user.click(screen.getByText('Guardar seguimiento'));
  }

  test('el selector de tipo va arriba de todo y cada píldora tiene el punto de color del tipo', () => {
    const { container } = render(
      <SeguimientoForm mode="create" isAdmin={false} role="nutricionista" profesionales={[]} />,
    );
    const form = container.querySelector('form')!;
    expect(form.firstElementChild).toContainElement(screen.getByRole('radiogroup'));
    const antropometria = screen.getByRole('radio', { name: 'Antropometría' });
    expect(antropometria.querySelector('span.bg-green-500')).not.toBeNull();
  });

  test('la píldora elegida se resalta con el primario del club', async () => {
    const user = userEvent.setup();
    render(<SeguimientoForm mode="create" isAdmin={false} role="medico" profesionales={[]} />);
    const pill = screen.getByRole('radio', { name: 'Historia Clínica' });
    expect(pill.className).not.toContain('bg-primario');
    await user.click(pill);
    expect(pill.className).toContain('bg-primario');
  });

  test('en modo edit arranca con el tipo del seguimiento', () => {
    render(
      <SeguimientoForm
        mode="edit"
        isAdmin={false}
        role="medico"
        profesionales={[]}
        initialData={{ ...sampleInitialData, tipoSeguimiento: 'TRAUMATOLOGIA' }}
      />,
    );
    expect(screen.getByRole('radio', { name: 'Traumatología' })).toHaveAttribute('aria-checked', 'true');
  });

  test('al guardar con éxito muestra el toast "Seguimiento guardado"', async () => {
    const user = userEvent.setup();
    render(<SeguimientoForm mode="create" isAdmin={false} role="social" profesionales={[]} />);
    await completarYGuardar(user);
    await waitFor(() => expect(toastSuccess).toHaveBeenCalledWith('Seguimiento guardado'));
    expect(toastError).not.toHaveBeenCalled();
  });

  test('si el servidor falla muestra el error en un toast', async () => {
    mockedCreateSeguimiento.mockResolvedValue({ success: false, error: 'Sin permiso' });
    const user = userEvent.setup();
    render(<SeguimientoForm mode="create" isAdmin={false} role="social" profesionales={[]} />);
    await completarYGuardar(user);
    await waitFor(() => expect(toastError).toHaveBeenCalledWith('Sin permiso'));
    expect(toastSuccess).not.toHaveBeenCalled();
  });
});
