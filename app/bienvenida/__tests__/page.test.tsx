import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

const { mockAuth, mockCurrentUser, mockAceptar, mockRedirect } = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockCurrentUser: vi.fn(),
  mockAceptar: vi.fn(),
  mockRedirect: vi.fn((destino: string) => {
    throw new Error(`NEXT_REDIRECT:${destino}`);
  }),
}));

vi.mock('@clerk/nextjs/server', () => ({ auth: mockAuth, currentUser: mockCurrentUser }));
vi.mock('@clerk/nextjs', () => ({
  SignOutButton: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock('next/navigation', () => ({ redirect: mockRedirect }));
vi.mock('@/lib/tenant/invitaciones', () => ({ aceptarInvitacionesPendientes: mockAceptar }));
vi.mock('@/lib/tenant/contexto', async () =>
  (await import('@/test-utils/tenant')).moduloContextoMock(null),
);
vi.mock('@/app/components/LogoBioTeam', () => ({ default: () => <span data-testid="logo" /> }));

import BienvenidaPage from '../page';
import { mockContexto, setContexto } from '@/test-utils/tenant';

beforeEach(() => {
  vi.clearAllMocks();
  setContexto(null);
  mockAuth.mockResolvedValue({ userId: 'user_nuevo' });
  mockAceptar.mockResolvedValue({ clubIds: [] });
  mockCurrentUser.mockResolvedValue({
    primaryEmailAddress: { emailAddress: 'nuevo@club.com' },
    emailAddresses: [{ emailAddress: 'nuevo@club.com' }],
  });
});

describe('/bienvenida', () => {
  it('sin sesión manda a /sign-in sin tocar invitaciones', async () => {
    mockAuth.mockResolvedValue({ userId: null });

    await expect(BienvenidaPage()).rejects.toThrow('NEXT_REDIRECT:/sign-in');
    expect(mockAceptar).not.toHaveBeenCalled();
  });

  it('acepta las invitaciones pendientes y, si con eso hay club, sigue a /dashboard', async () => {
    mockAceptar.mockImplementation(async () => {
      setContexto(mockContexto('medico', { userId: 'user_nuevo' }));
      return { clubIds: ['club_test'] };
    });

    await expect(BienvenidaPage()).rejects.toThrow('NEXT_REDIRECT:/dashboard');
    expect(mockAceptar).toHaveBeenCalledWith('user_nuevo');
  });

  it('un usuario que ya tenía club pasa directo a /dashboard', async () => {
    setContexto(mockContexto('admin'));
    await expect(BienvenidaPage()).rejects.toThrow('NEXT_REDIRECT:/dashboard');
  });

  it('sin ningún club muestra el aviso, el mail con el que entró y el botón de salir', async () => {
    render(await BienvenidaPage());

    expect(screen.getByRole('heading', { name: /no tenés acceso a ningún club/i })).toBeInTheDocument();
    expect(screen.getByText('nuevo@club.com')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cerrar sesión/i })).toBeInTheDocument();
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it('si aceptar invitaciones falla, igual muestra la pantalla en vez de romper', async () => {
    mockAceptar.mockRejectedValue(new Error('Clerk caído'));
    vi.spyOn(console, 'error').mockImplementation(() => {});

    render(await BienvenidaPage());

    expect(screen.getByRole('heading', { name: /no tenés acceso/i })).toBeInTheDocument();
  });
});
