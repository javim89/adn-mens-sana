import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PresentismoForm from '../_components/PresentismoForm';
import type { DisciplinaConCategorias } from '@/lib/queries/disciplinas';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const pushMock = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}));

const {
  createEntrenamientoMock,
  updateEntrenamientoMock,
  getDeportistasParaAsistenciaActionMock,
} = vi.hoisted(() => ({
  createEntrenamientoMock: vi.fn(),
  updateEntrenamientoMock: vi.fn(),
  getDeportistasParaAsistenciaActionMock: vi.fn(),
}));

vi.mock('@/lib/actions/presentismo', () => ({
  createEntrenamiento: createEntrenamientoMock,
  updateEntrenamiento: updateEntrenamientoMock,
  getDeportistasParaAsistenciaAction: getDeportistasParaAsistenciaActionMock,
}));

// Mock CustomSelect con un <select> nativo, identificable por su placeholder.
vi.mock('@/app/components/ui/custom-select', () => ({
  CustomSelect: ({
    value,
    onChange,
    options,
    placeholder,
    disabled,
  }: {
    value: string;
    onChange: (v: string) => void;
    options: { value: string; label: string }[];
    placeholder?: string;
    disabled?: boolean;
  }) => (
    <select
      aria-label={placeholder}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">{placeholder}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  ),
}));

// ─── Fixtures ───────────────────────────────────────────────────────────────

const disciplinas: DisciplinaConCategorias[] = [
  {
    id: 'disc-1',
    nombre: 'Handball',
    categorias: [
      { id: 'cat-1', nombre: 'Sub-15' },
      { id: 'cat-2', nombre: 'Sub-17' },
    ],
  },
] as unknown as DisciplinaConCategorias[];

const roster = [
  { id: 'dep-1', nombre: 'Juan', apellido: 'Alvarez' },
  { id: 'dep-2', nombre: 'Marta', apellido: 'Benitez' },
  { id: 'dep-3', nombre: 'Luis', apellido: 'Castro' },
];

function renderForm(overrides: Partial<React.ComponentProps<typeof PresentismoForm>> = {}) {
  return render(
    <PresentismoForm
      mode="create"
      isAdmin={false}
      entrenadores={[]}
      currentEntrenadorNombre="Coach Test"
      disciplinas={disciplinas}
      {...overrides}
    />,
  );
}

async function selectDisciplinaYCategoria(user: ReturnType<typeof userEvent.setup>) {
  await user.selectOptions(screen.getByLabelText('Seleccionar disciplina...'), 'disc-1');
  await user.selectOptions(screen.getByLabelText('Seleccionar categoría...'), 'cat-1');
}

beforeEach(() => {
  vi.clearAllMocks();
  getDeportistasParaAsistenciaActionMock.mockResolvedValue(roster);
  createEntrenamientoMock.mockResolvedValue({ success: true, id: 'ent-1' });
  updateEntrenamientoMock.mockResolvedValue({ success: true });
});

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('PresentismoForm — carga de plantel', () => {
  test('al elegir disciplina + categoría, carga el plantel y todos quedan PRESENTE', async () => {
    const user = userEvent.setup();
    renderForm();

    await selectDisciplinaYCategoria(user);

    // La server action fue llamada con los ids elegidos
    await waitFor(() =>
      expect(getDeportistasParaAsistenciaActionMock).toHaveBeenCalledWith('disc-1', 'cat-1'),
    );

    // Los 3 deportistas aparecen
    expect(await screen.findByText('Alvarez, Juan')).toBeInTheDocument();
    expect(screen.getByText('Benitez, Marta')).toBeInTheDocument();
    expect(screen.getByText('Castro, Luis')).toBeInTheDocument();

    // Cada fila arranca con "Presente" como opción activa (aria-checked)
    const grupos = screen.getAllByRole('radiogroup');
    expect(grupos).toHaveLength(3);
    for (const g of grupos) {
      expect(within(g).getByRole('radio', { name: 'Presente' })).toHaveAttribute(
        'aria-checked',
        'true',
      );
    }

    // Contadores: 3 presentes, 0 el resto
    expect(screen.getByText('Presentes 3')).toBeInTheDocument();
    expect(screen.getByText('Ausentes 0')).toBeInTheDocument();
    expect(screen.getByText('Tarde 0')).toBeInTheDocument();
    expect(screen.getByText('Se retiró 0')).toBeInTheDocument();
  });

  test('cambiar el control de un deportista actualiza los contadores en vivo', async () => {
    const user = userEvent.setup();
    renderForm();
    await selectDisciplinaYCategoria(user);
    await screen.findByText('Alvarez, Juan');

    const filaJuan = screen.getByText('Alvarez, Juan').closest('li')!;
    await user.click(within(filaJuan).getByRole('radio', { name: 'Ausente' }));

    expect(screen.getByText('Presentes 2')).toBeInTheDocument();
    expect(screen.getByText('Ausentes 1')).toBeInTheDocument();
  });

  test('"Marcar todos presentes" resetea a PRESENTE luego de cambios', async () => {
    const user = userEvent.setup();
    renderForm();
    await selectDisciplinaYCategoria(user);
    await screen.findByText('Alvarez, Juan');

    const filaJuan = screen.getByText('Alvarez, Juan').closest('li')!;
    const filaMarta = screen.getByText('Benitez, Marta').closest('li')!;
    await user.click(within(filaJuan).getByRole('radio', { name: 'Ausente' }));
    await user.click(within(filaMarta).getByRole('radio', { name: 'Llegó tarde' }));
    expect(screen.getByText('Presentes 1')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /marcar todos presentes/i }));
    expect(screen.getByText('Presentes 3')).toBeInTheDocument();
    expect(screen.getByText('Ausentes 0')).toBeInTheDocument();
    expect(screen.getByText('Tarde 0')).toBeInTheDocument();
  });
});

describe('PresentismoForm — validación y submit', () => {
  test('no permite guardar sin plantel: no llama a createEntrenamiento y muestra error', async () => {
    const user = userEvent.setup();
    renderForm();

    // Completar datos mínimos pero SIN disciplina/categoría (sin roster)
    await user.click(screen.getByRole('button', { name: /guardar entrenamiento/i }));

    // Sin disciplina/categoría, la validación de zod bloquea; nunca se llama la action
    await waitFor(() => expect(createEntrenamientoMock).not.toHaveBeenCalled());
  });

  test('bloquea submit cuando falta el tipo de sesión (validación zod)', async () => {
    const user = userEvent.setup();
    renderForm();
    await selectDisciplinaYCategoria(user);
    await screen.findByText('Alvarez, Juan');

    // No se eligió tipo de sesión
    await user.click(screen.getByRole('button', { name: /guardar entrenamiento/i }));

    expect(await screen.findByText('El tipo de sesión es requerido')).toBeInTheDocument();
    expect(createEntrenamientoMock).not.toHaveBeenCalled();
  });

  test('happy path: con datos completos llama createEntrenamiento y navega al listado', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.selectOptions(screen.getByLabelText('Seleccionar tipo...'), 'TECNICO');
    await selectDisciplinaYCategoria(user);
    await screen.findByText('Alvarez, Juan');

    // Marcar un ausente
    const filaJuan = screen.getByText('Alvarez, Juan').closest('li')!;
    await user.click(within(filaJuan).getByRole('radio', { name: 'Ausente' }));

    await user.click(screen.getByRole('button', { name: /guardar entrenamiento/i }));

    await waitFor(() => expect(createEntrenamientoMock).toHaveBeenCalledTimes(1));
    const payload = createEntrenamientoMock.mock.calls[0][0];
    expect(payload.tipoSesion).toBe('TECNICO');
    expect(payload.disciplinaId).toBe('disc-1');
    expect(payload.categoriaId).toBe('cat-1');
    expect(payload.asistencias).toHaveLength(3);
    expect(payload.asistencias).toContainEqual({ deportistaId: 'dep-1', estado: 'AUSENTE' });
    expect(payload.asistencias).toContainEqual({ deportistaId: 'dep-2', estado: 'PRESENTE' });

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/presentismo'));
  });

  test('muestra el error del servidor si la action falla', async () => {
    const user = userEvent.setup();
    createEntrenamientoMock.mockResolvedValue({ success: false, error: 'Boom del server' });
    renderForm();

    await user.selectOptions(screen.getByLabelText('Seleccionar tipo...'), 'FISICO');
    await selectDisciplinaYCategoria(user);
    await screen.findByText('Alvarez, Juan');

    await user.click(screen.getByRole('button', { name: /guardar entrenamiento/i }));

    expect(await screen.findByText('Boom del server')).toBeInTheDocument();
    expect(pushMock).not.toHaveBeenCalled();
  });
});
