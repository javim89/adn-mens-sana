import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const { mockDeleteDashboard, mockRefresh, mockToastSuccess, mockToastError } = vi.hoisted(
  () => ({
    mockDeleteDashboard: vi.fn(),
    mockRefresh: vi.fn(),
    mockToastSuccess: vi.fn(),
    mockToastError: vi.fn(),
  }),
);

vi.mock('@/lib/actions/insights', () => ({ deleteDashboard: mockDeleteDashboard }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: mockRefresh }) }));
vi.mock('sonner', () => ({
  toast: { success: mockToastSuccess, error: mockToastError },
}));

import DashboardCardActions from '../DashboardCardActions';

beforeEach(() => {
  vi.clearAllMocks();
  mockDeleteDashboard.mockResolvedValue({ success: true });
});

async function abrirDialogo() {
  const user = userEvent.setup();
  render(<DashboardCardActions id="dash_1" nombre="Tablero de prueba" />);

  await user.click(screen.getByRole('button', { name: 'Acciones de Tablero de prueba' }));
  await user.click(await screen.findByText('Eliminar'));
  await screen.findByRole('dialog');

  return user;
}

describe('DashboardCardActions', () => {
  it('no elimina nada hasta que se confirma', async () => {
    const user = await abrirDialogo();

    expect(mockDeleteDashboard).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Cancelar' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(mockDeleteDashboard).not.toHaveBeenCalled();
  });

  it('nombra el dashboard en la confirmación', async () => {
    await abrirDialogo();

    expect(screen.getByRole('dialog')).toHaveTextContent('Tablero de prueba');
    expect(screen.getByRole('dialog')).toHaveTextContent(/no se puede deshacer/i);
  });

  it('elimina, avisa y refresca al confirmar', async () => {
    const user = await abrirDialogo();

    await user.click(screen.getByRole('button', { name: 'Eliminar' }));

    await waitFor(() => expect(mockDeleteDashboard).toHaveBeenCalledWith('dash_1'));
    await waitFor(() => expect(mockToastSuccess).toHaveBeenCalledWith('Dashboard eliminado'));
    expect(mockRefresh).toHaveBeenCalled();
  });

  it('muestra el error de la action y deja el diálogo abierto', async () => {
    mockDeleteDashboard.mockResolvedValue({
      success: false,
      error: 'No se puede eliminar un dashboard del sistema',
    });

    const user = await abrirDialogo();
    await user.click(screen.getByRole('button', { name: 'Eliminar' }));

    expect(
      await screen.findByText('No se puede eliminar un dashboard del sistema'),
    ).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(mockRefresh).not.toHaveBeenCalled();
    expect(mockToastSuccess).not.toHaveBeenCalled();
  });
});
