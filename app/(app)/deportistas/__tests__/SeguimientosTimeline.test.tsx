import { describe, test, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SeguimientosTimeline, {
  type SeguimientoTimelineItem,
} from '../_components/SeguimientosTimeline';

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode; [key: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

const makeSeguimiento = (
  overrides: Partial<SeguimientoTimelineItem> = {},
): SeguimientoTimelineItem => ({
  id: 'seg-1',
  fecha: '2026-07-01',
  titulo: 'Control',
  descripcion: null,
  prioridad: 'MEDIA',
  proximaCita: null,
  tipoSeguimiento: null,
  ...overrides,
});

/** Abre un CustomSelect por su id y hace click en la opción con el label dado. */
async function selectOption(user: ReturnType<typeof userEvent.setup>, id: string, optionLabel: string) {
  const trigger = document.getElementById(id) as HTMLButtonElement;
  await user.click(trigger);
  // El popup abierto es hermano dentro del mismo contenedor relativo.
  const container = trigger.parentElement as HTMLElement;
  const option = within(container).getByRole('button', { name: optionLabel });
  await user.click(option);
}

describe('SeguimientosTimeline', () => {
  test('muestra el estado vacío cuando no hay seguimientos', () => {
    render(<SeguimientosTimeline seguimientos={[]} />);
    expect(screen.getByText(/no tiene seguimientos registrados/i)).toBeDefined();
  });

  test('renderiza los items con el label de tipo correcto', () => {
    render(
      <SeguimientosTimeline
        seguimientos={[
          makeSeguimiento({ id: 'a', titulo: 'Rodilla', tipoSeguimiento: 'TRAUMATOLOGIA' }),
          makeSeguimiento({ id: 'b', titulo: 'Mente', tipoSeguimiento: 'EVALUACION_PSICOLOGICA' }),
        ]}
      />,
    );

    expect(screen.getByText('Rodilla')).toBeDefined();
    expect(screen.getByText('Traumatología')).toBeDefined();
    expect(screen.getByText('Evaluación Psicológica')).toBeDefined();
  });

  test('aplica el color de tipo (dot) correcto por item', () => {
    const { container } = render(
      <SeguimientosTimeline
        seguimientos={[makeSeguimiento({ tipoSeguimiento: 'EVALUACION_CARDIOLOGICA' })]}
      />,
    );
    // El dot rojo debe estar presente
    expect(container.querySelector('.bg-red-500')).not.toBeNull();
  });

  test('un tipo null se trata como Genérico (azul)', () => {
    const { container } = render(
      <SeguimientosTimeline seguimientos={[makeSeguimiento({ tipoSeguimiento: null })]} />,
    );
    expect(screen.getByText('Genérico')).toBeDefined();
    expect(container.querySelector('.bg-blue-500')).not.toBeNull();
  });

  test('cada item enlaza al detalle del seguimiento', () => {
    render(<SeguimientosTimeline seguimientos={[makeSeguimiento({ id: 'seg-42' })]} />);
    const link = screen.getByRole('link');
    expect((link as HTMLAnchorElement).href).toContain('/seguimientos/seg-42');
  });

  test('ordena los items por fecha descendente', () => {
    render(
      <SeguimientosTimeline
        seguimientos={[
          makeSeguimiento({ id: 'old', titulo: 'Viejo', fecha: '2026-01-01' }),
          makeSeguimiento({ id: 'new', titulo: 'Nuevo', fecha: '2026-08-01' }),
        ]}
      />,
    );
    const titles = screen.getAllByText(/Viejo|Nuevo/).map((el) => el.textContent);
    expect(titles[0]).toBe('Nuevo');
    expect(titles[1]).toBe('Viejo');
  });

  describe('filtros', () => {
    const seguimientos = [
      makeSeguimiento({
        id: 'trauma-alta',
        titulo: 'Rodilla',
        tipoSeguimiento: 'TRAUMATOLOGIA',
        prioridad: 'ALTA',
      }),
      makeSeguimiento({
        id: 'psico-baja',
        titulo: 'Mente',
        tipoSeguimiento: 'EVALUACION_PSICOLOGICA',
        prioridad: 'BAJA',
      }),
      makeSeguimiento({
        id: 'generico-alta',
        titulo: 'General',
        tipoSeguimiento: null,
        prioridad: 'ALTA',
      }),
    ];

    test('filtra por tipo de seguimiento', async () => {
      const user = userEvent.setup();
      render(<SeguimientosTimeline seguimientos={seguimientos} />);

      // Todos visibles inicialmente
      expect(screen.getByText('Rodilla')).toBeDefined();
      expect(screen.getByText('Mente')).toBeDefined();
      expect(screen.getByText('General')).toBeDefined();

      await selectOption(user, 'filtro-tipo-seguimiento', 'Traumatología');

      expect(screen.getByText('Rodilla')).toBeDefined();
      expect(screen.queryByText('Mente')).toBeNull();
      expect(screen.queryByText('General')).toBeNull();
    });

    test('filtra por prioridad', async () => {
      const user = userEvent.setup();
      render(<SeguimientosTimeline seguimientos={seguimientos} />);

      await selectOption(user, 'filtro-prioridad-seguimiento', 'Alta');

      expect(screen.getByText('Rodilla')).toBeDefined();
      expect(screen.getByText('General')).toBeDefined();
      expect(screen.queryByText('Mente')).toBeNull();
    });

    test('combina tipo y prioridad (AND)', async () => {
      const user = userEvent.setup();
      render(<SeguimientosTimeline seguimientos={seguimientos} />);

      await selectOption(user, 'filtro-tipo-seguimiento', 'Traumatología');
      await selectOption(user, 'filtro-prioridad-seguimiento', 'Alta');

      // Solo el que es Traumatología Y Alta
      expect(screen.getByText('Rodilla')).toBeDefined();
      expect(screen.queryByText('Mente')).toBeNull();
      expect(screen.queryByText('General')).toBeNull();
    });

    test('el filtro de tipo Genérico incluye los seguimientos con tipo null', async () => {
      const user = userEvent.setup();
      render(<SeguimientosTimeline seguimientos={seguimientos} />);

      await selectOption(user, 'filtro-tipo-seguimiento', 'Genérico');

      expect(screen.getByText('General')).toBeDefined();
      expect(screen.queryByText('Rodilla')).toBeNull();
      expect(screen.queryByText('Mente')).toBeNull();
    });

    test('muestra el empty state cuando ningún seguimiento coincide', async () => {
      const user = userEvent.setup();
      render(<SeguimientosTimeline seguimientos={seguimientos} />);

      // Traumatología + Baja => no hay coincidencias
      await selectOption(user, 'filtro-tipo-seguimiento', 'Traumatología');
      await selectOption(user, 'filtro-prioridad-seguimiento', 'Baja');

      expect(screen.getByText(/no hay seguimientos que coincidan con los filtros/i)).toBeDefined();
      expect(screen.queryByText('Rodilla')).toBeNull();
    });

    test('el botón limpiar filtros restablece la lista completa', async () => {
      const user = userEvent.setup();
      render(<SeguimientosTimeline seguimientos={seguimientos} />);

      await selectOption(user, 'filtro-tipo-seguimiento', 'Traumatología');
      await selectOption(user, 'filtro-prioridad-seguimiento', 'Baja');
      expect(screen.getByText(/no hay seguimientos que coincidan/i)).toBeDefined();

      await user.click(screen.getByRole('button', { name: /limpiar filtros/i }));

      expect(screen.getByText('Rodilla')).toBeDefined();
      expect(screen.getByText('Mente')).toBeDefined();
      expect(screen.getByText('General')).toBeDefined();
    });
  });
});
