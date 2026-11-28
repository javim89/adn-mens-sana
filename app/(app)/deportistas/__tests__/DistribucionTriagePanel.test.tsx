import { render, screen } from '@testing-library/react';
import { describe, test, expect } from 'vitest';
import DistribucionTriagePanel from '../_components/DistribucionTriagePanel';
import type { DistribucionTriage } from '@/lib/queries/triage';

const datos = {
  actual: { ROJO: 3, NARANJA: 5, AMARILLO: 2, VERDE: 30 },
  sinCalcular: 10,
  totalActivos: 50,
} as unknown as DistribucionTriage;

describe('DistribucionTriagePanel', () => {
  test('muestra el total de activos y una mini-card por nivel con link al filtro', () => {
    render(<DistribucionTriagePanel datos={datos} />);

    expect(screen.getByRole('heading', { name: 'Distribución de triage' })).toBeInTheDocument();
    expect(screen.getByText('Sobre 50 deportistas activos.')).toBeInTheDocument();

    const rojo = screen.getByRole('link', { name: 'Ver deportistas activos en nivel Rojo (3)' });
    expect(rojo).toHaveAttribute('href', expect.stringContaining('filter%5BnivelTriage%5D=ROJO'));
    expect(rojo).toHaveAttribute('href', expect.stringContaining('filter%5Bestado%5D=ACTIVO'));
    expect(
      screen.getByRole('link', { name: 'Ver deportistas activos en nivel Sin calcular (10)' }),
    ).toHaveAttribute('href', expect.stringContaining('SIN_CALCULAR'));
  });

  test('usa la grilla de 2 columnas', () => {
    const { container } = render(<DistribucionTriagePanel datos={datos} />);
    expect(container.querySelector('ul')).toHaveClass('grid-cols-2');
  });

  test('sin activos muestra un estado vacío', () => {
    render(
      <DistribucionTriagePanel
        datos={{ ...datos, actual: { ROJO: 0, NARANJA: 0, AMARILLO: 0, VERDE: 0 }, sinCalcular: 0, totalActivos: 0 }}
      />,
    );
    expect(screen.getByText('Todavía no hay deportistas activos.')).toBeInTheDocument();
    expect(screen.queryAllByRole('link')).toHaveLength(0);
  });
});
