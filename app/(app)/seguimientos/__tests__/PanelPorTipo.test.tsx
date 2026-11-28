import { describe, test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import PanelPorTipo from '../_components/PanelPorTipo';

describe('PanelPorTipo', () => {
  test('cada fila tiene el punto de color del tipo, el número y una barra relativa al mayor', () => {
    render(
      <PanelPorTipo
        total={15}
        filas={[
          { tipo: 'GENERICO', cantidad: 5, href: '/seguimientos?tipo=GENERICO', activo: false },
          { tipo: 'TRAUMATOLOGIA', cantidad: 10, href: '/seguimientos?tipo=TRAUMATOLOGIA', activo: false },
        ]}
      />,
    );
    const generico = screen.getByRole('link', { name: 'Ver 5 de Genérico' });
    expect(generico).toHaveAttribute('href', '/seguimientos?tipo=GENERICO');
    expect(generico.querySelector('span.bg-blue-500')).not.toBeNull();
    const barra = generico.querySelector('[aria-hidden] > span') as HTMLElement;
    expect(barra.style.width).toBe('50%');
  });

  test('sin seguimientos muestra un estado vacío', () => {
    render(<PanelPorTipo total={0} filas={[]} />);
    expect(screen.getByText('No hay seguimientos con estos filtros.')).toBeInTheDocument();
  });
});
