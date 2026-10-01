import { describe, test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import BarrasCategoria from '../_components/BarrasCategoria';

function barra(container: HTMLElement, clave: string) {
  return container.querySelector(`[data-barra="${clave}"]`) as HTMLElement;
}

describe('BarrasCategoria', () => {
  const categorias = [
    { clave: 'DESAYUNO', label: 'Desayuno', valor: 10 },
    { clave: 'ALMUERZO', label: 'Almuerzo', valor: 40 },
    { clave: 'CENA', label: 'Cena', valor: 20 },
  ];

  test('muestra el valor y el label de cada barra', () => {
    render(
      <BarrasCategoria categorias={categorias} barraFuerte="bg-fuerte" barraSuave="bg-suave" />,
    );

    for (const c of categorias) {
      expect(screen.getByText(String(c.valor))).toBeInTheDocument();
      expect(screen.getByText(c.label)).toBeInTheDocument();
    }
  });

  test('la máxima lleva la clase fuerte y el resto la suave', () => {
    const { container } = render(
      <BarrasCategoria categorias={categorias} barraFuerte="bg-fuerte" barraSuave="bg-suave" />,
    );

    expect(barra(container, 'ALMUERZO').className).toContain('bg-fuerte');
    expect(barra(container, 'DESAYUNO').className).toContain('bg-suave');
    expect(barra(container, 'CENA').className).toContain('bg-suave');
  });

  test('la altura es proporcional a la máxima', () => {
    const { container } = render(
      <BarrasCategoria categorias={categorias} barraFuerte="bg-fuerte" barraSuave="bg-suave" />,
    );

    expect(barra(container, 'ALMUERZO').style.height).toBe('100%');
    expect(barra(container, 'CENA').style.height).toBe('50%');
  });

  test('todo en cero: barras planas, sin NaN en los estilos ni barra fuerte', () => {
    const { container } = render(
      <BarrasCategoria
        categorias={categorias.map((c) => ({ ...c, valor: 0 }))}
        barraFuerte="bg-fuerte"
        barraSuave="bg-suave"
      />,
    );

    expect(container.innerHTML).not.toMatch(/NaN|Infinity/);
    for (const c of categorias) {
      expect(barra(container, c.clave).style.height).toBe('0%');
      expect(barra(container, c.clave).className).not.toContain('bg-fuerte');
    }
  });

  test('un valor null muestra "—" y una barra vacía', () => {
    const { container } = render(
      <BarrasCategoria
        categorias={[
          { clave: 'LUN', label: 'Lun', valor: 80 },
          { clave: 'MAR', label: 'Mar', valor: null },
        ]}
        barraFuerte="bg-fuerte"
        barraSuave="bg-suave"
        formatear={(v) => `${v}%`}
      />,
    );

    expect(screen.getByText('—')).toBeInTheDocument();
    expect(screen.getByText('80%')).toBeInTheDocument();
    expect(barra(container, 'MAR').style.height).toBe('0%');
  });

  test('el aria-label lista todos los pares', () => {
    render(
      <BarrasCategoria
        categorias={[
          { clave: 'LUN', label: 'Lun', valor: 80 },
          { clave: 'MAR', label: 'Mar', valor: null },
        ]}
        barraFuerte="bg-fuerte"
        barraSuave="bg-suave"
        formatear={(v) => `${v}%`}
      />,
    );

    expect(screen.getByRole('img')).toHaveAttribute('aria-label', 'Lun: 80%, Mar: sin dato');
  });
});
