import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ConvocatoriaForm from '../_components/ConvocatoriaForm';
import type { DisciplinaConCategorias } from '@/lib/queries/disciplinas';
import type { ProximoPartido, DeportistaConvocable } from '@/lib/types/convocatorias';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const pushMock = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}));

const {
  createConvocatoriaMock,
  updateConvocatoriaMock,
  getProximoPartidoActionMock,
  getDeportistasParaConvocarActionMock,
} = vi.hoisted(() => ({
  createConvocatoriaMock: vi.fn(),
  updateConvocatoriaMock: vi.fn(),
  getProximoPartidoActionMock: vi.fn(),
  getDeportistasParaConvocarActionMock: vi.fn(),
}));

vi.mock('@/lib/actions/convocatorias', () => ({
  createConvocatoria: createConvocatoriaMock,
  updateConvocatoria: updateConvocatoriaMock,
  getProximoPartidoAction: getProximoPartidoActionMock,
  getDeportistasParaConvocarAction: getDeportistasParaConvocarActionMock,
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

const partido: ProximoPartido = {
  eventoTorneoId: 'evento-1',
  fecha: '2026-08-10',
  local: 'GELP',
  visitante: 'Rival FC',
  estado: 'PROGRAMADO' as ProximoPartido['estado'],
};

const roster: DeportistaConvocable[] = [
  { id: 'dep-1', nombre: 'Juan', apellido: 'Alvarez', posicion: 'Arquero' },
  { id: 'dep-2', nombre: 'Marta', apellido: 'Benitez', posicion: null },
  { id: 'dep-3', nombre: 'Luis', apellido: 'Castro', posicion: 'Central' },
];

function renderForm(overrides: Partial<React.ComponentProps<typeof ConvocatoriaForm>> = {}) {
  return render(<ConvocatoriaForm mode="create" disciplinas={disciplinas} {...overrides} />);
}

async function selectDisciplinaYCategoria(user: ReturnType<typeof userEvent.setup>) {
  await user.selectOptions(screen.getByLabelText('Seleccionar disciplina...'), 'disc-1');
  await user.selectOptions(screen.getByLabelText('Seleccionar categoría...'), 'cat-1');
}

beforeEach(() => {
  vi.clearAllMocks();
  getProximoPartidoActionMock.mockResolvedValue(partido);
  getDeportistasParaConvocarActionMock.mockResolvedValue(roster);
  createConvocatoriaMock.mockResolvedValue({ success: true, id: 'conv-1' });
  updateConvocatoriaMock.mockResolvedValue({ success: true });
});

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('ConvocatoriaForm — próximo partido y carga de plantel', () => {
  test('al elegir disciplina + categoría con partido, muestra el card del partido y carga el plantel', async () => {
    const user = userEvent.setup();
    renderForm();

    await selectDisciplinaYCategoria(user);

    // Buscó el próximo partido con los ids elegidos
    await waitFor(() =>
      expect(getProximoPartidoActionMock).toHaveBeenCalledWith('disc-1', 'cat-1'),
    );

    // Card del partido visible
    expect(await screen.findByText('GELP vs Rival FC')).toBeInTheDocument();
    expect(screen.getByText('Próximo partido')).toBeInTheDocument();

    // Cargó el plantel con checkboxes
    await waitFor(() =>
      expect(getDeportistasParaConvocarActionMock).toHaveBeenCalledWith('disc-1', 'cat-1'),
    );
    expect(await screen.findByText('Alvarez, Juan')).toBeInTheDocument();
    expect(screen.getByText('Benitez, Marta')).toBeInTheDocument();
    expect(screen.getByText('Castro, Luis')).toBeInTheDocument();
    expect(screen.getAllByRole('checkbox')).toHaveLength(3);
  });

  test('sin partido (action devuelve null): muestra el banner de aviso y Guardar queda deshabilitado', async () => {
    const user = userEvent.setup();
    getProximoPartidoActionMock.mockResolvedValue(null);
    renderForm();

    await selectDisciplinaYCategoria(user);

    expect(
      await screen.findByText('No hay próximo partido programado para esta categoría.'),
    ).toBeInTheDocument();

    // No se cargó plantel
    expect(getDeportistasParaConvocarActionMock).not.toHaveBeenCalled();

    // Guardar deshabilitado
    expect(screen.getByRole('button', { name: /guardar convocatoria/i })).toBeDisabled();
  });

  test('togglear checkboxes actualiza el contador "Convocados X / N"', async () => {
    const user = userEvent.setup();
    renderForm();
    await selectDisciplinaYCategoria(user);
    await screen.findByText('Alvarez, Juan');

    // Arranca en 0 / 3
    expect(screen.getByText('Convocados: 0 / 3')).toBeInTheDocument();

    const filaJuan = screen.getByText('Alvarez, Juan').closest('li')!;
    await user.click(within(filaJuan).getByRole('checkbox'));
    expect(screen.getByText('Convocados: 1 / 3')).toBeInTheDocument();

    const filaMarta = screen.getByText('Benitez, Marta').closest('li')!;
    await user.click(within(filaMarta).getByRole('checkbox'));
    expect(screen.getByText('Convocados: 2 / 3')).toBeInTheDocument();

    // Destildar Juan vuelve a 1 / 3
    await user.click(within(filaJuan).getByRole('checkbox'));
    expect(screen.getByText('Convocados: 1 / 3')).toBeInTheDocument();
  });

  test('"Seleccionar todos" convoca a todo el plantel', async () => {
    const user = userEvent.setup();
    renderForm();
    await selectDisciplinaYCategoria(user);
    await screen.findByText('Alvarez, Juan');

    await user.click(screen.getByRole('button', { name: /seleccionar todos/i }));
    expect(screen.getByText('Convocados: 3 / 3')).toBeInTheDocument();
  });
});

describe('ConvocatoriaForm — submit', () => {
  test('happy path: con partido y algunos citados, al Guardar llama createConvocatoria con el payload correcto', async () => {
    const user = userEvent.setup();
    renderForm();

    await selectDisciplinaYCategoria(user);
    await screen.findByText('Alvarez, Juan');

    // Citar a Juan y Luis (no Marta)
    const filaJuan = screen.getByText('Alvarez, Juan').closest('li')!;
    const filaLuis = screen.getByText('Castro, Luis').closest('li')!;
    await user.click(within(filaJuan).getByRole('checkbox'));
    await user.click(within(filaLuis).getByRole('checkbox'));

    await user.click(screen.getByRole('button', { name: /guardar convocatoria/i }));

    await waitFor(() => expect(createConvocatoriaMock).toHaveBeenCalledTimes(1));
    const payload = createConvocatoriaMock.mock.calls[0][0];
    expect(payload.eventoTorneoId).toBe('evento-1');
    expect(payload.disciplinaId).toBe('disc-1');
    expect(payload.categoriaId).toBe('cat-1');
    expect(payload.convocados).toEqual(['dep-1', 'dep-3']);

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/convocatorias'));
  });

  test('muestra el error del servidor si la action falla', async () => {
    const user = userEvent.setup();
    createConvocatoriaMock.mockResolvedValue({ success: false, error: 'Boom del server' });
    renderForm();

    await selectDisciplinaYCategoria(user);
    await screen.findByText('Alvarez, Juan');

    const filaJuan = screen.getByText('Alvarez, Juan').closest('li')!;
    await user.click(within(filaJuan).getByRole('checkbox'));

    await user.click(screen.getByRole('button', { name: /guardar convocatoria/i }));

    expect(await screen.findByText('Boom del server')).toBeInTheDocument();
    expect(pushMock).not.toHaveBeenCalled();
  });
});
