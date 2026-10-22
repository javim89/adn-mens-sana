import { render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import EscenarioDemo from '../EscenarioDemo';

function lienzo() {
  return document.querySelector('[data-demo-lienzo]') as HTMLElement;
}

/** La ventana (`[data-demo]`) con un ancho interno fijo. */
function renderEnVentana(activo: boolean, ancho = 0) {
  const ventana = document.createElement('div');
  Object.defineProperty(ventana, 'clientWidth', { configurable: true, get: () => ancho });
  document.body.appendChild(ventana);
  return render(
    <EscenarioDemo activo={activo}>
      <p>demo</p>
    </EscenarioDemo>,
    { container: ventana },
  );
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('EscenarioDemo', () => {
  it('inactivo (mobile / modo lista) es passthrough: sin escala ni transform inline', () => {
    renderEnVentana(false, 656);
    expect(lienzo()).toHaveTextContent('demo');
    expect(lienzo()).not.toHaveAttribute('data-escala');
    expect(lienzo().style.getPropertyValue('--escala')).toBe('');
    expect(lienzo().style.transform).toBe('');
  });

  it('activo escala el lienzo al ancho de la ventana', () => {
    renderEnVentana(true, 832);
    expect(lienzo()).toHaveAttribute('data-escala', '0.65');
    expect(lienzo().style.getPropertyValue('--escala')).toBe('0.6500');
  });

  it('al pasar a inactivo saca la escala', () => {
    const { rerender } = renderEnVentana(true, 656);
    expect(lienzo()).toHaveAttribute('data-escala', '0.51');
    rerender(
      <EscenarioDemo activo={false}>
        <p>demo</p>
      </EscenarioDemo>,
    );
    expect(lienzo()).not.toHaveAttribute('data-escala');
    expect(lienzo().style.getPropertyValue('--escala')).toBe('');
  });
});
