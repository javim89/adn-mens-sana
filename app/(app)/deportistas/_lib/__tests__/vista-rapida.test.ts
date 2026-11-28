import { beforeEach, describe, expect, test, vi } from 'vitest';

const { mockContexto, mockVista } = vi.hoisted(() => ({
  mockContexto: vi.fn(),
  mockVista: vi.fn(),
}));

vi.mock('@/lib/tenant/contexto', () => ({ contextoAccion: mockContexto }));
vi.mock('@/lib/queries/deportistas', () => ({ getVistaRapidaDeportista: mockVista }));

import { obtenerVistaRapida } from '../vista-rapida';

beforeEach(() => {
  mockContexto.mockReset();
  mockVista.mockReset();
  mockVista.mockResolvedValue({});
});

describe('obtenerVistaRapida', () => {
  test('sin contexto rechaza', async () => {
    mockContexto.mockResolvedValue({ ok: false, error: 'No autorizado' });
    await expect(obtenerVistaRapida('d1')).rejects.toThrow('No autorizado');
    expect(mockVista).not.toHaveBeenCalled();
  });

  test('admin ve el próximo turno de cualquier profesional', async () => {
    mockContexto.mockResolvedValue({ ok: true, contexto: { rol: 'admin', userId: 'u_admin' } });
    await obtenerVistaRapida('d1');
    expect(mockVista).toHaveBeenCalledWith('d1', expect.any(Date), undefined);
  });

  test('un no-admin solo ve sus propios turnos', async () => {
    mockContexto.mockResolvedValue({ ok: true, contexto: { rol: 'entrenador', userId: 'u_ent' } });
    await obtenerVistaRapida('d1');
    expect(mockVista).toHaveBeenCalledWith('d1', expect.any(Date), 'u_ent');
  });
});
