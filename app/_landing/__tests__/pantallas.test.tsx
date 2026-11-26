import { render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { CLAVES_PANTALLA } from '@/app/_landing/funcionalidades/catalogo';
import { DESCRIPCION_PANTALLA, PANTALLAS } from '../pantallas';

afterEach(() => {
  document.body.innerHTML = '';
});

describe('pantallas de /funcionalidades', () => {
  it('hay una pantalla y una descripción por cada clave del catálogo, y nada más', () => {
    expect(Object.keys(PANTALLAS).sort()).toEqual([...CLAVES_PANTALLA].sort());
    expect(Object.keys(DESCRIPCION_PANTALLA).sort()).toEqual([...CLAVES_PANTALLA].sort());
  });

  it.each(CLAVES_PANTALLA)('%s tiene una descripción visible de una oración', (clave) => {
    const descripcion = DESCRIPCION_PANTALLA[clave].trim();
    expect(descripcion.length).toBeGreaterThan(20);
    expect(descripcion.endsWith('.')).toBe(true);
  });

  it.each(CLAVES_PANTALLA)('%s renderiza una ventana decorativa (aria-hidden + inert)', (clave) => {
    const { container } = render(<>{PANTALLAS[clave]()}</>);
    const raiz = container.firstElementChild as HTMLElement;

    expect(raiz).toHaveAttribute('data-pantalla', clave);
    expect(raiz).toHaveAttribute('aria-hidden', 'true');
    expect(raiz).toHaveAttribute('inert');
    expect(raiz.textContent?.trim().length).toBeGreaterThan(0);
  });

  it.each(CLAVES_PANTALLA)('%s no tiene h1/h2, links reales ni nombres de clubes clientes', (clave) => {
    const { container } = render(<>{PANTALLAS[clave]()}</>);

    expect(container.querySelectorAll('h1, h2')).toHaveLength(0);
    for (const a of container.querySelectorAll('a')) {
      expect(a.getAttribute('href')).toBe('#');
    }
    expect(container.textContent).not.toMatch(/gimnasia|esgrima|tripero/i);
  });
});
