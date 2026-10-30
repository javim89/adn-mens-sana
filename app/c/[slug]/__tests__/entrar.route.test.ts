import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockAuth, mockRedirect, mockAceptar, mockBranding, mockPuede, mockGuardar } = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockRedirect: vi.fn((destino: string) => {
    throw new Error(`NEXT_REDIRECT:${destino}`);
  }),
  mockAceptar: vi.fn(),
  mockBranding: vi.fn(),
  mockPuede: vi.fn(),
  mockGuardar: vi.fn(),
}));

vi.mock('@clerk/nextjs/server', () => ({ auth: mockAuth }));
vi.mock('next/navigation', () => ({ redirect: mockRedirect }));
vi.mock('@/lib/tenant/invitaciones', () => ({ aceptarInvitacionesPendientes: mockAceptar }));
vi.mock('@/lib/tenant/clubes', () => ({
  getBrandingPublico: mockBranding,
  puedeEntrarAlClub: mockPuede,
  guardarClubActivo: mockGuardar,
}));

import { GET } from '../entrar/route';

const llamar = (slug = 'club-prueba') => GET(new Request('http://localhost/c/x/entrar'), { params: Promise.resolve({ slug }) });

beforeEach(() => {
  vi.clearAllMocks();
  mockAuth.mockResolvedValue({ userId: 'user_1' });
  mockAceptar.mockResolvedValue({ clubIds: [] });
  mockBranding.mockImplementation(async (slug: string) => (slug === 'club-prueba' ? { id: 'club_p', slug } : null));
  mockPuede.mockResolvedValue(true);
});

describe('GET /c/<slug>/entrar', () => {
  it('sin sesión vuelve al login del club', async () => {
    mockAuth.mockResolvedValue({ userId: null });
    await expect(llamar()).rejects.toThrow('NEXT_REDIRECT:/c/club-prueba/sign-in');
    expect(mockGuardar).not.toHaveBeenCalled();
  });

  it('acepta las invitaciones y, si puede entrar, deja el club activo y va a /dashboard', async () => {
    await expect(llamar()).rejects.toThrow('NEXT_REDIRECT:/dashboard');
    expect(mockAceptar).toHaveBeenCalledWith('user_1');
    expect(mockPuede).toHaveBeenCalledWith('user_1', 'club_p');
    expect(mockGuardar).toHaveBeenCalledWith('club_p');
    // Primero se aceptan las invitaciones: el acceso puede venir justo de ahí.
    expect(mockAceptar.mock.invocationCallOrder[0]).toBeLessThan(mockPuede.mock.invocationCallOrder[0]);
  });

  it('sin acceso al club no guarda nada y va a /bienvenida', async () => {
    mockPuede.mockResolvedValue(false);
    await expect(llamar()).rejects.toThrow('NEXT_REDIRECT:/bienvenida');
    expect(mockGuardar).not.toHaveBeenCalled();
  });

  it('un club inexistente o desactivado va a /bienvenida', async () => {
    await expect(llamar('no-existe')).rejects.toThrow('NEXT_REDIRECT:/bienvenida');
    expect(mockPuede).not.toHaveBeenCalled();
  });

  it('si aceptar invitaciones falla, sigue igual', async () => {
    mockAceptar.mockRejectedValue(new Error('Clerk caído'));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    await expect(llamar()).rejects.toThrow('NEXT_REDIRECT:/dashboard');
  });
});
