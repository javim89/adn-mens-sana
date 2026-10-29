import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import UsuariosTable from '../UsuariosTable';
import ConfirmarAccionModal from '../ConfirmarAccionModal';
import type { Usuario } from '@/lib/types/usuarios';

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
  lugarRetiro: null,
  status: 'activo',
};

const mockDeshabilitado: Usuario = {
  id: 'user_2',
  firstName: 'Pedro',
  lastName: 'González',
  email: 'p.gonzalez@gimnasia.org.ar',
  rol: 'entrenador',
  lastSignInAt: new Date('2026-05-01'),
  createdAt: new Date('2026-01-01'),
  lugarRetiro: null,
  status: 'inactivo',
};

const mockPendiente: Usuario = {
  id: 'inv_1',
  firstName: 'Sergio',
  lastName: 'Blanco',
  email: 's.blanco@gimnasia.org.ar',
  rol: 'entrenador',
  createdAt: new Date('2026-06-01'),
  expira: new Date('2026-07-01'),
  lugarRetiro: null,
  status: 'pendiente',
};

const mockVencida: Usuario = {
  id: 'inv_v',
  firstName: 'Vera',
  lastName: 'Paz',
  email: 'v.paz@club.org',
  rol: 'medico',
  createdAt: new Date('2026-01-01'),
  expira: new Date('2026-01-31'),
  lugarRetiro: null,
  status: 'vencida',
};

/** Rol y userId del logueado: llegan por props desde la page (salen de su membresía). */
let sesion = { rol: 'entrenador', currentUserId: 'user_other' };

function asNonAdmin() {
  sesion = { rol: 'entrenador', currentUserId: 'user_other' };
}

function asAdmin(id = 'user_admin') {
  sesion = { rol: 'admin', currentUserId: id };
}

describe('UsuariosTable', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('renderiza usuarios activos correctamente', () => {
    asNonAdmin();
    render(<UsuariosTable {...sesion} usuarios={[mockActivo]} />);

    expect(screen.getAllByText('Laura Méndez')[0]).toBeInTheDocument();
    expect(screen.getAllByText('l.mendez@gimnasia.org.ar')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Admin')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Activo')[0]).toBeInTheDocument();
  });

  test('renderiza invitaciones pendientes con badge "Pendiente"', () => {
    asNonAdmin();
    render(<UsuariosTable {...sesion} usuarios={[mockPendiente]} />);

    expect(screen.getAllByText('Sergio Blanco')[0]).toBeInTheDocument();
    expect(screen.getAllByText('s.blanco@gimnasia.org.ar')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Pendiente')[0]).toBeInTheDocument();
  });

  test('una invitación vencida se muestra con badge "Vencida" y sin selector de rol', () => {
    asAdmin();
    render(<UsuariosTable {...sesion} usuarios={[mockVencida]} />);

    expect(screen.getAllByText('Vera Paz')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Vencida')[0]).toBeInTheDocument();
    expect(screen.queryByText('Pendiente')).not.toBeInTheDocument();
    expect(screen.queryByText('Rol:')).not.toBeInTheDocument();
  });

  test('admin puede reenviar una invitación vencida', async () => {
    asAdmin();
    render(<UsuariosTable {...sesion} usuarios={[mockVencida]} />);

    fireEvent.click(screen.getAllByRole('button', { name: /acciones/i })[0]);
    fireEvent.click(screen.getByRole('button', { name: /reenviar/i }));

    await waitFor(() => {
      expect(reenviarInvitacion).toHaveBeenCalledWith('inv_v');
    });
  });

  test('eliminar una invitación vencida la revoca con su estado', async () => {
    asAdmin();
    render(<UsuariosTable {...sesion} usuarios={[mockVencida]} />);

    fireEvent.click(screen.getAllByRole('button', { name: /acciones/i })[0]);
    fireEvent.click(screen.getByRole('button', { name: /eliminar/i }));
    expect(screen.getByText('Eliminar invitación')).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: /^eliminar$/i }).at(-1)!);

    await waitFor(() => {
      expect(eliminarUsuario).toHaveBeenCalledWith('inv_v', 'vencida');
    });
  });

  test('admin ve botón de reenviar invitación en usuarios pendientes', () => {
    asAdmin();
    render(<UsuariosTable {...sesion} usuarios={[mockPendiente]} />);

    fireEvent.click(screen.getAllByRole('button', { name: /acciones/i })[0]);
    expect(screen.getByRole('button', { name: /reenviar/i })).toBeInTheDocument();
  });

  test('no-admin no ve botón de reenviar aunque el usuario sea pendiente', () => {
    asNonAdmin();
    render(<UsuariosTable {...sesion} usuarios={[mockPendiente]} />);

    expect(screen.queryByRole('button', { name: /reenviar/i })).not.toBeInTheDocument();
  });

  test('usuario activo no muestra botón de reenviar (ni para admin)', () => {
    asAdmin();
    render(<UsuariosTable {...sesion} usuarios={[mockActivo]} />);

    expect(screen.queryByRole('button', { name: /reenviar/i })).not.toBeInTheDocument();
  });

  test('botón reenviar llama reenviarInvitacion con el id correcto', async () => {
    asAdmin();
    render(<UsuariosTable {...sesion} usuarios={[mockPendiente]} />);

    fireEvent.click(screen.getAllByRole('button', { name: /acciones/i })[0]);
    fireEvent.click(screen.getByRole('button', { name: /reenviar/i }));

    await waitFor(() => {
      expect(reenviarInvitacion).toHaveBeenCalledWith('inv_1');
    });
  });

  test('usuario activo muestra último ingreso formateado', () => {
    // Fijar "hoy" para que el resultado no dependa de la fecha real de ejecución
    // (lastSignInAt = 2026-06-08 → 2 días antes).
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-06-10T12:00:00Z'));
    try {
      asNonAdmin();
      render(<UsuariosTable {...sesion} usuarios={[mockActivo]} />);

      const cells = screen.getAllByText(/hace 2 días/i);
      expect(cells.length).toBeGreaterThan(0);
    } finally {
      vi.useRealTimers();
    }
  });

  test('último ingreso de hace 30 días o más se muestra como fecha dd/mm/aaaa', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-29T12:00:00Z'));
    try {
      asNonAdmin();
      render(<UsuariosTable {...sesion} usuarios={[mockActivo]} />);

      const cells = screen.getAllByText(/^\d{2}\/\d{2}\/2026$/);
      expect(cells.length).toBeGreaterThan(0);
      expect(screen.queryByText(/hace \d+ d[íi]as|hoy/i)).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  test('usuario pendiente muestra "—" en columna último ingreso', () => {
    asNonAdmin();
    render(<UsuariosTable {...sesion} usuarios={[mockPendiente]} />);

    const dashes = screen.getAllByText('—');
    expect(dashes.length).toBeGreaterThan(0);
  });

  test('columna "Cambiar rol" no aparece para usuarios no-admin', () => {
    asNonAdmin();
    render(<UsuariosTable {...sesion} usuarios={[mockActivo]} />);

    expect(screen.queryByText('Cambiar rol')).not.toBeInTheDocument();
  });

  test('columna "Cambiar rol" aparece para admin', () => {
    asAdmin();
    render(<UsuariosTable {...sesion} usuarios={[mockActivo]} />);

    expect(screen.getByText('Cambiar rol')).toBeInTheDocument();
  });

  test('admin ve el selector de rol para usuarios activos', () => {
    asAdmin();
    render(<UsuariosTable {...sesion} usuarios={[mockActivo]} />);

    // El selector de rol es un CustomSelect (botón trigger con el rol actual),
    // no un <select> nativo: se reemplazó a propósito en 7bbc737.
    const triggers = screen.getAllByRole('button', { name: 'Admin' });
    expect(triggers.length).toBeGreaterThan(0);

    fireEvent.click(triggers[0]);
    expect(screen.getByRole('button', { name: 'Entrenador' })).toBeInTheDocument();
  });

  test('no-admin no ve el selector de rol', () => {
    asNonAdmin();
    render(<UsuariosTable {...sesion} usuarios={[mockActivo]} />);

    expect(screen.queryByRole('button', { name: 'Admin' })).not.toBeInTheDocument();
  });

  test('muestra mensaje vacío cuando no hay usuarios', () => {
    asNonAdmin();
    render(<UsuariosTable {...sesion} usuarios={[]} />);

    const messages = screen.getAllByText(/no hay usuarios registrados/i);
    expect(messages.length).toBeGreaterThan(0);
  });

  test('RolBadge renderiza con color propio para kinesiologo (no usa fallback bg-gray-100)', () => {
    const mockKinesiologo: Usuario = {
      id: 'user_kine',
      firstName: 'Ana',
      lastName: 'Torres',
      email: 'a.torres@gimnasia.org.ar',
      rol: 'kinesiologo',
      lastSignInAt: null,
      createdAt: new Date('2026-01-01'),
      lugarRetiro: null,
      status: 'activo',
    };
    asNonAdmin();
    render(<UsuariosTable {...sesion} usuarios={[mockKinesiologo]} />);

    // Badge should display the label (not raw rol value)
    const badge = screen.getAllByText('Kinesiólogo')[0];
    expect(badge).toBeInTheDocument();
    // Badge must NOT have the fallback gray class
    expect(badge.className).not.toContain('bg-gray-100');
    // Badge must have the teal color class
    expect(badge.className).toContain('bg-[#0F766E]');
  });
});

describe('UsuariosTable — acciones admin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('admin ve botón "Deshabilitar" para usuario activo no deshabilitado', () => {
    asAdmin();
    render(<UsuariosTable {...sesion} usuarios={[mockActivo]} />);

    fireEvent.click(screen.getAllByRole('button', { name: /acciones/i })[0]);
    expect(screen.getByRole('button', { name: /deshabilitar/i })).toBeInTheDocument();
  });

  test('admin NO ve botón "Deshabilitar" para usuario ya deshabilitado', () => {
    asAdmin();
    render(<UsuariosTable {...sesion} usuarios={[mockDeshabilitado]} />);

    fireEvent.click(screen.getAllByRole('button', { name: /acciones/i })[0]);
    expect(screen.queryByRole('button', { name: /deshabilitar/i })).not.toBeInTheDocument();
  });

  test('admin ve botón "Reactivar" para usuario deshabilitado', () => {
    asAdmin();
    render(<UsuariosTable {...sesion} usuarios={[mockDeshabilitado]} />);

    fireEvent.click(screen.getAllByRole('button', { name: /acciones/i })[0]);
    expect(screen.getByRole('button', { name: /reactivar/i })).toBeInTheDocument();
  });

  test('admin NO ve botón "Reactivar" para usuario activo no deshabilitado', () => {
    asAdmin();
    render(<UsuariosTable {...sesion} usuarios={[mockActivo]} />);

    fireEvent.click(screen.getAllByRole('button', { name: /acciones/i })[0]);
    expect(screen.queryByRole('button', { name: /reactivar/i })).not.toBeInTheDocument();
  });

  test('admin ve botón "Eliminar" para usuario activo', () => {
    asAdmin();
    render(<UsuariosTable {...sesion} usuarios={[mockActivo]} />);

    fireEvent.click(screen.getAllByRole('button', { name: /acciones/i })[0]);
    expect(screen.getByRole('button', { name: /eliminar/i })).toBeInTheDocument();
  });

  test('admin ve botón "Eliminar" para invitación pendiente', () => {
    asAdmin();
    render(<UsuariosTable {...sesion} usuarios={[mockPendiente]} />);

    fireEvent.click(screen.getAllByRole('button', { name: /acciones/i })[0]);
    expect(screen.getByRole('button', { name: /eliminar/i })).toBeInTheDocument();
  });

  test('no-admin NO ve botón "Deshabilitar"', () => {
    asNonAdmin();
    render(<UsuariosTable {...sesion} usuarios={[mockActivo]} />);

    expect(screen.queryByRole('button', { name: /deshabilitar/i })).not.toBeInTheDocument();
  });

  test('no-admin NO ve botón "Reactivar"', () => {
    asNonAdmin();
    render(<UsuariosTable {...sesion} usuarios={[mockDeshabilitado]} />);

    expect(screen.queryByRole('button', { name: /reactivar/i })).not.toBeInTheDocument();
  });

  test('no-admin NO ve botón "Eliminar"', () => {
    asNonAdmin();
    render(<UsuariosTable {...sesion} usuarios={[mockActivo]} />);

    expect(screen.queryByRole('button', { name: /eliminar/i })).not.toBeInTheDocument();
  });

  test('click en "Deshabilitar" abre modal de confirmación', () => {
    asAdmin();
    render(<UsuariosTable {...sesion} usuarios={[mockActivo]} />);

    fireEvent.click(screen.getAllByRole('button', { name: /acciones/i })[0]);
    fireEvent.click(screen.getByRole('button', { name: /deshabilitar/i }));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/deshabilitar usuario/i)).toBeInTheDocument();
  });

  test('click en "Reactivar" abre modal de confirmación', () => {
    asAdmin();
    render(<UsuariosTable {...sesion} usuarios={[mockDeshabilitado]} />);

    fireEvent.click(screen.getAllByRole('button', { name: /acciones/i })[0]);
    fireEvent.click(screen.getByRole('button', { name: /reactivar/i }));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/reactivar usuario/i)).toBeInTheDocument();
  });

  test('click en "Eliminar" (activo) abre modal de confirmación', () => {
    asAdmin();
    render(<UsuariosTable {...sesion} usuarios={[mockActivo]} />);

    fireEvent.click(screen.getAllByRole('button', { name: /acciones/i })[0]);
    fireEvent.click(screen.getByRole('button', { name: /eliminar/i }));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/eliminar usuario/i)).toBeInTheDocument();
  });

  test('confirmar deshabilitar llama deshabilitarUsuario con el userId correcto', async () => {
    asAdmin();
    render(<UsuariosTable {...sesion} usuarios={[mockActivo]} />);

    fireEvent.click(screen.getAllByRole('button', { name: /acciones/i })[0]);
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
    render(<UsuariosTable {...sesion} usuarios={[mockDeshabilitado]} />);

    fireEvent.click(screen.getAllByRole('button', { name: /acciones/i })[0]);
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
    render(<UsuariosTable {...sesion} usuarios={[mockActivo]} />);

    fireEvent.click(screen.getAllByRole('button', { name: /acciones/i })[0]);
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
    render(<UsuariosTable {...sesion} usuarios={[mockPendiente]} />);

    fireEvent.click(screen.getAllByRole('button', { name: /acciones/i })[0]);
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
    render(<UsuariosTable {...sesion} usuarios={[mockActivo]} />);

    fireEvent.click(screen.getAllByRole('button', { name: /acciones/i })[0]);
    fireEvent.click(screen.getByRole('button', { name: /deshabilitar/i }));
    const dialog = screen.getByRole('dialog');
    fireEvent.click(dialog.querySelector('button:first-child') as HTMLElement);

    await waitFor(() => {
      expect(deshabilitarUsuario).not.toHaveBeenCalled();
    });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  test('membresía desactivada muestra badge "Inactivo"', () => {
    asNonAdmin();
    render(<UsuariosTable {...sesion} usuarios={[mockDeshabilitado]} />);

    expect(screen.getAllByText('Inactivo')[0]).toBeInTheDocument();
  });

  test('un miembro inactivo se puede eliminar del club con su estado', async () => {
    asAdmin();
    render(<UsuariosTable {...sesion} usuarios={[mockDeshabilitado]} />);

    fireEvent.click(screen.getAllByRole('button', { name: /acciones/i })[0]);
    fireEvent.click(screen.getByRole('button', { name: /eliminar/i }));
    const dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: /eliminar/i }));

    await waitFor(() => {
      expect(eliminarUsuario).toHaveBeenCalledWith('user_2', 'inactivo');
    });
  });

  test('el admin no ve "Deshabilitar" sobre sí mismo', () => {
    asAdmin('user_1');
    render(<UsuariosTable {...sesion} usuarios={[mockActivo]} />);

    fireEvent.click(screen.getAllByRole('button', { name: /acciones/i })[0]);
    expect(screen.queryByRole('button', { name: /deshabilitar/i })).not.toBeInTheDocument();
  });

  test('usuario deshabilitado tiene clase de opacidad en la fila', () => {
    asNonAdmin();
    render(<UsuariosTable {...sesion} usuarios={[mockDeshabilitado]} />);

    const nameEl = screen.getAllByText('Pedro González')[0];
    const container = nameEl.closest('[class*="opacity-60"]');
    expect(container).not.toBeNull();
  });

  test('usuario activo no deshabilitado muestra badge "Activo" (regresión)', () => {
    asNonAdmin();
    render(<UsuariosTable {...sesion} usuarios={[mockActivo]} />);

    expect(screen.getAllByText('Activo')[0]).toBeInTheDocument();
    expect(screen.queryByText('Inactivo')).not.toBeInTheDocument();
  });

  test('el trigger "Acciones" abre el dropdown al hacer click', () => {
    asAdmin();
    render(<UsuariosTable {...sesion} usuarios={[mockActivo]} />);

    expect(screen.queryByRole('button', { name: /deshabilitar/i })).not.toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: /acciones/i })[0]);
    expect(screen.getByRole('button', { name: /deshabilitar/i })).toBeInTheDocument();
  });

  test('el dropdown muestra solo las acciones aplicables para cada estado', () => {
    asAdmin();
    render(<UsuariosTable {...sesion} usuarios={[mockPendiente]} />);

    fireEvent.click(screen.getAllByRole('button', { name: /acciones/i })[0]);
    expect(screen.getByRole('button', { name: /reenviar/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /deshabilitar/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /reactivar/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /eliminar/i })).toBeInTheDocument();
  });

  test('admin NO ve botón "Deshabilitar" para su propia fila', () => {
    // Admin is logged in as user_1, so their own row should not show Deshabilitar
    asAdmin('user_1');
    render(<UsuariosTable {...sesion} usuarios={[mockActivo]} />);

    fireEvent.click(screen.getAllByRole('button', { name: /acciones/i })[0]);
    expect(screen.queryByRole('button', { name: /deshabilitar/i })).not.toBeInTheDocument();
  });

  test('éxito en deshabilitar muestra toast y cierra modal', async () => {
    asAdmin();
    render(<UsuariosTable {...sesion} usuarios={[mockActivo]} />);

    fireEvent.click(screen.getAllByRole('button', { name: /acciones/i })[0]);
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
    render(<UsuariosTable {...sesion} usuarios={[mockDeshabilitado]} />);

    fireEvent.click(screen.getAllByRole('button', { name: /acciones/i })[0]);
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
    render(<UsuariosTable {...sesion} usuarios={[mockActivo]} />);

    fireEvent.click(screen.getAllByRole('button', { name: /acciones/i })[0]);
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
