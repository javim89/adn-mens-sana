import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, test, expect, vi } from 'vitest';
import UsuariosPageClient from '../UsuariosPageClient';
import type { Usuario } from '@/lib/types/usuarios';

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/lib/actions/usuarios', () => ({
  invitarUsuario: vi.fn(),
  reenviarInvitacion: vi.fn(),
  cambiarRol: vi.fn(),
  asignarLugarRetiro: vi.fn(),
  deshabilitarUsuario: vi.fn(),
  reactivarUsuario: vi.fn(),
  eliminarUsuario: vi.fn(),
}));

const USUARIOS: Usuario[] = [
  {
    id: 'user_1',
    firstName: 'Laura',
    lastName: 'Méndez',
    email: 'laura@club.org',
    rol: 'admin',
    lugarRetiro: null,
    imageUrl: null,
    lastSignInAt: null,
    createdAt: new Date('2026-01-01'),
    status: 'activo',
  },
  {
    id: 'inv_1',
    firstName: 'Sergio',
    lastName: 'Blanco',
    email: 'sergio@club.org',
    rol: 'medico',
    lugarRetiro: null,
    createdAt: new Date('2026-06-01'),
    expira: new Date('2026-07-01'),
    status: 'pendiente',
  },
];

describe('UsuariosPageClient', () => {
  test('encabezado con el título y el contador de usuarios', () => {
    render(<UsuariosPageClient usuarios={USUARIOS} rol="admin" currentUserId="user_1" />);

    expect(screen.getByRole('heading', { level: 1, name: 'Usuarios' })).toBeInTheDocument();
    expect(screen.getByText('2 usuarios')).toBeInTheDocument();
  });

  test('el admin ve "Invitar usuario" y abre el modal', async () => {
    const user = userEvent.setup();
    render(<UsuariosPageClient usuarios={USUARIOS} rol="admin" currentUserId="user_1" />);

    await user.click(screen.getByRole('button', { name: 'Invitar usuario' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  test('un no-admin no ve el botón de invitar', () => {
    render(<UsuariosPageClient usuarios={USUARIOS} rol="entrenador" currentUserId="user_2" />);

    expect(screen.queryByRole('button', { name: 'Invitar usuario' })).not.toBeInTheDocument();
  });
});
