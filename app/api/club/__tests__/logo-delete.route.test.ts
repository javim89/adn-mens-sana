import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/tenant/contexto', async () =>
  (await import('@/test-utils/tenant')).moduloContextoMock(),
);

const { mockDeleteFoto } = vi.hoisted(() => ({ mockDeleteFoto: vi.fn() }));
vi.mock('@/lib/s3', async () => {
  const real = await vi.importActual<typeof import('@/lib/s3')>('@/lib/s3');
  return { keyLogoBorrable: real.keyLogoBorrable, deleteFoto: mockDeleteFoto };
});

import { DELETE } from '../logo/route';
import { CLUB_TEST, mockContexto, setContexto } from '@/test-utils/tenant';
import type { AppRole } from '@/lib/roles';

const UUID = '0b8e7c1a-4f2d-4c1e-9a3b-123456789abc';
const SUBIDO = `clubes/${CLUB_TEST.id}/logo/${UUID}.png`;

const borrar = (key: string | null) =>
  DELETE(new Request(`http://localhost/api/club/logo${key === null ? '' : `?key=${encodeURIComponent(key)}`}`, { method: 'DELETE' }));

describe('DELETE /api/club/logo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setContexto(mockContexto('admin'));
  });

  it('401 sin sesión', async () => {
    setContexto(null);
    expect((await borrar(SUBIDO)).status).toBe(401);
    expect(mockDeleteFoto).not.toHaveBeenCalled();
  });

  it.each<AppRole>(['entrenador', 'medico', 'social', 'responsable_viandas'])('403 para %s', async (rol) => {
    setContexto(mockContexto(rol));
    expect((await borrar(SUBIDO)).status).toBe(403);
    expect(mockDeleteFoto).not.toHaveBeenCalled();
  });

  it('borra un logo subido del club de la sesión', async () => {
    expect((await borrar(SUBIDO)).status).toBe(204);
    expect(mockDeleteFoto).toHaveBeenCalledWith(SUBIDO);
  });

  it.each([
    ['de otro club', `clubes/otro_club/logo/${UUID}.png`],
    ['legacy', `clubes/${CLUB_TEST.id}/logo.png`],
    ['una foto de deportista', `clubes/${CLUB_TEST.id}/deportistas/${UUID}.jpg`],
    ['sin key', null],
  ])('422 para una key %s', async (_caso, key) => {
    expect((await borrar(key)).status).toBe(422);
    expect(mockDeleteFoto).not.toHaveBeenCalled();
  });

  it('409 si es el logo vigente del club', async () => {
    setContexto(mockContexto('admin', { club: { ...CLUB_TEST, logoKey: SUBIDO } }));
    expect((await borrar(SUBIDO)).status).toBe(409);
    expect(mockDeleteFoto).not.toHaveBeenCalled();
  });
});
