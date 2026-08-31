import { describe, test, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TrayectoriaTimeline from '../TrayectoriaTimeline';
import type { PeriodoDivision, TrayectoriaEvento } from '@/lib/types/trayectoria';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));

vi.mock('@/lib/actions/trayectoria', () => ({
  crearTransicionDivision: vi.fn(),
  updatePasoPorDivision: vi.fn(),
  deletePasoPorDivision: vi.fn(),
}));

const periodos: PeriodoDivision[] = [
  {
    id: 'p-vieja',
    categoriaId: 'c1',
    categoriaNombre: '5ta',
    disciplinaId: 'd1',
    disciplinaNombre: 'Hockey',
    desde: '2023-01-01',
    hasta: '2024-01-01',
  },
  {
    id: 'p-actual',
    categoriaId: 'c2',
    categoriaNombre: '4ta',
    disciplinaId: 'd1',
    disciplinaNombre: 'Hockey',
    desde: '2024-01-01',
    hasta: null,
  },
];

const eventos: TrayectoriaEvento[] = [
  {
    id: 'e-vieja',
    tipo: 'SEGUIMIENTO',
    fecha: '2023-06-15',
    titulo: 'Seguimiento en 5ta',
    detalle: null,
    href: '/seguimientos/e-vieja',
    meta: { tipoSeguimiento: 'GENERICO', prioridad: 'BAJA' },
  },
  {
    id: 'e-actual-1',
    tipo: 'CONVOCATORIA',
    fecha: '2024-03-10',
    titulo: 'Convocatoria en 4ta',
    detalle: null,
    href: '/convocatorias/e-actual-1',
  },
  {
    id: 'e-actual-2',
    tipo: 'TURNO',
    fecha: '2024-09-20',
    titulo: 'Turno en 4ta',
    detalle: null,
    href: null,
  },
];

const disciplinas = [{ id: 'd1', nombre: 'Hockey' }];
const categorias = [
  { id: 'c1', nombre: '5ta' },
  { id: 'c2', nombre: '4ta' },
];

function renderTimeline(props?: Partial<React.ComponentProps<typeof TrayectoriaTimeline>>) {
  return render(
    <TrayectoriaTimeline
      deportistaId="dep-1"
      periodos={periodos}
      eventos={eventos}
      disciplinas={disciplinas}
      categorias={categorias}
      {...props}
    />,
  );
}

describe('TrayectoriaTimeline', () => {
  test('agrupa cada evento en el período correcto según su fecha', () => {
    renderTimeline();

    const bloqueActual = screen.getByRole('heading', { name: '4ta · Hockey' }).closest('section')!;
    const bloqueViejo = screen.getByRole('heading', { name: '5ta · Hockey' }).closest('section')!;

    expect(within(bloqueActual).getByText('Convocatoria en 4ta')).toBeInTheDocument();
    expect(within(bloqueActual).getByText('Turno en 4ta')).toBeInTheDocument();
    expect(within(bloqueActual).queryByText('Seguimiento en 5ta')).toBeNull();

    expect(within(bloqueViejo).getByText('Seguimiento en 5ta')).toBeInTheDocument();
    expect(within(bloqueViejo).queryByText('Convocatoria en 4ta')).toBeNull();
  });

  test('ordena los eventos por fecha descendente dentro del bloque', () => {
    renderTimeline();

    const bloqueActual = screen.getByRole('heading', { name: '4ta · Hockey' }).closest('section')!;
    const titulos = within(bloqueActual)
      .getAllByText(/en 4ta/)
      .map((el) => el.textContent);

    // 2024-09-20 (Turno) antes que 2024-03-10 (Convocatoria)
    expect(titulos).toEqual(['Turno en 4ta', 'Convocatoria en 4ta']);
  });

  test('el filtro por tipo oculta los eventos de otros tipos', async () => {
    const user = userEvent.setup();
    renderTimeline();

    await user.click(screen.getByRole('button', { name: 'Todos los tipos' }));
    await user.click(screen.getByRole('button', { name: 'Turno' }));

    expect(screen.getByText('Turno en 4ta')).toBeInTheDocument();
    expect(screen.queryByText('Convocatoria en 4ta')).toBeNull();
    expect(screen.queryByText('Seguimiento en 5ta')).toBeNull();
  });

  test('muestra el estado vacío cuando no hay eventos', () => {
    renderTimeline({ eventos: [] });

    expect(
      screen.getByText('Este deportista no tiene eventos en su trayectoria.'),
    ).toBeInTheDocument();
  });
});
