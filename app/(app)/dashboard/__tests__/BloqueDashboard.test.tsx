import { describe, test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import BloqueDashboard from '../_components/BloqueDashboard';
import { ACENTOS } from '../_lib/acentos';

function renderBloque() {
  return render(
    <BloqueDashboard
      id="viandas"
      titulo="Viandas"
      descripcion="Entregas de comida registradas esta semana."
      modulo="viandas"
    >
      <p>contenido</p>
    </BloqueDashboard>,
  );
}

describe('BloqueDashboard', () => {
  test('es una región nombrada por su h2', () => {
    renderBloque();

    const region = screen.getByRole('region', { name: 'Viandas' });
    const titulo = screen.getByRole('heading', { level: 2, name: 'Viandas' });
    expect(region).toHaveAttribute('aria-labelledby', titulo.id);
    expect(titulo.id).toBe('bloque-viandas');
  });

  test('muestra la descripción y los hijos', () => {
    renderBloque();

    expect(screen.getByText('Entregas de comida registradas esta semana.')).toBeVisible();
    expect(screen.getByText('contenido')).toBeInTheDocument();
  });

  test('el cuadrado lleva el color del módulo y es decorativo', () => {
    renderBloque();

    const cuadrado = screen.getByTestId('bloque-cuadrado');
    expect(cuadrado.className).toContain(ACENTOS.viandas.cuadrado);
    expect(cuadrado).toHaveAttribute('aria-hidden');
  });

  test('el título va en mayúsculas espaciadas sobre la barra lavanda', () => {
    renderBloque();

    const titulo = screen.getByRole('heading', { level: 2 });
    expect(titulo.className).toContain('uppercase');
    expect(titulo.className).toContain('tracking-[0.14em]');
    expect(titulo.parentElement!.className).toContain('bg-[#DFE3EF]');
  });

  /**
   * Regresión del scroll trabado: con `h-full` medido contra el alto de la sección,
   * las cards de las grillas de dos columnas se pasaban por el alto del encabezado y
   * `<main>` quedaba como scroller anidado. jsdom no calcula layout, así que se
   * verifica la estructura que lo evita: sección en columna flex y los hijos dentro
   * de un wrapper `flex-1 min-h-0`, hermano del encabezado.
   */
  test('los hijos ocupan solo el alto que deja el encabezado', () => {
    renderBloque();

    const region = screen.getByRole('region', { name: 'Viandas' });
    expect(region.className.split(' ')).toEqual(expect.arrayContaining(['flex', 'flex-col']));

    const wrapper = screen.getByText('contenido').parentElement!;
    expect(wrapper.parentElement).toBe(region);
    expect(wrapper.className.split(' ')).toEqual(
      expect.arrayContaining(['flex-1', 'min-h-0']),
    );

    const encabezado = screen.getByRole('heading', { level: 2 }).parentElement!;
    expect(encabezado.nextElementSibling).toBe(wrapper);
  });
});
