import { describe, test, expect, vi, beforeEach } from 'vitest';

const { mockAuth, mockPuede, mockGuardar, mockRedirect } = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockPuede: vi.fn(),
  mockGuardar: vi.fn(),
  mockRedirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
}));

vi.mock('@clerk/nextjs/server', () => ({ auth: mockAuth }));
vi.mock('next/navigation', () => ({ redirect: mockRedirect }));
vi.mock('@/lib/tenant/clubes', () => ({ puedeEntrarAlClub: mockPuede, guardarClubActivo: mockGuardar }));

import { cambiarClubActivo } from '../club-activo';

beforeEach(() => {
  vi.clearAllMocks();
  mockAuth.mockResolvedValue({ userId: 'user_1' });
  mockPuede.mockResolvedValue(true);
});

describe('cambiarClubActivo', () => {
  test('con acceso (miembro o superadmin) guarda la cookie y redirige a /dashboard', async () => {
    await expect(cambiarClubActivo('club_b')).rejects.toThrow('NEXT_REDIRECT:/dashboard');
    expect(mockPuede).toHaveBeenCalledWith('user_1', 'club_b');
    expect(mockGuardar).toHaveBeenCalledWith('club_b');
  });

  test('sin acceso al club: error y no toca la cookie', async () => {
    mockPuede.mockResolvedValue(false);
    await expect(cambiarClubActivo('club_ajeno')).resolves.toEqual({
      ok: false,
      error: 'No tenés acceso a ese club',
    });
    expect(mockGuardar).not.toHaveBeenCalled();
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  test('sin sesión: no autorizado', async () => {
    mockAuth.mockResolvedValue({ userId: null });
    await expect(cambiarClubActivo('club_b')).resolves.toEqual({ ok: false, error: 'No autorizado' });
    expect(mockPuede).not.toHaveBeenCalled();
  });

  test('id vacío: club inválido', async () => {
    await expect(cambiarClubActivo('')).resolves.toEqual({ ok: false, error: 'Club inválido' });
  });
});
