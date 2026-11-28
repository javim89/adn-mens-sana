import { describe, test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ViandasSemana from '../ViandasSemana';
import type { ResumenViandas } from '@/lib/queries/dashboard';

function resumen(over: Partial<ResumenViandas['porComida']> = {}, fuera = 0): ResumenViandas {
  const porComida = {
    DESAYUNO: { entregas: 10, fueraDeFicha: 0 },
    ALMUERZO: { entregas: 6, fueraDeFicha: 0 },
    MERIENDA: { entregas: 0, fueraDeFicha: 0 },
    CENA: { entregas: 4, fueraDeFicha: fuera },
    ...over,
  };
  const totalEntregas = Object.values(porComida).reduce((a, c) => a + c.entregas, 0);
  return { porComida, totalEntregas, totalFueraDeFicha: fuera };
}

const props = { desdeClave: '2026-11-23', hastaClave: '2026-11-29', alcance: 'Todos los lugares' };

describe('ViandasSemana', () => {
  test('título, semana, alcance y total', () => {
    render(<ViandasSemana resumen={resumen()} {...props} />);
    expect(screen.getByRole('heading', { name: 'Viandas entregadas' })).toBeInTheDocument();
    expect(screen.getByText('Semana del 23 al 29 de noviembre · Todos los lugares')).toBeInTheDocument();
    expect(screen.getByText('20')).toBeInTheDocument();
  });

  test('barras por comida, sin la merienda en cero', () => {
    render(<ViandasSemana resumen={resumen()} {...props} />);
    expect(
      screen.getByRole('img', { name: 'Desayuno: 10, Almuerzo: 6, Cena: 4' }),
    ).toBeInTheDocument();
  });

  test('con meriendas entregadas la barra aparece', () => {
    render(<ViandasSemana resumen={resumen({ MERIENDA: { entregas: 3, fueraDeFicha: 0 } })} {...props} />);
    expect(screen.getByRole('img', { name: /Merienda: 3/ })).toBeInTheDocument();
  });

  test('avisa las entregas fuera de ficha solo si las hay', () => {
    const { rerender } = render(<ViandasSemana resumen={resumen()} {...props} />);
    expect(screen.queryByText(/fuera de lo que prevé la ficha/)).not.toBeInTheDocument();
    rerender(<ViandasSemana resumen={resumen({}, 2)} {...props} />);
    expect(screen.getByText('2 fuera de lo que prevé la ficha.')).toBeInTheDocument();
  });
});
