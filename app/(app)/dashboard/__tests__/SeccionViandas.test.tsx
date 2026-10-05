import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { ResumenViandas } from '@/lib/queries/dashboard';
import { SEMANA } from './_semana';

const { getResumenViandas } = vi.hoisted(() => ({ getResumenViandas: vi.fn() }));
vi.mock('@/lib/queries/dashboard', () => ({ getResumenViandas }));

import SeccionViandas from '../_components/SeccionViandas';

function resumen(over: Partial<ResumenViandas> = {}): ResumenViandas {
  return {
    porComida: {
      DESAYUNO: { entregas: 10, fueraDeFicha: 0 },
      ALMUERZO: { entregas: 40, fueraDeFicha: 2 },
      MERIENDA: { entregas: 12, fueraDeFicha: 0 },
      CENA: { entregas: 20, fueraDeFicha: 1 },
    },
    totalEntregas: 82,
    totalFueraDeFicha: 3,
    ...over,
  };
}

const VACIO = resumen({
  porComida: {
    DESAYUNO: { entregas: 0, fueraDeFicha: 0 },
    ALMUERZO: { entregas: 0, fueraDeFicha: 0 },
    MERIENDA: { entregas: 0, fueraDeFicha: 0 },
    CENA: { entregas: 0, fueraDeFicha: 0 },
  },
  totalEntregas: 0,
  totalFueraDeFicha: 0,
});

beforeEach(() => {
  vi.clearAllMocks();
  getResumenViandas.mockResolvedValue(resumen());
});

describe('SeccionViandas', () => {
  test('con datos: total, alcance y barras por comida', async () => {
    render(await SeccionViandas({ semana: SEMANA, isAdmin: true, lugar: null }));

    expect(screen.getByText('82')).toBeInTheDocument();
    expect(screen.getByText('Todos los lugares de retiro.')).toBeInTheDocument();
    const barras = screen.getByRole('img');
    expect(barras.getAttribute('aria-label')).toBe(
      'Desayuno: 10, Almuerzo: 40, Merienda: 12, Cena: 20',
    );
  });

  test('con entregas fuera de ficha: card ámbar con badge REVISAR', async () => {
    render(await SeccionViandas({ semana: SEMANA, isAdmin: true, lugar: null }));

    expect(screen.getByText('REVISAR')).toBeInTheDocument();
    const card = screen.getByText('Entregas fuera de ficha').closest('div.rounded-2xl')!;
    expect(card.className).toContain('bg-amber-50');
  });

  test('sin entregas fuera de ficha: sin badge y card blanca con borde ámbar', async () => {
    getResumenViandas.mockResolvedValue(resumen({ totalFueraDeFicha: 0 }));
    render(await SeccionViandas({ semana: SEMANA, isAdmin: true, lugar: null }));

    expect(screen.queryByText('REVISAR')).not.toBeInTheDocument();
    const card = screen.getByText('Entregas fuera de ficha').closest('div.rounded-2xl')!;
    expect(card.className).toContain('bg-white');
    expect(card.className).toContain('border-t-amber-400');
  });

  test('el copy de "fuera de ficha" aclara que no son errores', async () => {
    render(await SeccionViandas({ semana: SEMANA, isAdmin: true, lugar: null }));

    expect(screen.getByText(/No son errores/)).toBeInTheDocument();
  });

  test('el copy de "fuera de ficha" incluye las meriendas a categorías sin merienda', async () => {
    render(await SeccionViandas({ semana: SEMANA, isAdmin: true, lugar: null }));

    expect(
      screen.getByText(/meriendas a categorías que solo reciben desayuno/),
    ).toBeInTheDocument();
  });

  test('links con su aria-label', async () => {
    render(await SeccionViandas({ semana: SEMANA, isAdmin: true, lugar: null }));

    expect(screen.getByRole('link', { name: 'Ir al módulo de viandas' })).toHaveAttribute(
      'href',
      '/viandas',
    );
    expect(
      screen.getByRole('link', { name: 'Ir al módulo de viandas para revisar las entregas' }),
    ).toHaveAttribute('href', '/viandas');
  });

  test('sin entregas: sin barras, el detalle lo dice, nada de NaN', async () => {
    getResumenViandas.mockResolvedValue(VACIO);
    const { container } = render(
      await SeccionViandas({ semana: SEMANA, isAdmin: true, lugar: null }),
    );

    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByText(/Sin entregas registradas del 28 de septiembre/)).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/NaN|undefined/);
  });

  test('el responsable ve solo su lugar', async () => {
    render(await SeccionViandas({ semana: SEMANA, isAdmin: false, lugar: 'SEDE' }));

    expect(getResumenViandas).toHaveBeenCalledWith(expect.objectContaining({ lugar: 'SEDE' }));
    expect(screen.getByText(/^Solo /)).toBeInTheDocument();
  });

  test('responsable sin lugar: estado vacío y sin query', async () => {
    render(await SeccionViandas({ semana: SEMANA, isAdmin: false, lugar: null }));

    expect(screen.getByText('No tenés un lugar de retiro asignado')).toBeInTheDocument();
    expect(getResumenViandas).not.toHaveBeenCalled();
  });
});
