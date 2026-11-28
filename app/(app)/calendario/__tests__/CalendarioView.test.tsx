import { describe, test, expect, vi, beforeAll, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CalendarioView from '../_components/CalendarioView';
import type {
  CalendarioCategoria,
  CalendarioDia,
  CalendarioEvento,
} from '@/lib/queries/calendario';

/**
 * FullCalendar toca el DOM real y se carga vía next/dynamic(ssr:false), lo cual no
 * corre bien en jsdom. Lo mockeamos para exponer los props relevantes
 * (events, dayCellClassNames) de forma inspeccionable, y así testear la lógica de
 * mapeo/filtrado/coloreo que vive en CalendarioView.
 */
const { mockReplace } = vi.hoisted(() => ({ mockReplace: vi.fn() }));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace }),
  usePathname: () => '/calendario',
}));

beforeAll(() => {
  // cmdk y Radix (FiltroChip) usan APIs que jsdom no trae.
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
  Element.prototype.scrollIntoView ??= function () {};
  Element.prototype.hasPointerCapture ??= () => false;
});

vi.mock('next/dynamic', () => ({
  default: () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const MockFullCalendar = (props: any) => {
      const events = props.events ?? [];
      const dayCellClassNames = props.dayCellClassNames;
      // Días especiales conocidos que queremos verificar coloreados.
      const probeDates = ['2026-03-07', '2026-07-18', '2026-10-17', '2026-11-21'];
      return (
        <div data-testid="fullcalendar-mock" data-vista={props.vista} data-fecha={props.fecha}>
          <ul data-testid="fc-events">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {events.map((e: any) => (
              <li key={e.id} data-testid="fc-event" data-classname={e.className}>
                {e.title}
              </li>
            ))}
          </ul>
          <ul data-testid="fc-daycells">
            {probeDates.map((d) => {
              const [y, m, day] = d.split('-').map(Number);
              const classes = dayCellClassNames
                ? dayCellClassNames({ date: new Date(y, m - 1, day) })
                : [];
              return (
                <li key={d} data-testid={`daycell-${d}`} data-classes={(classes as string[]).join(' ')}>
                  {d}
                </li>
              );
            })}
          </ul>
        </div>
      );
    };
    return MockFullCalendar;
  },
}));

const categorias: CalendarioCategoria[] = [
  { id: 'cat-4', nombre: '4ta', grupo: 'CUARTA_QUINTA_SEXTA' },
  { id: 'cat-5', nombre: '5ta', grupo: 'CUARTA_QUINTA_SEXTA' },
  { id: 'cat-7', nombre: '7ma', grupo: 'SEPTIMA_OCTAVA_NOVENA' },
];

const dias: CalendarioDia[] = [
  { fecha: '2026-03-07', tipo: 'TORNEO', numeroFecha: 1 },
  { fecha: '2026-07-18', tipo: 'RECESO', numeroFecha: null },
  { fecha: '2026-10-17', tipo: 'SIN_ACTIVIDAD', numeroFecha: null },
  { fecha: '2026-11-21', tipo: 'RECUPERO', numeroFecha: null },
];

const eventos: CalendarioEvento[] = [
  {
    id: 'ev-4',
    fecha: '2026-03-07',
    categoriaId: 'cat-4',
    categoriaNombre: '4ta',
    grupo: 'CUARTA_QUINTA_SEXTA',
    local: 'GIMNASIA (LP)',
    visitante: 'GIMNASIA',
    rival: 'GIMNASIA',
    estado: 'PROGRAMADO',
  },
  {
    id: 'ev-5',
    fecha: '2026-03-07',
    categoriaId: 'cat-5',
    categoriaNombre: '5ta',
    grupo: 'CUARTA_QUINTA_SEXTA',
    local: 'GIMNASIA (LP)',
    visitante: 'GIMNASIA',
    rival: 'GIMNASIA',
    estado: 'PROGRAMADO',
  },
  {
    id: 'ev-7',
    fecha: '2026-03-07',
    categoriaId: 'cat-7',
    categoriaNombre: '7ma',
    grupo: 'SEPTIMA_OCTAVA_NOVENA',
    local: 'ESTUDIANTES',
    visitante: 'GIMNASIA (LP)',
    rival: 'ESTUDIANTES',
    estado: 'SUSPENDIDO',
  },
];

function renderView(props: { categoriaId?: string | null; hoy?: string } = {}) {
  return render(
    <CalendarioView
      categorias={categorias}
      dias={dias}
      eventos={eventos}
      hoy={props.hoy ?? '2026-03-15'}
      categoriaId={props.categoriaId}
      lateral={<p>Panel lateral</p>}
    />,
  );
}

describe('CalendarioView', () => {
  beforeEach(() => vi.clearAllMocks());

  test('encabezado "Temporada {año}" y leyenda de colores', () => {
    renderView();
    expect(screen.getByRole('heading', { level: 1, name: 'Temporada 2026' })).toBeInTheDocument();
    const leyenda = screen.getByLabelText('Referencia de colores');
    expect(within(leyenda).getByText('Torneo')).toBeInTheDocument();
    expect(within(leyenda).getByText('Receso')).toBeInTheDocument();
    expect(within(leyenda).getByText('Recupero')).toBeInTheDocument();
    expect(within(leyenda).getByText('Sin actividad')).toBeInTheDocument();
  });

  test('abre en el mes de hoy (sin fecha fija) y muestra la columna lateral', () => {
    renderView({ hoy: '2026-11-27' });
    expect(screen.getByText('Noviembre 2026')).toBeInTheDocument();
    const cal = screen.getByTestId('fullcalendar-mock');
    expect(cal).toHaveAttribute('data-vista', 'dayGridMonth');
    expect(cal).toHaveAttribute('data-fecha', '2026-11-01');
    expect(screen.getByRole('complementary', { name: 'Próximos partidos' })).toHaveTextContent(
      'Panel lateral',
    );
  });

  test('anterior/siguiente mueven el mes y cruzan de año', async () => {
    const user = userEvent.setup();
    renderView({ hoy: '2026-12-10' });
    await user.click(screen.getByRole('button', { name: 'Mes siguiente' }));
    expect(screen.getByText('Enero 2027')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Temporada 2027' })).toBeInTheDocument();
    expect(screen.getByTestId('fullcalendar-mock')).toHaveAttribute('data-fecha', '2027-01-01');
    await user.click(screen.getByRole('button', { name: 'Mes anterior' }));
    await user.click(screen.getByRole('button', { name: 'Mes anterior' }));
    expect(screen.getByText('Noviembre 2026')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Hoy' }));
    expect(screen.getByText('Diciembre 2026')).toBeInTheDocument();
  });

  test('el toggle Año cambia la vista y la navegación pasa a ser por año', async () => {
    const user = userEvent.setup();
    renderView();
    await user.click(screen.getByRole('button', { name: 'Año' }));
    expect(screen.getByRole('button', { name: 'Año' })).toHaveAttribute('aria-pressed', 'true');
    const cal = screen.getByTestId('fullcalendar-mock');
    expect(cal).toHaveAttribute('data-vista', 'multiMonthYear');
    expect(cal).toHaveAttribute('data-fecha', '2026-01-01');
    await user.click(screen.getByRole('button', { name: 'Año siguiente' }));
    expect(screen.getByTestId('fullcalendar-mock')).toHaveAttribute('data-fecha', '2027-01-01');
  });

  test('los chips de evento dicen "categoría · rival"', () => {
    renderView();
    const events = screen.getByTestId('fc-events');
    expect(within(events).getByText('4ta · GIMNASIA')).toBeInTheDocument();
    expect(within(events).getAllByTestId('fc-event')).toHaveLength(3);
  });

  test('sin equipo propio el chip muestra "local vs visitante"', () => {
    render(
      <CalendarioView
        categorias={categorias}
        dias={dias}
        eventos={[{ ...eventos[0], rival: null }]}
        hoy="2026-03-15"
      />,
    );
    expect(screen.getByText('4ta · GIMNASIA (LP) vs GIMNASIA')).toBeInTheDocument();
  });

  test('los días especiales reciben la clase de color correcta', () => {
    renderView();
    expect(screen.getByTestId('daycell-2026-03-07').getAttribute('data-classes')).toContain(
      'cal-dia-torneo',
    );
    expect(screen.getByTestId('daycell-2026-07-18').getAttribute('data-classes')).toContain(
      'cal-dia-receso',
    );
    expect(screen.getByTestId('daycell-2026-10-17').getAttribute('data-classes')).toContain(
      'cal-dia-sin-actividad',
    );
    expect(screen.getByTestId('daycell-2026-11-21').getAttribute('data-classes')).toContain(
      'cal-dia-recupero',
    );
  });

  test('un evento SUSPENDIDO recibe la clase de estilo diferenciado (tachado)', () => {
    renderView();
    const suspendido = screen
      .getAllByTestId('fc-event')
      .find((el) => el.textContent?.includes('7ma'));
    expect(suspendido?.getAttribute('data-classname')).toContain('cal-evento-suspendido');
  });

  test('el chip de categoría filtra los eventos y sincroniza la URL', async () => {
    const user = userEvent.setup();
    renderView();
    await user.click(screen.getByRole('button', { name: 'Categoría' }));
    await user.click(screen.getByRole('option', { name: '5ta' }));

    const items = within(screen.getByTestId('fc-events')).getAllByTestId('fc-event');
    expect(items).toHaveLength(1);
    expect(items[0]).toHaveTextContent('5ta · GIMNASIA');
    expect(mockReplace).toHaveBeenCalledWith('/calendario?categoria=cat-5', { scroll: false });
    expect(screen.getByRole('button', { name: 'Categoría: 5ta' })).toBeInTheDocument();
  });

  test('arranca con la categoría de la URL y "Todas las categorías" la limpia', async () => {
    const user = userEvent.setup();
    renderView({ categoriaId: 'cat-7' });
    expect(within(screen.getByTestId('fc-events')).getAllByTestId('fc-event')).toHaveLength(1);
    await user.click(screen.getByRole('button', { name: 'Categoría: 7ma' }));
    await user.click(screen.getByRole('option', { name: 'Todas las categorías' }));
    expect(within(screen.getByTestId('fc-events')).getAllByTestId('fc-event')).toHaveLength(3);
    expect(mockReplace).toHaveBeenCalledWith('/calendario', { scroll: false });
  });
});
