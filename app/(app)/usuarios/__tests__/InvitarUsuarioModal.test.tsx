import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import InvitarUsuarioModal from '../InvitarUsuarioModal';
import { ROLES_PERMITIDOS, ROL_LABELS } from '@/lib/roles';

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('@/lib/actions/usuarios', () => ({
  invitarUsuario: vi.fn().mockResolvedValue({ ok: true }),
}));

import { invitarUsuario } from '@/lib/actions/usuarios';
import { toast } from 'sonner';

function renderModal() {
  const onClose = vi.fn();
  const onSuccess = vi.fn();
  render(<InvitarUsuarioModal open={true} onClose={onClose} onSuccess={onSuccess} />);
  return { onClose, onSuccess };
}

function fillDatosPersonales() {
  fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'María' } });
  fireEvent.change(screen.getByLabelText('Apellido'), { target: { value: 'Domínguez' } });
  fireEvent.change(screen.getByLabelText('Email'), {
    target: { value: 'm.dominguez@gimnasia.org.ar' },
  });
}

function seleccionarRol(label: string) {
  fireEvent.click(screen.getByLabelText('Rol'));
  fireEvent.click(screen.getByText(label));
}

describe('InvitarUsuarioModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Regresión: el schema de Zod hardcodeaba los roles y no incluía 'social',
  // por lo que seleccionar el rol Social mostraba "Seleccioná un rol" y bloqueaba el envío.
  test('permite invitar un usuario con rol Social sin error de validación', async () => {
    const { onSuccess } = renderModal();

    fillDatosPersonales();
    seleccionarRol(ROL_LABELS.social);

    fireEvent.click(screen.getByRole('button', { name: 'Enviar invitación' }));

    await waitFor(() => {
      expect(invitarUsuario).toHaveBeenCalledWith({
        firstName: 'María',
        lastName: 'Domínguez',
        email: 'm.dominguez@gimnasia.org.ar',
        rol: 'social',
      });
    });

    expect(toast.error).not.toHaveBeenCalled();
    expect(toast.success).toHaveBeenCalled();
    expect(onSuccess).toHaveBeenCalled();
  });

  // Guard: el select debe ofrecer todos los roles definidos en ROLES_PERMITIDOS.
  // Si se agrega un rol nuevo en lib/roles.ts, debe aparecer acá sin tocar el modal.
  test('el select de rol lista todos los ROLES_PERMITIDOS', () => {
    renderModal();

    fireEvent.click(screen.getByLabelText('Rol'));

    for (const rol of ROLES_PERMITIDOS) {
      expect(screen.getByText(ROL_LABELS[rol])).toBeDefined();
    }
  });

  test('muestra el error "Seleccioná un rol" si se envía sin elegir rol', async () => {
    renderModal();

    fillDatosPersonales();
    fireEvent.click(screen.getByRole('button', { name: 'Enviar invitación' }));

    // El texto aparece dos veces: como placeholder del select y como mensaje de error.
    await waitFor(() => {
      expect(screen.getAllByText('Seleccioná un rol').length).toBe(2);
    });
    expect(invitarUsuario).not.toHaveBeenCalled();
  });
});
