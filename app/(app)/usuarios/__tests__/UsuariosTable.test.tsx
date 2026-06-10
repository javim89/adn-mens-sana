import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import UsuariosTable from '../UsuariosTable';
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
}));

import { useUser } from '@clerk/nextjs';
import { reenviarInvitacion } from '@/lib/actions/usuarios';

const mockActivo: Usuario = {
  id: 'user_1',
  firstName: 'Laura',
  lastName: 'Méndez',
  email: 'l.mendez@gimnasia.org.ar',
  rol: 'admin',
  lastSignInAt: new Date('2026-06-08'),
  createdAt: new Date('2026-01-01'),
  status: 'activo',
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
    user: { publicMetadata: { role: 'entrenador' } },
    isLoaded: true,
  } as ReturnType<typeof useUser>);
}

function asAdmin() {
  vi.mocked(useUser).mockReturnValue({
    user: { publicMetadata: { role: 'admin' } },
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
