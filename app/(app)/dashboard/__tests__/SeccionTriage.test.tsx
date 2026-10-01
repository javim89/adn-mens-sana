import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SEMANA } from './_semana';

const { getDistribucionTriage } = vi.hoisted(() => ({ getDistribucionTriage: vi.fn() }));
vi.mock('@/lib/queries/triage', () => ({ getDistribucionTriage }));

import SeccionTriage from '../_components/SeccionTriage';

beforeEach(() => {
  vi.clearAllMocks();
  getDistribucionTriage.mockResolvedValue({
    actual: { VERDE: 10, AMARILLO: 5, NARANJA: 5, ROJO: 80 },
    previo: { VERDE: 10, AMARILLO: 5, NARANJA: 5, ROJO: 40 },
    ultimoPrevio: new Date('2026-09-21T05:00:00.000Z'),
    totalConTriage: 100,
    sinCalcular: 0,
    totalActivos: 100,
  });
});

describe('SeccionTriage', () => {
  test('el hero es navy, con el número y el link con su aria-label', async () => {
    render(await SeccionTriage({ semana: SEMANA }));

    // El 80 aparece también en la mini-card de Rojo: el primero es el del hero.
    const numero = screen.getAllByText('80')[0];
    expect(numero.className).toContain('text-white');
    expect(numero.closest('div.rounded-2xl')!.className).toContain('bg-[#121A61]');
    expect(
      screen.getByRole('link', { name: 'Ver los deportistas activos en nivel Rojo' }),
    ).toBeInTheDocument();
  });

  test('la subida de rojos se pinta en rosa sobre el fondo oscuro', async () => {
    render(await SeccionTriage({ semana: SEMANA }));

    expect(screen.getByText(/\+40 \(\+100%\)/).className).toContain('text-rose-300');
  });

  test('la distribución dice el % del nivel mayor', async () => {
    render(await SeccionTriage({ semana: SEMANA }));

    expect(screen.getByText('80% en rojo')).toBeInTheDocument();
  });
});
