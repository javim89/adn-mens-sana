import { describe, test, expect, vi, beforeEach } from 'vitest';

const { mockPrisma, mockCookieSet } = vi.hoisted(() => ({
  mockPrisma: {
    membresia: { findFirst: vi.fn(), findMany: vi.fn() },
    superadmin: { findUnique: vi.fn() },
    club: { findFirst: vi.fn() },
  },
  mockCookieSet: vi.fn(),
}));

vi.mock('@/lib/db', () => ({ prisma: mockPrisma }));
vi.mock('next/headers', () => ({ cookies: async () => ({ set: mockCookieSet }) }));
vi.mock('../contexto', () => ({ CLUB_COOKIE: 'bt_club' }));

import { getMisClubes, puedeEntrarAlClub, guardarClubActivo } from '../clubes';

beforeEach(() => {
  vi.clearAllMocks();
  mockPrisma.membresia.findFirst.mockResolvedValue(null);
  mockPrisma.superadmin.findUnique.mockResolvedValue(null);
  mockPrisma.club.findFirst.mockResolvedValue(null);
});

describe('puedeEntrarAlClub', () => {
  test('miembro activo de un club activo: sí, sin consultar superadmins', async () => {
    mockPrisma.membresia.findFirst.mockResolvedValue({ id: 'mem_1' });
    await expect(puedeEntrarAlClub('user_1', 'club_a')).resolves.toBe(true);
    expect(mockPrisma.membresia.findFirst).toHaveBeenCalledWith({
      where: { userId: 'user_1', clubId: 'club_a', activo: true, club: { activo: true } },
      select: { id: true },
    });
    expect(mockPrisma.superadmin.findUnique).not.toHaveBeenCalled();
  });

  test('no miembro ni superadmin: no', async () => {
    await expect(puedeEntrarAlClub('user_1', 'club_b')).resolves.toBe(false);
    expect(mockPrisma.club.findFirst).not.toHaveBeenCalled();
  });

  test('superadmin a un club activo del que no es miembro: sí', async () => {
    mockPrisma.superadmin.findUnique.mockResolvedValue({ userId: 'user_staff' });
    mockPrisma.club.findFirst.mockResolvedValue({ id: 'club_b' });
    await expect(puedeEntrarAlClub('user_staff', 'club_b')).resolves.toBe(true);
    expect(mockPrisma.club.findFirst).toHaveBeenCalledWith({
      where: { id: 'club_b', activo: true },
      select: { id: true },
    });
  });

  test('superadmin a un club inexistente o desactivado: no', async () => {
    mockPrisma.superadmin.findUnique.mockResolvedValue({ userId: 'user_staff' });
    await expect(puedeEntrarAlClub('user_staff', 'club_x')).resolves.toBe(false);
  });
});

describe('getMisClubes', () => {
  test('devuelve los clubes de las membresías activas en clubes activos', async () => {
    mockPrisma.membresia.findMany.mockResolvedValue([
      { club: { id: 'club_a', nombre: 'A', slug: 'a' } },
      { club: { id: 'club_b', nombre: 'B', slug: 'b' } },
    ]);
    await expect(getMisClubes('user_1')).resolves.toEqual([
      { id: 'club_a', nombre: 'A', slug: 'a' },
      { id: 'club_b', nombre: 'B', slug: 'b' },
    ]);
    expect(mockPrisma.membresia.findMany.mock.calls[0][0].where).toEqual({
      userId: 'user_1',
      activo: true,
      club: { activo: true },
    });
  });
});

describe('guardarClubActivo', () => {
  test('cookie httpOnly, sameSite lax, un año', async () => {
    await guardarClubActivo('club_a');
    expect(mockCookieSet).toHaveBeenCalledWith('bt_club', 'club_a', {
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
    });
  });
});
