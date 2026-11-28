import { describe, test, expect, vi, beforeEach } from 'vitest';
import type { ReactElement, ReactNode } from 'react';
import { render, screen, within } from '@testing-library/react';

const mocks = vi.hoisted(() => ({
  getSeguimientos: vi.fn(),
  getConteoPorTipoSeguimiento: vi.fn(),
  getResumenTurnos: vi.fn(),
  getDisciplinasConCategorias: vi.fn(),
  getProfesionalesSeguimientos: vi.fn(),
  getNombresDeUsuarios: vi.fn(),
}));

vi.mock('@/lib/tenant/db', () => ({ getDb: vi.fn() }));
vi.mock('@/lib/queries/seguimientos', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/queries/seguimientos')>()),
  getSeguimientos: mocks.getSeguimientos,
  getConteoPorTipoSeguimiento: mocks.getConteoPorTipoSeguimiento,
}));
vi.mock('@/lib/queries/dashboard', () => ({ getResumenTurnos: mocks.getResumenTurnos }));
vi.mock('@/lib/queries/disciplinas', () => ({
  getDisciplinasConCategorias: mocks.getDisciplinasConCategorias,
}));
vi.mock('@/lib/actions/seguimientos', () => ({
  getProfesionalesSeguimientos: mocks.getProfesionalesSeguimientos,
}));
vi.mock('@/lib/tenant/miembros', () => ({ getNombresDeUsuarios: mocks.getNombresDeUsuarios }));
vi.mock('@/lib/tenant/contexto', async () =>
  (await import('@/test-utils/tenant')).moduloContextoMock(),
);
vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

import SeguimientosPage from '../page';
import { mockContexto, setContexto } from '@/test-utils/tenant';
import type { AppRole } from '@/lib/generated/prisma/client';

type TablaProps = {
  currentPrioridades: string[];
  currentTipo: string | null;
  lateral: ReactNode;
};

async function montar(sp: Record<string, string | string[]>, rol: AppRole = 'admin') {
  setContexto(mockContexto(rol, { userId: 'user_1' }));
  const arbol = (await SeguimientosPage({ searchParams: Promise.resolve(sp) })) as ReactElement<{
    children: ReactElement<TablaProps>;
  }>;
  return arbol.props.children.props;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getSeguimientos.mockResolvedValue({ items: [], total: 0 });
  mocks.getConteoPorTipoSeguimiento.mockResolvedValue({
    porTipo: {
      GENERICO: 2,
      TRAUMATOLOGIA: 14,
      HISTORIA_CLINICA: 9,
      EVALUACION_PSICOLOGICA: 0,
      EVALUACION_CARDIOLOGICA: 0,
      ANTROPOMETRIA: 4,
    },
    total: 29,
  });
  mocks.getResumenTurnos.mockResolvedValue({ totalSemana: 0, proximos: [] });
  mocks.getDisciplinasConCategorias.mockResolvedValue([]);
  mocks.getProfesionalesSeguimientos.mockResolvedValue([]);
  mocks.getNombresDeUsuarios.mockResolvedValue({});
});

describe('SeguimientosPage', () => {
  test('el link del dashboard con una sola prioridad sigue filtrando', async () => {
    const props = await montar({ prioridad: 'ALTA' });
    expect(mocks.getSeguimientos).toHaveBeenCalledWith(
      expect.objectContaining({ prioridad: ['ALTA'] }),
    );
    expect(props.currentPrioridades).toEqual(['ALTA']);
  });

  test('prioridad multivalor separada por comas y tipo por ?tipo=', async () => {
    const props = await montar({ prioridad: 'URGENTE,ALTA', tipo: 'TRAUMATOLOGIA' });
    expect(mocks.getSeguimientos).toHaveBeenCalledWith(
      expect.objectContaining({ prioridad: ['ALTA', 'URGENTE'], tipoSeguimiento: 'TRAUMATOLOGIA' }),
    );
    expect(props.currentTipo).toBe('TRAUMATOLOGIA');
  });

  test('el conteo por tipo usa los mismos filtros que la lista, sin el tipo', async () => {
    await montar({ prioridad: 'ALTA', tipo: 'GENERICO', q: 'rodilla' });
    const filtros = mocks.getConteoPorTipoSeguimiento.mock.calls[0][0];
    expect(filtros).toMatchObject({ prioridad: ['ALTA'], search: 'rodilla' });
    expect(filtros).not.toHaveProperty('tipoSeguimiento');
  });

  test('el panel por tipo linkea al filtro conservando los demás y la fila activa lo quita', async () => {
    const props = await montar({ prioridad: 'ALTA', tipo: 'ANTROPOMETRIA', page: '2' });
    render(<>{props.lateral}</>);

    const panel = screen.getByRole('heading', { name: 'Seguimientos por tipo' }).closest('section')!;
    const trauma = within(panel).getByRole('link', { name: 'Ver 14 de Traumatología' });
    expect(trauma).toHaveAttribute('href', '/seguimientos?prioridad=ALTA&tipo=TRAUMATOLOGIA');

    const activo = within(panel).getByRole('link', { name: 'Quitar el filtro Antropometría (4)' });
    expect(activo).toHaveAttribute('aria-current', 'true');
    expect(activo).toHaveAttribute('href', '/seguimientos?prioridad=ALTA');

    // Ordenado de mayor a menor.
    const etiquetas = within(panel)
      .getAllByRole('link')
      .map((l) => l.getAttribute('aria-label'));
    expect(etiquetas[0]).toBe('Ver 14 de Traumatología');
  });

  test('admin ve los próximos turnos de todos; un médico solo los propios', async () => {
    await montar({}, 'admin');
    expect(mocks.getResumenTurnos).toHaveBeenCalledWith(
      expect.objectContaining({ profesionalId: undefined, limite: 3 }),
    );

    vi.clearAllMocks();
    mocks.getSeguimientos.mockResolvedValue({ items: [], total: 0 });
    await montar({}, 'medico');
    expect(mocks.getResumenTurnos).toHaveBeenCalledWith(
      expect.objectContaining({ profesionalId: 'user_1' }),
    );
  });

  test('social no tiene /turnos: no consulta ni muestra próximos turnos', async () => {
    const props = await montar({}, 'social');
    expect(mocks.getResumenTurnos).not.toHaveBeenCalled();
    render(<>{props.lateral}</>);
    expect(screen.queryByText('Próximos turnos')).toBeNull();
  });
});
