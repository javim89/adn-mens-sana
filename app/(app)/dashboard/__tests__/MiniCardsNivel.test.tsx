import { describe, test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import MiniCardsNivel, { type ItemNivel } from '../_components/MiniCardsNivel';

const items: ItemNivel[] = [
  {
    clave: 'ROJO',
    label: 'Rojo',
    cantidad: 8,
    href: '/deportistas?rojo',
    ariaLabel: 'Ver rojo (8)',
    punto: 'bg-red-600',
    tinte: 'bg-red-50',
  },
  {
    clave: 'VERDE',
    label: 'Verde',
    cantidad: 0,
    href: '/deportistas?verde',
    ariaLabel: 'Ver verde (0)',
    punto: 'bg-green-500',
    tinte: 'bg-green-50',
  },
];

describe('MiniCardsNivel', () => {
  test('un link por item, con su href y aria-label', () => {
    render(<MiniCardsNivel items={items} total={8} />);

    expect(screen.getAllByRole('link')).toHaveLength(2);
    expect(screen.getByRole('link', { name: 'Ver rojo (8)' })).toHaveAttribute(
      'href',
      '/deportistas?rojo',
    );
    expect(screen.getByRole('link', { name: 'Ver verde (0)' })).toHaveAttribute(
      'href',
      '/deportistas?verde',
    );
  });

  test('muestra el número y el porcentaje', () => {
    render(<MiniCardsNivel items={items} total={8} />);

    expect(screen.getByText('8')).toBeInTheDocument();
    expect(screen.getByText('100%')).toBeInTheDocument();
    expect(screen.getByText('0%')).toBeInTheDocument();
  });

  test('el item en 0 se atenúa y pierde el tinte; el resto lo conserva', () => {
    render(<MiniCardsNivel items={items} total={8} />);

    const vacio = screen.getByRole('link', { name: 'Ver verde (0)' });
    expect(vacio.className).toContain('bg-gray-50');
    expect(vacio.className).not.toContain('bg-green-50');

    const lleno = screen.getByRole('link', { name: 'Ver rojo (8)' });
    expect(lleno.className).toContain('bg-red-50');
    expect(lleno.className).not.toContain('bg-gray-50');
  });

  test('con total 0 no imprime porcentajes ni NaN', () => {
    const { container } = render(
      <MiniCardsNivel items={items.map((i) => ({ ...i, cantidad: 0 }))} total={0} />,
    );

    expect(container.textContent).not.toMatch(/NaN|%/);
  });
});
