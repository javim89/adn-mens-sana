import { describe, test, expect, vi, beforeEach } from 'vitest';

const { mockActualizar, mockFotoExiste, mockDeleteFoto, mockRevalidate } = vi.hoisted(() => ({
  mockActualizar: vi.fn(),
  mockFotoExiste: vi.fn(),
  mockDeleteFoto: vi.fn(),
  mockRevalidate: vi.fn(),
}));

vi.mock('@/lib/tenant/contexto', async () => (await import('@/test-utils/tenant')).moduloContextoMock());
vi.mock('@/lib/tenant/clubes', () => ({ actualizarBrandingDelClub: mockActualizar }));
vi.mock('next/cache', () => ({ revalidatePath: mockRevalidate }));
vi.mock('@/lib/s3', async () => {
  // keyLogoEsDelClub y keyLogoBorrable son puras: se usan las reales.
  const real = await vi.importActual<typeof import('@/lib/s3')>('@/lib/s3');
  return {
    keyLogoEsDelClub: real.keyLogoEsDelClub,
    keyLogoBorrable: real.keyLogoBorrable,
    fotoExiste: mockFotoExiste,
    deleteFoto: mockDeleteFoto,
  };
});

import { guardarConfiguracionClub } from '../configuracion';
import { CLUB_TEST, mockContexto, setContexto } from '@/test-utils/tenant';
import type { AppRole } from '@/lib/roles';
import type { ConfiguracionClubInput } from '@/lib/types/configuracion';

const UUID = '0b9d7a52-4f0e-4c1e-9d55-7a1c2b3d4e5f';
const LOGO_NUEVO = `clubes/${CLUB_TEST.id}/logo/${UUID}.png`;
const LOGO_VIEJO = `clubes/${CLUB_TEST.id}/logo/11111111-2222-3333-4444-555555555555.png`;

const INPUT: ConfiguracionClubInput = {
  nombre: '  Club Nuevo  ',
  colorPrimario: '#0D1B5E',
  colorSecundario: null,
  colorAcento: '#ffcc00',
};

beforeEach(() => {
  vi.clearAllMocks();
  setContexto(mockContexto('admin'));
  mockActualizar.mockResolvedValue({});
  mockFotoExiste.mockResolvedValue(true);
});

describe('guardarConfiguracionClub', () => {
  test.each<AppRole>(['entrenador', 'medico', 'social', 'responsable_viandas'])('%s: acceso denegado', async (rol) => {
    setContexto(mockContexto(rol));
    expect(await guardarConfiguracionClub(INPUT)).toEqual({ ok: false, error: 'Acceso denegado' });
    expect(mockActualizar).not.toHaveBeenCalled();
  });

  test('sin sesión: no autorizado', async () => {
    setContexto(null);
    expect(await guardarConfiguracionClub(INPUT)).toEqual({ ok: false, error: 'No autorizado' });
  });

  test('guarda el club de la sesión, con el nombre recortado y los colores normalizados', async () => {
    expect(await guardarConfiguracionClub(INPUT)).toEqual({ ok: true });
    expect(mockActualizar).toHaveBeenCalledTimes(1);
    expect(mockActualizar).toHaveBeenCalledWith(CLUB_TEST.id, {
      nombre: 'Club Nuevo',
      colorPrimario: '#0d1b5e',
      colorSecundario: null,
      colorAcento: '#ffcc00',
    });
    expect(mockRevalidate).toHaveBeenCalledWith('/', 'layout');
  });

  test('un clubId ajeno en el payload se ignora: siempre ctx.clubId', async () => {
    await guardarConfiguracionClub({ ...INPUT, clubId: 'otro_club' } as ConfiguracionClubInput);
    expect(mockActualizar.mock.calls[0][0]).toBe(CLUB_TEST.id);
    expect(mockActualizar.mock.calls[0][1]).not.toHaveProperty('clubId');
  });

  test.each(['rojo', '#12345', 'red;}body{', '#gggggg'])('rechaza el hex inválido %s', async (malo) => {
    const r = await guardarConfiguracionClub({ ...INPUT, colorAcento: malo });
    expect(r).toEqual({ ok: false, error: expect.stringMatching(/acento no es un hex válido/) });
    expect(mockActualizar).not.toHaveBeenCalled();
  });

  test.each([
    ['colorPrimario', 'primario'],
    ['colorSecundario', 'secundario'],
  ] as const)('rechaza %s con contraste < 4.5 contra blanco', async (campo, nombre) => {
    const r = await guardarConfiguracionClub({ ...INPUT, [campo]: '#7fb3ff' });
    expect(r).toEqual({ ok: false, error: expect.stringContaining(`color ${nombre} tiene poco contraste`) });
    expect(mockActualizar).not.toHaveBeenCalled();
  });

  test('el acento claro se acepta (no lleva texto blanco)', async () => {
    expect(await guardarConfiguracionClub({ ...INPUT, colorAcento: '#ffee88' })).toEqual({ ok: true });
  });

  test.each([
    ['', 'El nombre tiene que tener al menos 2 caracteres'],
    [' a ', 'El nombre tiene que tener al menos 2 caracteres'],
    ['x'.repeat(121), 'El nombre no puede superar los 120 caracteres'],
  ])('valida el nombre %#', async (nombre, error) => {
    expect(await guardarConfiguracionClub({ ...INPUT, nombre })).toEqual({ ok: false, error });
  });

  test('logo nuevo del club: verifica que exista, lo asigna y borra el anterior', async () => {
    setContexto(mockContexto('admin', { club: { ...CLUB_TEST, logoKey: LOGO_VIEJO } }));
    expect(await guardarConfiguracionClub({ ...INPUT, logoKey: LOGO_NUEVO })).toEqual({ ok: true });
    expect(mockFotoExiste).toHaveBeenCalledWith(LOGO_NUEVO);
    expect(mockActualizar.mock.calls[0][1]).toMatchObject({ logoKey: LOGO_NUEVO });
    expect(mockDeleteFoto).toHaveBeenCalledWith(LOGO_VIEJO);
    expect(mockActualizar.mock.invocationCallOrder[0]).toBeLessThan(mockDeleteFoto.mock.invocationCallOrder[0]);
  });

  test.each([
    ['de otro club', `clubes/otro_club/logo/${UUID}.png`],
    ['con otro formato', `clubes/${CLUB_TEST.id}/deportistas/${UUID}.png`],
    ['con path traversal', `clubes/${CLUB_TEST.id}/../otro_club/logo.png`],
  ])('rechaza un logo %s', async (_caso, key) => {
    const r = await guardarConfiguracionClub({ ...INPUT, logoKey: key });
    expect(r).toEqual({ ok: false, error: 'El logo no es válido' });
    expect(mockFotoExiste).not.toHaveBeenCalled();
    expect(mockActualizar).not.toHaveBeenCalled();
  });

  test('rechaza un logo que no está en S3', async () => {
    mockFotoExiste.mockResolvedValue(false);
    const r = await guardarConfiguracionClub({ ...INPUT, logoKey: LOGO_NUEVO });
    expect(r).toEqual({ ok: false, error: expect.stringMatching(/No encontramos el logo/) });
    expect(mockActualizar).not.toHaveBeenCalled();
  });

  test('si S3 falla al verificar, no guarda', async () => {
    mockFotoExiste.mockRejectedValue(new Error('403'));
    const r = await guardarConfiguracionClub({ ...INPUT, logoKey: LOGO_NUEVO });
    expect(r).toEqual({ ok: false, error: expect.stringMatching(/No se pudo verificar/) });
    expect(mockActualizar).not.toHaveBeenCalled();
  });

  test('quitar el logo: lo pone en null y borra el del club', async () => {
    setContexto(mockContexto('admin', { club: { ...CLUB_TEST, logoKey: LOGO_VIEJO } }));
    expect(await guardarConfiguracionClub({ ...INPUT, logoKey: null })).toEqual({ ok: true });
    expect(mockActualizar.mock.calls[0][1]).toMatchObject({ logoKey: null });
    expect(mockDeleteFoto).toHaveBeenCalledWith(LOGO_VIEJO);
  });

  test('sin logoKey el logo no se toca ni se borra', async () => {
    setContexto(mockContexto('admin', { club: { ...CLUB_TEST, logoKey: LOGO_VIEJO } }));
    await guardarConfiguracionClub(INPUT);
    expect(mockActualizar.mock.calls[0][1]).not.toHaveProperty('logoKey');
    expect(mockDeleteFoto).not.toHaveBeenCalled();
  });

  test('el logo anterior de otro club nunca se borra', async () => {
    const ajeno = `clubes/otro_club/logo/${UUID}.png`;
    setContexto(mockContexto('admin', { club: { ...CLUB_TEST, logoKey: ajeno } }));
    expect(await guardarConfiguracionClub({ ...INPUT, logoKey: null })).toEqual({ ok: true });
    expect(mockDeleteFoto).not.toHaveBeenCalled();
  });

  test('el logo legacy del club (clubes/<id>/logo.png) se reemplaza pero nunca se borra', async () => {
    const legacy = `clubes/${CLUB_TEST.id}/logo.png`;
    setContexto(mockContexto('admin', { club: { ...CLUB_TEST, logoKey: legacy } }));
    expect(await guardarConfiguracionClub({ ...INPUT, logoKey: LOGO_NUEVO })).toEqual({ ok: true });
    expect(mockActualizar.mock.calls[0][1]).toMatchObject({ logoKey: LOGO_NUEVO });
    expect(mockDeleteFoto).not.toHaveBeenCalled();

    expect(await guardarConfiguracionClub({ ...INPUT, logoKey: null })).toEqual({ ok: true });
    expect(mockDeleteFoto).not.toHaveBeenCalled();
  });

  test('si la DB falla no borra el logo anterior ni revalida', async () => {
    setContexto(mockContexto('admin', { club: { ...CLUB_TEST, logoKey: LOGO_VIEJO } }));
    mockActualizar.mockRejectedValue(new Error('db'));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const r = await guardarConfiguracionClub({ ...INPUT, logoKey: LOGO_NUEVO });
    expect(r).toEqual({ ok: false, error: 'No se pudo guardar la configuración' });
    expect(mockDeleteFoto).not.toHaveBeenCalled();
    expect(mockRevalidate).not.toHaveBeenCalled();
  });
});
