import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { ResumenSeguimientos } from '@/lib/queries/dashboard';

const { getResumenSeguimientos } = vi.hoisted(() => ({ getResumenSeguimientos: vi.fn() }));
vi.mock('@/lib/queries/dashboard', () => ({ getResumenSeguimientos }));

import SeccionSeguimientos from '../_components/SeccionSeguimientos';

const HOY = new Date('2026-09-30T00:00:00.000Z');

function conDatos(over: Partial<ResumenSeguimientos> = {}): ResumenSeguimientos {
  return {
    porPrioridad: { BAJA: 5, MEDIA: 10, ALTA: 3, URGENTE: 2 },
    total: 20,
    alta: 3,
    urgente: 2,
    proximasCitas: [
      {
        id: 's1',
        titulo: 'Control nutricional',
        proximaCita: new Date('2026-09-25T00:00:00.000Z'),
        deportistas: [{ id: 'd1', nombre: 'Ana', apellido: 'Torres' }],
      },
      {
        id: 's2',
        titulo: 'Entrevista familiar',
        proximaCita: new Date('2026-10-02T00:00:00.000Z'),
        deportistas: [
          { id: 'd2', nombre: 'Juan', apellido: 'Pérez' },
          { id: 'd3', nombre: 'Luis', apellido: 'Gómez' },
        ],
      },
    ],
    ...over,
  };
}

const VACIO: ResumenSeguimientos = {
  porPrioridad: { BAJA: 0, MEDIA: 0, ALTA: 0, URGENTE: 0 },
  total: 0,
  alta: 0,
  urgente: 0,
  proximasCitas: [],
};

beforeEach(() => {
  vi.clearAllMocks();
  getResumenSeguimientos.mockResolvedValue(conDatos());
});

describe('SeccionSeguimientos — urgentes', () => {
  test('con urgentes: card rosa, badge URGENTE y link con su aria-label', async () => {
    render(await SeccionSeguimientos({ hoyDb: HOY }));

    expect(screen.getByText('URGENTE')).toBeInTheDocument();
    const card = screen.getByText('Seguimientos urgentes').closest('div.rounded-2xl')!;
    expect(card.className).toContain('bg-rose-50');
    expect(screen.getByText('Backlog abierto, no solo de esta semana.')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Ver los seguimientos con prioridad Urgente' }),
    ).toHaveAttribute('href', '/seguimientos?prioridad=URGENTE');
  });

  test('sin urgentes: sin badge y card blanca violeta', async () => {
    getResumenSeguimientos.mockResolvedValue(
      conDatos({ porPrioridad: { BAJA: 5, MEDIA: 10, ALTA: 3, URGENTE: 0 }, total: 18, urgente: 0 }),
    );
    render(await SeccionSeguimientos({ hoyDb: HOY }));

    expect(screen.queryByText('URGENTE')).not.toBeInTheDocument();
    const card = screen.getByText('Seguimientos urgentes').closest('div.rounded-2xl')!;
    expect(card.className).toContain('bg-white');
    expect(card.className).toContain('border-t-violet-600');
  });
});

describe('SeccionSeguimientos — backlog por prioridad', () => {
  test('el denominador es el backlog abierto y la etiqueta nombra la mayor', async () => {
    render(await SeccionSeguimientos({ hoyDb: HOY }));

    expect(screen.getByText('Sobre 20 seguimientos del backlog abierto.')).toBeInTheDocument();
    expect(screen.getByText('50% media')).toBeInTheDocument();
    expect(screen.getByRole('img').getAttribute('aria-label')).toBe(
      'Urgente: 2, Alta: 3, Media: 10, Baja: 5',
    );
  });

  test.each([
    ['Urgente', 'URGENTE', 2],
    ['Alta', 'ALTA', 3],
    ['Media', 'MEDIA', 10],
    ['Baja', 'BAJA', 5],
  ])('la mini-card %s linkea a ?prioridad=%s', async (label, prioridad, n) => {
    render(await SeccionSeguimientos({ hoyDb: HOY }));

    expect(
      screen.getByRole('link', { name: `Ver los seguimientos con prioridad ${label} (${n})` }),
    ).toHaveAttribute('href', `/seguimientos?prioridad=${prioridad}`);
  });

  test('sin backlog: estado vacío, sin barra ni mini-cards', async () => {
    getResumenSeguimientos.mockResolvedValue(VACIO);
    render(await SeccionSeguimientos({ hoyDb: HOY }));

    expect(screen.getByText('No hay seguimientos abiertos')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /prioridad Alta/ })).not.toBeInTheDocument();
  });
});

describe('SeccionSeguimientos — próximas citas', () => {
  test('cada cita linkea a su seguimiento con su aria-label', async () => {
    render(await SeccionSeguimientos({ hoyDb: HOY }));

    expect(
      screen.getByRole('link', { name: 'Ver el seguimiento Control nutricional, cita del 25/09/2026, ya pasó' }),
    ).toHaveAttribute('href', '/seguimientos/s1');
    const futura = screen.getByRole('link', { name: 'Ver el seguimiento Entrevista familiar, cita del 02/10/2026' });
    expect(futura).toHaveAttribute('href', '/seguimientos/s2');
    expect(futura.textContent).toContain('Juan Pérez y 1 más');
    expect(futura.textContent).toContain('VIE');
    expect(futura.textContent).toContain('2/10');
  });

  // "ya pasó" y NO "perdida": la base no registra si la cita se cumplió.
  test('la cita vencida dice "ya pasó" y lleva la fecha en ámbar; la futura no', async () => {
    render(await SeccionSeguimientos({ hoyDb: HOY }));

    const vencida = screen.getByRole('link', { name: 'Ver el seguimiento Control nutricional, cita del 25/09/2026, ya pasó' });
    expect(vencida.textContent).toContain('ya pasó');
    expect(vencida.innerHTML).toContain('bg-amber-100');

    const futura = screen.getByRole('link', { name: 'Ver el seguimiento Entrevista familiar, cita del 02/10/2026' });
    expect(futura.textContent).not.toContain('ya pasó');
    expect(futura.innerHTML).toContain('bg-violet-600');
    expect(screen.queryByText(/perdida/i)).not.toBeInTheDocument();
  });

  // Regresión: el aria-label pisaba el texto visible y solo decía el título, así que
  // dos citas con el mismo título eran dos links idénticos y la fecha/"ya pasó" no se
  // anunciaban.
  test('dos citas con el mismo título tienen nombres accesibles distintos', async () => {
    getResumenSeguimientos.mockResolvedValue(
      conDatos({
        proximasCitas: [
          {
            id: 'a',
            titulo: 'Control',
            proximaCita: new Date('2026-09-25T00:00:00.000Z'),
            deportistas: [],
          },
          {
            id: 'b',
            titulo: 'Control',
            proximaCita: new Date('2026-10-03T00:00:00.000Z'),
            deportistas: [],
          },
        ],
      }),
    );
    render(await SeccionSeguimientos({ hoyDb: HOY }));

    expect(
      screen.getByRole('link', { name: 'Ver el seguimiento Control, cita del 25/09/2026, ya pasó' }),
    ).toHaveAttribute('href', '/seguimientos/a');
    expect(
      screen.getByRole('link', { name: 'Ver el seguimiento Control, cita del 03/10/2026' }),
    ).toHaveAttribute('href', '/seguimientos/b');
  });

  test('la cita de hoy no está vencida', async () => {
    getResumenSeguimientos.mockResolvedValue(
      conDatos({
        proximasCitas: [
          { id: 's9', titulo: 'Hoy', proximaCita: HOY, deportistas: [] },
        ],
      }),
    );
    render(await SeccionSeguimientos({ hoyDb: HOY }));

    expect(screen.queryByText('ya pasó')).not.toBeInTheDocument();
  });

  test('todo vacío: estados vacíos y sin NaN/undefined', async () => {
    getResumenSeguimientos.mockResolvedValue(VACIO);
    const { container } = render(await SeccionSeguimientos({ hoyDb: HOY }));

    expect(screen.getByText('No hay citas próximas ni vencidas')).toBeInTheDocument();
    expect(screen.getByText('0')).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/NaN|undefined|Infinity/);
  });
});
