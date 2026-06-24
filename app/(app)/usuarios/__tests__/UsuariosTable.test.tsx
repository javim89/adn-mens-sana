import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import UsuariosTable from '../UsuariosTable';
import ConfirmarAccionModal from '../ConfirmarAccionModal';
import type { Usuario } from '@/lib/types/usuarios';

vi.mock('@clerk/nextjs', () => ({
  useUser: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('@/lib/actions/usuarios', () => ({
  reenviarInvitacion: vi.fn().mockResolvedValue({ ok: true }),
  cambiarRol: vi.fn().mockResolvedValue({ ok: true }),
  deshabilitarUsuario: vi.fn().mockResolvedValue({ ok: true }),
  reactivarUsuario: vi.fn().mockResolvedValue({ ok: true }),
  eliminarUsuario: vi.fn().mockResolvedValue({ ok: true }),
}));

import { useUser } from '@clerk/nextjs';
import { reenviarInvitacion, deshabilitarUsuario, reactivarUsuario, eliminarUsuario } from '@/lib/actions/usuarios';
import { toast } from 'sonner';

const mockActivo: Usuario = {
  id: 'user_1',
  firstName: 'Laura',
  lastName: 'Méndez',
  email: 'l.mendez@gimnasia.org.ar',
  rol: 'admin',
  lastSignInAt: new Date('2026-06-08'),
  createdAt: new Date('2026-01-01'),
  status: 'activo',
  disabled: false,
};

const mockDeshabilitado: Usuario = {
  id: 'user_2',
  firstName: 'Pedro',
  lastName: 'González',
  email: 'p.gonzalez@gimnasia.org.ar',
  rol: 'entrenador',
  lastSignInAt: new Date('2026-05-01'),
  createdAt: new Date('2026-01-01'),
  status: 'activo',
  disabled: true,
};

const mockPendiente: Usuario = {
  id: 'inv_1',
  firstName: 'Sergio',
  lastName: 'Blanco',
  email: 's.blanco@gimnasia.org.ar',
  rol: 'entrenador',
  createdAt: new Date('2026-06-01'),
  status: 'pendiente',
};

function asNonAdmin() {
  vi.mocked(useUser).mockReturnValue({
    user: { id: 'user_other', publicMetadata: { role: 'entrenador' } },
    isLoaded: true,
  } as ReturnType<typeof useUser>);
}

function asAdmin(id = 'user_admin') {
  vi.mocked(useUser).mockReturnValue({
    user: { id, publicMetadata: { role: 'admin' } },
    isLoaded: true,
  } as ReturnType<typeof useUser>);
}

describe('UsuariosTable', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('renderiza usuarios activos correctamente', () => {
    asNonAdmin();
    render(<UsuariosTable usuarios={[mockActivo]} />);

    expect(screen.getByText('Laura Méndez')).toBeInTheDocument();
    expect(screen.getByText('l.mendez@gimnasia.org.ar')).toBeInTheDocument();
    expect(screen.getByText('admin')).toBeInTheDocument();
    expect(screen.getByText('Activo')).toBeInTheDocument();
  });

  test('renderiza invitaciones pendientes con badge "Pendiente"', () => {
    asNonAdmin();
    render(<UsuariosTable usuarios={[mockPendiente]} />);

    expect(screen.getByText('Sergio Blanco')).toBeInTheDocument();
    expect(screen.getByText('s.blanco@gimnasia.org.ar')).toBeInTheDocument();
    expect(screen.getByText('Pendiente')).toBeInTheDocument();
  });

  test('admin ve botón de reenviar invitación en usuarios pendientes', () => {
    asAdmin();
    render(<UsuariosTable usuarios={[mockPendiente]} />);

    fireEvent.click(screen.getByRole('button', { name: /acciones/i }));
    expect(screen.getByRole('button', { name: /reenviar/i })).toBeInTheDocument();
  });

  test('no-admin no ve botón de reenviar aunque el usuario sea pendiente', () => {
    asNonAdmin();
    render(<UsuariosTable usuarios={[mockPendiente]} />);

    expect(screen.queryByRole('button', { name: /reenviar/i })).not.toBeInTheDocument();
  });

  test('usuario activo no muestra botón de reenviar (ni para admin)', () => {
    asAdmin();
    render(<UsuariosTable usuarios={[mockActivo]} />);

    expect(screen.queryByRole('button', { name: /reenviar/i })).not.toBeInTheDocument();
  });

  test('botón reenviar llama reenviarInvitacion con el id correcto', async () => {
    asAdmin();
    render(<UsuariosTable usuarios={[mockPendiente]} />);

    fireEvent.click(screen.getByRole('button', { name: /acciones/i }));
    fireEvent.click(screen.getByRole('button', { name: /reenviar/i }));

    await waitFor(() => {
      expect(reenviarInvitacion).toHaveBeenCalledWith('inv_1');
    });
  });

  test('usuario activo muestra último ingreso formateado', () => {
    asNonAdmin();
    render(<UsuariosTable usuarios={[mockActivo]} />);

    const cell = screen.getByText(/hace \d+ d[íi]as|hoy/i);
    expect(cell).toBeInTheDocument();
  });

  test('usuario pendiente muestra "—" en columna último ingreso', () => {
    asNonAdmin();
    render(<UsuariosTable usuarios={[mockPendiente]} />);

    const dashes = screen.getAllByText('—');
    expect(dashes.length).toBeGreaterThan(0);
  });

  test('columna "Cambiar rol" no aparece para usuarios no-admin', () => {
    asNonAdmin();
    render(<UsuariosTable usuarios={[mockActivo]} />);

    expect(screen.queryByText('Cambiar rol')).not.toBeInTheDocument();
  });

  test('columna "Cambiar rol" aparece para admin', () => {
    asAdmin();
    render(<UsuariosTable usuarios={[mockActivo]} />);

    expect(screen.getByText('Cambiar rol')).toBeInTheDocument();
  });

  test('admin ve el selector de rol para usuarios activos', () => {
    asAdmin();
    render(<UsuariosTable usuarios={[mockActivo]} />);

    const selects = screen.getAllByRole('combobox');
    expect(selects.length).toBeGreaterThan(0);
  });

  test('muestra mensaje vacío cuando no hay usuarios', () => {
    asNonAdmin();
    render(<UsuariosTable usuarios={[]} />);

    expect(screen.getByText(/no hay usuarios registrados/i)).toBeInTheDocument();
  });
});

describe('UsuariosTable — acciones admin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('admin ve botón "Deshabilitar" para usuario activo no deshabilitado', () => {
    asAdmin();
    render(<UsuariosTable usuarios={[mockActivo]} />);

    fireEvent.click(screen.getByRole('button', { name: /acciones/i }));
    expect(screen.getByRole('button', { name: /deshabilitar/i })).toBeInTheDocument();
  });

  test('admin NO ve botón "Deshabilitar" para usuario ya deshabilitado', () => {
    asAdmin();
    render(<UsuariosTable usuarios={[mockDeshabilitado]} />);

    fireEvent.click(screen.getByRole('button', { name: /acciones/i }));
    expect(screen.queryByRole('button', { name: /deshabilitar/i })).not.toBeInTheDocument();
  });

  test('admin ve botón "Reactivar" para usuario deshabilitado', () => {
    asAdmin();
    render(<UsuariosTable usuarios={[mockDeshabilitado]} />);

    fireEvent.click(screen.getByRole('button', { name: /acciones/i }));
    expect(screen.getByRole('button', { name: /reactivar/i })).toBeInTheDocument();
  });

  test('admin NO ve botón "Reactivar" para usuario activo no deshabilitado', () => {
    asAdmin();
    render(<UsuariosTable usuarios={[mockActivo]} />);

    fireEvent.click(screen.getByRole('button', { name: /acciones/i }));
    expect(screen.queryByRole('button', { name: /reactivar/i })).not.toBeInTheDocument();
  });

  test('admin ve botón "Eliminar" para usuario activo', () => {
    asAdmin();
    render(<UsuariosTable usuarios={[mockActivo]} />);

    fireEvent.click(screen.getByRole('button', { name: /acciones/i }));
    expect(screen.getByRole('button', { name: /eliminar/i })).toBeInTheDocument();
  });

  test('admin ve botón "Eliminar" para invitación pendiente', () => {
    asAdmin();
    render(<UsuariosTable usuarios={[mockPendiente]} />);

    fireEvent.click(screen.getByRole('button', { name: /acciones/i }));
    expect(screen.getByRole('button', { name: /eliminar/i })).toBeInTheDocument();
  });

  test('no-admin NO ve botón "Deshabilitar"', () => {
    asNonAdmin();
    render(<UsuariosTable usuarios={[mockActivo]} />);

    expect(screen.queryByRole('button', { name: /deshabilitar/i })).not.toBeInTheDocument();
  });

  test('no-admin NO ve botón "Reactivar"', () => {
    asNonAdmin();
    render(<UsuariosTable usuarios={[mockDeshabilitado]} />);

    expect(screen.queryByRole('button', { name: /reactivar/i })).not.toBeInTheDocument();
  });

  test('no-admin NO ve botón "Eliminar"', () => {
    asNonAdmin();
    render(<UsuariosTable usuarios={[mockActivo]} />);

    expect(screen.queryByRole('button', { name: /eliminar/i })).not.toBeInTheDocument();
  });

  test('click en "Deshabilitar" abre modal de confirmación', () => {
    asAdmin();
    render(<UsuariosTable usuarios={[mockActivo]} />);

    fireEvent.click(screen.getByRole('button', { name: /acciones/i }));
    fireEvent.click(screen.getByRole('button', { name: /deshabilitar/i }));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/deshabilitar usuario/i)).toBeInTheDocument();
  });

  test('click en "Reactivar" abre modal de confirmación', () => {
    asAdmin();
    render(<UsuariosTable usuarios={[mockDeshabilitado]} />);

    fireEvent.click(screen.getByRole('button', { name: /acciones/i }));
    fireEvent.click(screen.getByRole('button', { name: /reactivar/i }));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/reactivar usuario/i)).toBeInTheDocument();
  });

  test('click en "Eliminar" (activo) abre modal de confirmación', () => {
    asAdmin();
    render(<UsuariosTable usuarios={[mockActivo]} />);

    fireEvent.click(screen.getByRole('button', { name: /acciones/i }));
    fireEvent.click(screen.getByRole('button', { name: /eliminar/i }));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/eliminar usuario/i)).toBeInTheDocument();
  });

  test('confirmar deshabilitar llama deshabilitarUsuario con el userId correcto', async () => {
    asAdmin();
    render(<UsuariosTable usuarios={[mockActivo]} />);

    fireEvent.click(screen.getByRole('button', { name: /acciones/i }));
    fireEvent.click(screen.getByRole('button', { name: /deshabilitar/i }));
    const dialog = screen.getByRole('dialog');
    const confirmBtn = dialog.querySelector('button:last-child') as HTMLElement;
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(deshabilitarUsuario).toHaveBeenCalledWith('user_1');
    });
  });

  test('confirmar reactivar llama reactivarUsuario con el userId correcto', async () => {
    asAdmin();
    render(<UsuariosTable usuarios={[mockDeshabilitado]} />);

    fireEvent.click(screen.getByRole('button', { name: /acciones/i }));
    fireEvent.click(screen.getByRole('button', { name: /reactivar/i }));
    const dialog = screen.getByRole('dialog');
    const confirmBtn = dialog.querySelector('button:last-child') as HTMLElement;
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(reactivarUsuario).toHaveBeenCalledWith('user_2');
    });
  });

  test('confirmar eliminar (activo) llama eliminarUsuario con status activo', async () => {
    asAdmin();
    render(<UsuariosTable usuarios={[mockActivo]} />);

    fireEvent.click(screen.getByRole('button', { name: /acciones/i }));
    fireEvent.click(screen.getByRole('button', { name: /eliminar/i }));
    const dialog = screen.getByRole('dialog');
    const confirmBtn = dialog.querySelector('button:last-child') as HTMLElement;
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(eliminarUsuario).toHaveBeenCalledWith('user_1', 'activo');
    });
  });

  test('confirmar eliminar (pendiente) llama eliminarUsuario con status pendiente', async () => {
    asAdmin();
    render(<UsuariosTable usuarios={[mockPendiente]} />);

    fireEvent.click(screen.getByRole('button', { name: /acciones/i }));
    fireEvent.click(screen.getByRole('button', { name: /eliminar/i }));
    const dialog = screen.getByRole('dialog');
    const confirmBtn = dialog.querySelector('button:last-child') as HTMLElement;
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(eliminarUsuario).toHaveBeenCalledWith('inv_1', 'pendiente');
    });
  });

  test('cancelar en modal no llama ninguna acción', async () => {
    asAdmin();
    render(<UsuariosTable usuarios={[mockActivo]} />);

    fireEvent.click(screen.getByRole('button', { name: /acciones/i }));
    fireEvent.click(screen.getByRole('button', { name: /deshabilitar/i }));
    const dialog = screen.getByRole('dialog');
    fireEvent.click(dialog.querySelector('button:first-child') as HTMLElement);

    await waitFor(() => {
      expect(deshabilitarUsuario).not.toHaveBeenCalled();
    });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  test('usuario deshabilitado muestra badge "Deshabilitado"', () => {
    asNonAdmin();
    render(<UsuariosTable usuarios={[mockDeshabilitado]} />);

    expect(screen.getByText('Deshabilitado')).toBeInTheDocument();
  });

  test('usuario deshabilitado tiene clase de opacidad en la fila', () => {
    asNonAdmin();
    render(<UsuariosTable usuarios={[mockDeshabilitado]} />);

    const row = screen.getByText('Pedro González').closest('tr');
    expect(row?.className).toContain('opacity-60');
  });

  test('usuario activo no deshabilitado muestra badge "Activo" (regresión)', () => {
    asNonAdmin();
    render(<UsuariosTable usuarios={[mockActivo]} />);

    expect(screen.getByText('Activo')).toBeInTheDocument();
    expect(screen.queryByText('Deshabilitado')).not.toBeInTheDocument();
  });

  test('el trigger "Acciones" abre el dropdown al hacer click', () => {
    asAdmin();
    render(<UsuariosTable usuarios={[mockActivo]} />);

    expect(screen.queryByRole('button', { name: /deshabilitar/i })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /acciones/i }));
    expect(screen.getByRole('button', { name: /deshabilitar/i })).toBeInTheDocument();
  });

  test('el dropdown muestra solo las acciones aplicables para cada estado', () => {
    asAdmin();
    render(<UsuariosTable usuarios={[mockPendiente]} />);

    fireEvent.click(screen.getByRole('button', { name: /acciones/i }));
    expect(screen.getByRole('button', { name: /reenviar/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /deshabilitar/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /reactivar/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /eliminar/i })).toBeInTheDocument();
  });

  test('admin NO ve botón "Deshabilitar" para su propia fila', () => {
    // Admin is logged in as user_1, so their own row should not show Deshabilitar
    asAdmin('user_1');
    render(<UsuariosTable usuarios={[mockActivo]} />);

    fireEvent.click(screen.getByRole('button', { name: /acciones/i }));
    expect(screen.queryByRole('button', { name: /deshabilitar/i })).not.toBeInTheDocument();
  });

  test('éxito en deshabilitar muestra toast y cierra modal', async () => {
    asAdmin();
    render(<UsuariosTable usuarios={[mockActivo]} />);

    fireEvent.click(screen.getByRole('button', { name: /acciones/i }));
    fireEvent.click(screen.getByRole('button', { name: /deshabilitar/i }));
    const dialog = screen.getByRole('dialog');
    fireEvent.click(dialog.querySelector('button:last-child') as HTMLElement);

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Usuario deshabilitado');
    });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  test('éxito en reactivar muestra toast "Usuario reactivado"', async () => {
    asAdmin();
    render(<UsuariosTable usuarios={[mockDeshabilitado]} />);

    fireEvent.click(screen.getByRole('button', { name: /acciones/i }));
    fireEvent.click(screen.getByRole('button', { name: /reactivar/i }));
    const dialog = screen.getByRole('dialog');
    fireEvent.click(dialog.querySelector('button:last-child') as HTMLElement);

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Usuario reactivado');
    });
  });

  test('error en acción muestra toast de error', async () => {
    vi.mocked(deshabilitarUsuario).mockResolvedValueOnce({ ok: false, error: 'Error de prueba' });
    asAdmin();
    render(<UsuariosTable usuarios={[mockActivo]} />);

    fireEvent.click(screen.getByRole('button', { name: /acciones/i }));
    fireEvent.click(screen.getByRole('button', { name: /deshabilitar/i }));
    const dialog = screen.getByRole('dialog');
    fireEvent.click(dialog.querySelector('button:last-child') as HTMLElement);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Error de prueba');
    });
  });
});

describe('ConfirmarAccionModal', () => {
  const baseProps = {
    open: true,
    title: 'Confirmar acción',
    description: '¿Estás seguro?',
    confirmLabel: 'Confirmar',
    isPending: false,
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('no renderiza nada cuando open es false', () => {
    render(<ConfirmarAccionModal {...baseProps} open={false} />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  test('renderiza title y description cuando open es true', () => {
    render(<ConfirmarAccionModal {...baseProps} />);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Confirmar acción')).toBeInTheDocument();
    expect(screen.getByText('¿Estás seguro?')).toBeInTheDocument();
  });

  test('botón confirmar llama onConfirm', () => {
    const onConfirm = vi.fn();
    render(<ConfirmarAccionModal {...baseProps} onConfirm={onConfirm} />);

    fireEvent.click(screen.getByRole('button', { name: /confirmar/i }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  test('botón cancelar llama onCancel', () => {
    const onCancel = vi.fn();
    render(<ConfirmarAccionModal {...baseProps} onCancel={onCancel} />);

    fireEvent.click(screen.getByRole('button', { name: /cancelar/i }));

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  test('botón confirmar está deshabilitado cuando isPending es true', () => {
    render(<ConfirmarAccionModal {...baseProps} isPending={true} />);

    const confirmBtn = screen.getByRole('button', { name: /confirmar/i });
    expect(confirmBtn).toBeDisabled();
  });

  test('muestra spinner cuando isPending es true', () => {
    render(<ConfirmarAccionModal {...baseProps} isPending={true} />);

    // Loader2 renders as an svg — check the button contains both text and is disabled
    const confirmBtn = screen.getByRole('button', { name: /confirmar/i });
    expect(confirmBtn).toBeDisabled();
    // The button text includes "..." when pending
    expect(confirmBtn.textContent).toContain('...');
  });

  test('botón confirmar es rojo cuando danger es true', () => {
    render(<ConfirmarAccionModal {...baseProps} danger={true} />);

    const confirmBtn = screen.getByRole('button', { name: /confirmar/i });
    expect(confirmBtn.className).toContain('bg-red-600');
  });

  test('botón confirmar es azul marino cuando danger es false', () => {
    render(<ConfirmarAccionModal {...baseProps} danger={false} />);

    const confirmBtn = screen.getByRole('button', { name: /confirmar/i });
    expect(confirmBtn.className).toContain('bg-[#121A61]');
  });
});
