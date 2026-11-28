import { render, screen } from '@testing-library/react';
import { describe, test, expect } from 'vitest';
import { Anillo, clampPorcentaje } from '../anillo';

describe('Anillo', () => {
  test('aria-label con el porcentaje y el label', () => {
    render(<Anillo valor={82} label="Presentismo semanal" />);
    expect(screen.getByRole('img', { name: 'Presentismo semanal: 82%' })).toBeInTheDocument();
  });

  test('sin label lee solo el porcentaje redondeado', () => {
    render(<Anillo valor={66.6} />);
    expect(screen.getByRole('img', { name: '67%' })).toBeInTheDocument();
  });

  test('recorta a 0–100', () => {
    expect(clampPorcentaje(-10)).toBe(0);
    expect(clampPorcentaje(150)).toBe(100);
    expect(clampPorcentaje(Number.NaN)).toBe(0);
    render(<Anillo valor={150} />);
    const img = screen.getByRole('img', { name: '100%' });
    expect(img.querySelector('[data-slot="progreso"]')).toHaveAttribute('stroke-dashoffset', '0');
  });

  test('con 0 no dibuja el trazo de progreso', () => {
    render(<Anillo valor={-5} />);
    const img = screen.getByRole('img', { name: '0%' });
    expect(img.querySelector('[data-slot="progreso"]')).toBeNull();
  });

  test('usa tokens por defecto y acepta clases para pisar el trazo', () => {
    const { container, rerender } = render(<Anillo valor={50} />);
    expect(container.querySelector('[data-slot="progreso"]')).toHaveClass('stroke-primario');
    rerender(<Anillo valor={50} claseTrazo="stroke-teal-600" />);
    const trazo = container.querySelector('[data-slot="progreso"]');
    expect(trazo).toHaveClass('stroke-teal-600');
    expect(trazo).toHaveAttribute('stroke-dashoffset', '50');
  });

  test('renderiza children al centro', () => {
    render(
      <Anillo valor={40}>
        <span>40%</span>
      </Anillo>,
    );
    expect(screen.getByText('40%')).toBeInTheDocument();
  });
});
