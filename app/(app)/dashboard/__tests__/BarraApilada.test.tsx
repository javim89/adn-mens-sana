import { describe, test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import BarraApilada, { type SegmentoBarra } from '../_components/BarraApilada';

function segmentos(cantidades: [string, number][]): SegmentoBarra[] {
  return cantidades.map(([label, cantidad]) => ({
    clave: label.toUpperCase(),
    label,
    cantidad,
    clase: `bg-${label.toLowerCase()}`,
  }));
}

function anchoDe(container: HTMLElement, clave: string) {
  return (container.querySelector(`[data-segmento="${clave}"]`) as HTMLElement | null)?.style
    .width;
}

describe('BarraApilada', () => {
  test('los anchos son proporcionales al total', () => {
    const { container } = render(
      <BarraApilada
        total={200}
        segmentos={segmentos([
          ['Rojo', 150],
          ['Verde', 50],
        ])}
      />,
    );

    expect(anchoDe(container, 'ROJO')).toBe('75%');
    expect(anchoDe(container, 'VERDE')).toBe('25%');
  });

  test('los segmentos en 0 se omiten', () => {
    const { container } = render(
      <BarraApilada
        total={10}
        segmentos={segmentos([
          ['Rojo', 10],
          ['Verde', 0],
        ])}
      />,
    );

    expect(container.querySelector('[data-segmento="VERDE"]')).toBeNull();
  });

  test('el aria-label solo nombra los segmentos con gente', () => {
    render(
      <BarraApilada
        total={10}
        segmentos={segmentos([
          ['Rojo', 7],
          ['Naranja', 0],
          ['Verde', 3],
        ])}
      />,
    );

    const label = screen.getByRole('img').getAttribute('aria-label');
    expect(label).toBe('Rojo: 7, Verde: 3');
  });

  test('la etiqueta va dentro del segmento mayor', () => {
    const { container } = render(
      <BarraApilada
        total={100}
        segmentos={segmentos([
          ['Rojo', 85],
          ['Verde', 15],
        ])}
        etiquetaMayor={(s, pct) => `${pct}% en ${s.label.toLowerCase()}`}
      />,
    );

    const etiqueta = screen.getByText('85% en rojo');
    expect(container.querySelector('[data-segmento="ROJO"]')).toContainElement(etiqueta);
  });

  test('sin etiqueta si el mayor ocupa menos del 15%', () => {
    render(
      <BarraApilada
        total={100}
        segmentos={Array.from({ length: 8 }, (_, i) => ({
          clave: `S${i}`,
          label: `S${i}`,
          cantidad: i === 0 ? 14 : 12,
          clase: 'bg-gray-300',
        }))}
        etiquetaMayor={(s, pct) => `${pct}% ${s.label}`}
      />,
    );

    expect(screen.queryByText(/% S0/)).not.toBeInTheDocument();
  });

  test('con 15% justo la etiqueta sí aparece', () => {
    render(
      <BarraApilada
        total={100}
        segmentos={[
          { clave: 'A', label: 'A', cantidad: 15, clase: 'bg-a' },
          ...Array.from({ length: 6 }, (_, i) => ({
            clave: `B${i}`,
            label: `B${i}`,
            cantidad: 14,
            clase: 'bg-b',
          })),
          { clave: 'C', label: 'C', cantidad: 1, clase: 'bg-c' },
        ]}
        etiquetaMayor={(s, pct) => `${pct}% ${s.label}`}
      />,
    );

    expect(screen.getByText('15% A')).toBeInTheDocument();
  });

  test('la variante fina no lleva etiqueta y es más baja', () => {
    render(
      <BarraApilada
        grosor="fina"
        total={10}
        segmentos={segmentos([['Rojo', 10]])}
        etiquetaMayor={(s, pct) => `${pct}% en ${s.label}`}
      />,
    );

    expect(screen.queryByText(/100% en/)).not.toBeInTheDocument();
    expect(screen.getByRole('img').className).toContain('h-2.5');
  });

  test('total 0 no renderiza nada (y nunca un NaN)', () => {
    const { container } = render(
      <BarraApilada total={0} segmentos={segmentos([['Rojo', 0]])} />,
    );

    expect(container).toBeEmptyDOMElement();
  });
});
