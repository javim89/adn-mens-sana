import { describe, test, expect, vi, beforeEach } from 'vitest';
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
vi.mock('next/dynamic', () => ({
  default: () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const MockFullCalendar = (props: any) => {
      const events = props.events ?? [];
      const dayCellClassNames = props.dayCellClassNames;
      // Días especiales conocidos que queremos verificar coloreados.
      const probeDates = ['2026-03-07', '2026-07-18', '2026-10-17', '2026-11-21'];
      return (
        <div data-testid="fullcalendar-mock">
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
    estado: 'PROGRAMADO',
  },
  {
    id: 'ev-7',
    fecha: '2026-03-07',
    categoriaId: 'cat-7',
    categoriaNombre: '7ma',
    grupo: 'SEPTIMA_OCTAVA_NOVENA',
    local: 'GIMNASIA',
    visitante: 'GIMNASIA (LP)',
    estado: 'SUSPENDIDO',
  },
];

function renderView() {
  return render(<CalendarioView categorias={categorias} dias={dias} eventos={eventos} />);
}

describe('CalendarioView', () => {
  beforeEach(() => vi.clearAllMocks());

  test('renderiza el título del módulo y la leyenda de colores', () => {
    renderView();
    expect(screen.getByRole('heading', { name: 'Calendario' })).toBeInTheDocument();
    const leyenda = screen.getByLabelText('Referencia de colores');
    expect(within(leyenda).getByText('Torneo')).toBeInTheDocument();
    expect(within(leyenda).getByText('Receso')).toBeInTheDocument();
    expect(within(leyenda).getByText('Recupero')).toBeInTheDocument();
    expect(within(leyenda).getByText('Sin actividad')).toBeInTheDocument();
  });

  test('renderiza el mes con al menos un evento de GIMNASIA (LP)', () => {
    renderView();
    const events = screen.getByTestId('fc-events');
    expect(within(events).getByText('4ta · GIMNASIA (LP) vs GIMNASIA')).toBeInTheDocument();
    // 3 eventos sin filtro
    expect(within(events).getAllByTestId('fc-event')).toHaveLength(3);
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

  test('un evento SUSPENDIDO recibe la clase de estilo diferenciado', () => {
    renderView();
    const suspendido = screen
      .getAllByTestId('fc-event')
      .find((el) => el.textContent?.includes('7ma'));
    expect(suspendido?.getAttribute('data-classname')).toContain('cal-evento-suspendido');
  });

  test('filtrar por categoría 5ta muestra solo los eventos de esa categoría', async () => {
    const user = userEvent.setup();
    renderView();
    // abre el CustomSelect y elige "5ta"
    await user.click(screen.getByRole('button', { name: 'Categoría' }));
    await user.click(screen.getByRole('button', { name: '5ta' }));

    const events = screen.getByTestId('fc-events');
    const items = within(events).getAllByTestId('fc-event');
    expect(items).toHaveLength(1);
    expect(items[0]).toHaveTextContent('5ta · GIMNASIA (LP) vs GIMNASIA');
  });
});
