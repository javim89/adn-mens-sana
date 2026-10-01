import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { TurnoProximo } from '@/lib/queries/dashboard';
import { SEMANA } from './_semana';

const { getResumenTurnos } = vi.hoisted(() => ({ getResumenTurnos: vi.fn() }));
vi.mock('@/lib/queries/dashboard', () => ({ getResumenTurnos }));

import SeccionTurnos from '../_components/SeccionTurnos';

const HOY = new Date('2026-09-30T00:00:00.000Z');

function turno(i: number): TurnoProximo {
  return {
    id: `t${i}`,
    titulo: `Kinesiología ${i}`,
    fecha: new Date('2026-09-30T00:00:00.000Z'),
    hora: `1${i}:30`,
    lugar: 'Consultorio',
    deportistas: [{ id: `d${i}`, nombre: 'Ana', apellido: `Torres${i}` }],
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  getResumenTurnos.mockResolvedValue({
    totalSemana: 9,
    proximos: [turno(1), turno(2), turno(3), turno(4)],
  });
});

describe('SeccionTurnos', () => {
  test('pide 4 próximos, para la grilla 2x2', async () => {
    await SeccionTurnos({ semana: SEMANA, hoyDb: HOY });

    expect(getResumenTurnos).toHaveBeenCalledWith(expect.objectContaining({ limite: 4 }));
  });

  test('pasa el profesionalId cuando no es admin', async () => {
    await SeccionTurnos({ semana: SEMANA, hoyDb: HOY, profesionalId: 'user_1' });

    expect(getResumenTurnos).toHaveBeenCalledWith(
      expect.objectContaining({ profesionalId: 'user_1' }),
    );
  });

  test('con datos: total, alcance y un tile por turno con fecha y hora', async () => {
    render(await SeccionTurnos({ semana: SEMANA, hoyDb: HOY }));

    expect(screen.getByText('9')).toBeInTheDocument();
    expect(screen.getByText(/Todos los profesionales\./)).toBeInTheDocument();
    expect(screen.getAllByText('MIÉ 30/9')).toHaveLength(4);
    expect(screen.getByText('11:30')).toBeInTheDocument();
    expect(screen.getByText('Kinesiología 1')).toBeInTheDocument();
    expect(screen.getByText('Ana Torres1 · Consultorio')).toBeInTheDocument();
  });

  // `/turnos/[id]` no existe: los tiles no linkean, solo los dos "ver todos".
  test('los tiles no son links; solo los dos que van a /turnos', async () => {
    render(await SeccionTurnos({ semana: SEMANA, hoyDb: HOY }));

    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(2);
    for (const l of links) expect(l).toHaveAttribute('href', '/turnos');
    expect(
      screen.getByRole('link', { name: 'Ver el listado completo de turnos' }),
    ).toBeInTheDocument();
  });

  test('sin próximos: estado vacío según el alcance', async () => {
    getResumenTurnos.mockResolvedValue({ totalSemana: 0, proximos: [] });
    const { container } = render(
      await SeccionTurnos({ semana: SEMANA, hoyDb: HOY, profesionalId: 'user_1' }),
    );

    expect(screen.getByText('No hay turnos próximos')).toBeInTheDocument();
    expect(
      screen.getByText('No tenés turnos agendados de hoy en adelante.'),
    ).toBeInTheDocument();
    expect(screen.getByText(/Solo tus turnos\./)).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/NaN|undefined/);
  });
});
