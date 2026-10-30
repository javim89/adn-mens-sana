import { describe, test, expect, vi, beforeEach } from 'vitest';

const { mockPrisma, mockCookieSet, mockCookieDelete } = vi.hoisted(() => ({
  mockPrisma: {
    membresia: { findFirst: vi.fn(), findMany: vi.fn() },
    superadmin: { findUnique: vi.fn() },
    club: { findFirst: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
  },
  mockCookieSet: vi.fn(),
  mockCookieDelete: vi.fn(),
}));

vi.mock('@/lib/db', () => ({ prisma: mockPrisma }));
vi.mock('next/headers', () => ({ cookies: async () => ({ set: mockCookieSet, delete: mockCookieDelete }) }));
vi.mock('../contexto', () => ({ CLUB_COOKIE: 'bt_club' }));

import {
  getMisClubes,
  puedeEntrarAlClub,
  guardarClubActivo,
  getBrandingPublico,
  actualizarBrandingDelClub,
} from '../clubes';

beforeEach(() => {
  vi.clearAllMocks();
  mockPrisma.membresia.findFirst.mockResolvedValue(null);
  mockPrisma.superadmin.findUnique.mockResolvedValue(null);
  mockPrisma.club.findFirst.mockResolvedValue(null);
  mockPrisma.club.findUnique.mockResolvedValue(null);
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

const OPCIONES_COOKIE = {
  httpOnly: true,
  sameSite: 'lax',
  secure: false,
  path: '/',
  maxAge: 60 * 60 * 24 * 365,
};

describe('guardarClubActivo', () => {
  test('cookie httpOnly, sameSite lax, un año', async () => {
    await guardarClubActivo('club_a');
    expect(mockCookieSet).toHaveBeenCalledWith('bt_club', 'club_a', OPCIONES_COOKIE);
  });

  test('también guarda el slug del club en bt_club_slug', async () => {
    mockPrisma.club.findUnique.mockResolvedValue({ slug: 'club-a' });
    await guardarClubActivo('club_a');
    expect(mockPrisma.club.findUnique).toHaveBeenCalledWith({ where: { id: 'club_a' }, select: { slug: true } });
    expect(mockCookieSet).toHaveBeenCalledWith('bt_club_slug', 'club-a', OPCIONES_COOKIE);
  });

  test('si el club no existe, borra bt_club_slug', async () => {
    mockPrisma.club.findUnique.mockResolvedValue(null);
    await guardarClubActivo('club_x');
    expect(mockCookieDelete).toHaveBeenCalledWith('bt_club_slug');
    expect(mockCookieSet).not.toHaveBeenCalledWith('bt_club_slug', expect.anything(), expect.anything());
  });
});

describe('getBrandingPublico', () => {
  test('busca solo clubes activos por slug', async () => {
    const club = { id: 'club_a', nombre: 'A', slug: 'a', logoKey: null, colorPrimario: null, colorSecundario: null, colorAcento: null };
    mockPrisma.club.findFirst.mockResolvedValue(club);
    await expect(getBrandingPublico('a')).resolves.toEqual(club);
    const arg = mockPrisma.club.findFirst.mock.calls[0][0];
    expect(arg.where).toEqual({ slug: 'a', activo: true });
    expect(arg.select).toEqual({
      id: true,
      nombre: true,
      slug: true,
      logoKey: true,
      colorPrimario: true,
      colorSecundario: true,
      colorAcento: true,
    });
  });

  test('club inexistente o desactivado: null', async () => {
    await expect(getBrandingPublico('no-existe')).resolves.toBeNull();
  });

  test('slug vacío: null sin consultar', async () => {
    await expect(getBrandingPublico('')).resolves.toBeNull();
    expect(mockPrisma.club.findFirst).not.toHaveBeenCalled();
  });
});

describe('actualizarBrandingDelClub', () => {
  test('actualiza solo el club pedido, con los colores normalizados', async () => {
    mockPrisma.club.update.mockResolvedValue({ id: 'club_a' });
    await actualizarBrandingDelClub('club_a', {
      nombre: '  Club A  ',
      colorPrimario: '#8B0000',
      colorSecundario: 'abc',
      colorAcento: null,
    });
    const arg = mockPrisma.club.update.mock.calls[0][0];
    expect(arg.where).toEqual({ id: 'club_a' });
    expect(arg.data).toEqual({
      nombre: 'Club A',
      colorPrimario: '#8b0000',
      colorSecundario: '#aabbcc',
      colorAcento: null,
    });
  });

  test('los campos ausentes no se tocan', async () => {
    mockPrisma.club.update.mockResolvedValue({ id: 'club_a' });
    await actualizarBrandingDelClub('club_a', { logoKey: 'clubes/club_a/logo/x.png' });
    expect(mockPrisma.club.update.mock.calls[0][0].data).toEqual({ logoKey: 'clubes/club_a/logo/x.png' });
  });

  test('un color inválido tira y no escribe', async () => {
    await expect(actualizarBrandingDelClub('club_a', { colorPrimario: 'red;}body{' })).rejects.toThrow(/Color inválido/);
    expect(mockPrisma.club.update).not.toHaveBeenCalled();
  });

  test('sin clubId tira', async () => {
    await expect(actualizarBrandingDelClub('', { nombre: 'X' })).rejects.toThrow();
    expect(mockPrisma.club.update).not.toHaveBeenCalled();
  });
});
