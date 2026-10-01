import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

const { getResumenPlantel } = vi.hoisted(() => ({ getResumenPlantel: vi.fn() }));
vi.mock('@/lib/queries/dashboard', () => ({ getResumenPlantel }));

import SeccionPlantel from '../_components/SeccionPlantel';

beforeEach(() => {
  vi.clearAllMocks();
  getResumenPlantel.mockResolvedValue({
    porEstado: { ACTIVO: 170, LESIONADO: 20, SUSPENDIDO: 0, INACTIVO: 10 },
    total: 200,
  });
});

describe('SeccionPlantel', () => {
  test('el número gigante es el total del plantel', async () => {
    render(await SeccionPlantel());

    expect(screen.getByText('Deportistas en el plantel')).toBeInTheDocument();
    expect(screen.getByText('200')).toBeInTheDocument();
  });

  test('la barra apilada dice "NN% activos"', async () => {
    render(await SeccionPlantel());

    expect(screen.getByText('85% activos')).toBeInTheDocument();
    expect(screen.getByRole('img').getAttribute('aria-label')).toBe(
      'Activo: 170, Lesionado: 20, Inactivo: 10',
    );
  });

  test('una mini-card por estado, con link al filtro y aria-label con el conteo', async () => {
    render(await SeccionPlantel());

    expect(screen.getAllByRole('link')).toHaveLength(4);
    const activo = screen.getByRole('link', {
      name: 'Ver los deportistas con estado Activo (170)',
    });
    expect(decodeURIComponent(activo.getAttribute('href')!)).toContain('filter[estado]=ACTIVO');
    expect(
      screen.getByRole('link', { name: 'Ver los deportistas con estado Suspendido (0)' }).className,
    ).toContain('bg-gray-50');
  });

  test('sin deportistas: estado vacío, sin links ni NaN', async () => {
    getResumenPlantel.mockResolvedValue({
      porEstado: { ACTIVO: 0, LESIONADO: 0, SUSPENDIDO: 0, INACTIVO: 0 },
      total: 0,
    });
    const { container } = render(await SeccionPlantel());

    expect(screen.getByText('Todavía no hay deportistas cargados')).toBeInTheDocument();
    expect(screen.queryAllByRole('link')).toHaveLength(0);
    expect(container.textContent).not.toMatch(/NaN|undefined/);
  });
});
