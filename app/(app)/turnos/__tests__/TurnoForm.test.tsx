import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TurnoForm from '../_components/TurnoForm';
import { createTurno, updateTurno } from '@/lib/actions/turnos';
import type { TurnoListItem } from '@/lib/types/turnos';

// vi.hoisted ensures mockPush is available inside the vi.mock factory (hoisted above imports)
const mockPush = vi.hoisted(() => vi.fn());

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock('@/lib/actions/turnos', () => ({
  createTurno: vi.fn(),
  updateTurno: vi.fn(),
}));

vi.mock('../_components/DeportistaMultiSelect', () => ({
  default: () => <div data-testid="deportista-multi-select">DeportistaMultiSelect</div>,
}));

vi.mock('../_components/ProfesionalCombobox', () => ({
  default: () => <div data-testid="profesional-combobox">ProfesionalCombobox</div>,
}));

const sampleInitialData: TurnoListItem = {
  id: 'turno-1',
  titulo: 'Revisión pretemporada',
  fecha: '2026-07-01',
  hora: '09:00',
  lugar: 'Consultorio 3',
  descripcion: 'Chequeo médico completo',
  profesionalId: 'prof-1',
  profesionalNombre: 'García, Carlos',
  deportistas: [{ id: 'dep-1', nombre: 'Juan', apellido: 'Pérez' }],
};

// Helper: fill all required fields via fireEvent (reliable for date/time inputs)
function fillRequiredFields(titulo = 'Turno de prueba', lugar = 'Sala 1') {
  fireEvent.change(screen.getByPlaceholderText(/Revisión médica pretemporada/i), {
    target: { value: titulo },
  });
  fireEvent.change(document.querySelector('input[name="fecha"]') as HTMLInputElement, {
    target: { value: '2026-07-15' },
  });
  fireEvent.change(document.querySelector('input[name="hora"]') as HTMLInputElement, {
    target: { value: '10:00' },
  });
  fireEvent.change(screen.getByPlaceholderText(/Consultorio 3/i), {
    target: { value: lugar },
  });
}

describe('TurnoForm', () => {
  beforeEach(() => {
    mockPush.mockClear();
    vi.mocked(createTurno).mockReset();
    vi.mocked(updateTurno).mockReset();
  });

  test('1. renderiza el formulario en modo create sin errores', () => {
    render(<TurnoForm mode="create" isAdmin={false} profesionales={[]} />);

    expect(screen.getByPlaceholderText(/Revisión médica pretemporada/i)).toBeDefined();
    expect(screen.getByPlaceholderText(/Consultorio 3/i)).toBeDefined();
    expect(screen.getByTestId('deportista-multi-select')).toBeDefined();
    expect(screen.getByRole('button', { name: 'Guardar turno' })).toBeDefined();
  });

  test('2. muestra errores de campos requeridos al enviar formulario vacío', async () => {
    const user = userEvent.setup();
    render(<TurnoForm mode="create" isAdmin={false} profesionales={[]} />);

    await user.click(screen.getByRole('button', { name: 'Guardar turno' }));

    await waitFor(() => {
      expect(screen.getByText('El título es requerido')).toBeDefined();
      expect(screen.getByText('La fecha es requerida')).toBeDefined();
      expect(screen.getByText('La hora es requerida')).toBeDefined();
      expect(screen.getByText('El lugar es requerido')).toBeDefined();
    });
  });

  test('3. envío exitoso llama a createTurno y redirige a /turnos', async () => {
    vi.mocked(createTurno).mockResolvedValueOnce({ success: true, id: 'new-turno' });

    render(<TurnoForm mode="create" isAdmin={false} profesionales={[]} />);
    fillRequiredFields();

    fireEvent.click(screen.getByRole('button', { name: 'Guardar turno' }));

    await waitFor(() => {
      expect(vi.mocked(createTurno)).toHaveBeenCalledOnce();
      expect(mockPush).toHaveBeenCalledWith('/turnos');
    });
  });

  test('4. modo edit pre-rellena los campos con initialData', () => {
    render(
      <TurnoForm
        mode="edit"
        isAdmin={false}
        profesionales={[]}
        initialData={sampleInitialData}
      />,
    );

    const tituloInput = screen.getByPlaceholderText(/Revisión médica pretemporada/i);
    expect((tituloInput as HTMLInputElement).value).toBe('Revisión pretemporada');

    const lugarInput = screen.getByPlaceholderText(/Consultorio 3/i);
    expect((lugarInput as HTMLInputElement).value).toBe('Consultorio 3');
  });

  test('5. el botón Cancelar navega a /turnos', async () => {
    const user = userEvent.setup();
    render(<TurnoForm mode="create" isAdmin={false} profesionales={[]} />);

    await user.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(mockPush).toHaveBeenCalledWith('/turnos');
  });

  test('6. muestra error de campo "profesionalId" cuando isAdmin=true y no hay profesional seleccionado', async () => {
    const user = userEvent.setup();
    render(<TurnoForm mode="create" isAdmin={true} profesionales={[]} />);

    // ProfesionalCombobox is mocked and never calls field.onChange,
    // so profesionalId stays '' — the superRefine rule fires on submit
    fillRequiredFields();
    await user.click(screen.getByRole('button', { name: 'Guardar turno' }));

    await waitFor(() => {
      expect(screen.getByText('El área responsable es requerida')).toBeDefined();
    });
  });

  test('7. el botón de submit está deshabilitado y muestra texto de carga durante el envío', async () => {
    let resolveFn!: (val: { success: true; id: string }) => void;
    vi.mocked(createTurno).mockReturnValueOnce(
      new Promise<{ success: true; id: string }>((resolve) => {
        resolveFn = resolve;
      }),
    );

    render(<TurnoForm mode="create" isAdmin={false} profesionales={[]} />);
    fillRequiredFields();

    // Use fireEvent (not userEvent) so the pending async transition is observable
    // before all microtasks drain
    fireEvent.click(screen.getByRole('button', { name: 'Guardar turno' }));

    await waitFor(() => {
      const btn = screen.getByRole('button', { name: /Guardando/i });
      expect(btn).toBeDisabled();
    });

    // Resolve the pending action to avoid leaving the test in a hanging state
    await act(async () => {
      resolveFn({ success: true, id: 'cleanup' });
    });
  });
});
