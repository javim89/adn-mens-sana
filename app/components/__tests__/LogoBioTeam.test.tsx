import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import LogoBioTeam from '../LogoBioTeam';

function logo(container: HTMLElement) {
  const img = container.querySelector('img');
  expect(img).not.toBeNull();
  return img as HTMLImageElement;
}

describe('LogoBioTeam', () => {
  it('por defecto usa la variante normal (b azul marino, para fondos claros)', () => {
    const { container } = render(<LogoBioTeam />);
    const img = logo(container);
    expect(img.getAttribute('src')).toContain('/brand/bioteam-logo.svg');
    expect(img).toHaveAttribute('data-logo-bioteam', 'normal');
  });

  it('la variante inversa usa la b blanca (para fondos azul marino)', () => {
    const { container } = render(<LogoBioTeam variante="inverso" />);
    const img = logo(container);
    expect(img.getAttribute('src')).toContain('/brand/bioteam-logo-inverso.svg');
    expect(img).toHaveAttribute('data-logo-bioteam', 'inverso');
  });

  it('es decorativo: alt vacío y fuera del árbol de accesibilidad (el nombre lo da el wordmark)', () => {
    const { container } = render(<LogoBioTeam />);
    const img = logo(container);
    expect(img).toHaveAttribute('alt', '');
    expect(img).toHaveAttribute('aria-hidden', 'true');
  });

  it('nunca usa el escudo del club cliente', () => {
    const { container } = render(<LogoBioTeam variante="inverso" />);
    expect(logo(container).getAttribute('src')).not.toContain('logo.png');
  });

  it('respeta la proporción del ícono (no es cuadrado) y el alto pasado por className', () => {
    const { container } = render(<LogoBioTeam className="h-12" />);
    const img = logo(container);
    expect(img).toHaveAttribute('width', '85');
    expect(img).toHaveAttribute('height', '111');
    expect(img.className).toContain('h-12');
    expect(img.className).toContain('w-auto');
  });
});
