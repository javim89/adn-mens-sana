import { describe, test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import TileFecha from '../_components/TileFecha';

describe('TileFecha', () => {
  test('muestra la línea chica y la grande', () => {
    render(<TileFecha arriba="MIÉ 30/9" abajo="10:30" />);

    expect(screen.getByText('MIÉ 30/9')).toBeInTheDocument();
    expect(screen.getByText('10:30')).toBeInTheDocument();
  });

  test('es navy con texto blanco por defecto', () => {
    const { container } = render(<TileFecha arriba="MIÉ 30/9" abajo="10:30" />);

    const tile = container.firstElementChild!;
    expect(tile.className).toContain('bg-[#121A61]');
    expect(tile.className).toContain('text-white');
  });

  test('acepta el fondo y el texto del llamador', () => {
    const { container } = render(
      <TileFecha arriba="LUN 1/9" abajo="1/9" fondo="bg-amber-100" texto="text-amber-900" />,
    );

    const tile = container.firstElementChild!;
    expect(tile.className).toContain('bg-amber-100');
    expect(tile.className).toContain('text-amber-900');
    expect(tile.className).not.toContain('bg-[#121A61]');
  });

  test('la línea grande usa tabular-nums', () => {
    render(<TileFecha arriba="MIÉ 30/9" abajo="10:30" />);

    expect(screen.getByText('10:30').className).toContain('tabular-nums');
  });
});
