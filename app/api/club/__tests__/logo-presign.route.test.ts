import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/tenant/contexto', async () =>
  (await import('@/test-utils/tenant')).moduloContextoMock(),
);

vi.mock('@/lib/s3', () => ({
  createLogoUploadUrl: vi.fn(),
}));

import { createLogoUploadUrl } from '@/lib/s3';
import { POST } from '../logo/presign/route';
import { CLUB_TEST, mockContexto, setContexto } from '@/test-utils/tenant';
import type { AppRole } from '@/lib/roles';

function makeRequest(body: unknown, contentType = 'application/vnd.api+json') {
  return new Request('http://localhost/api/club/logo/presign', {
    method: 'POST',
    headers: { 'Content-Type': contentType },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

function presignBody(attributes: Record<string, unknown>, type = 'logo-upload') {
  return { data: { type, attributes } };
}

const PNG_OK = { contentType: 'image/png', size: 1024 };

describe('POST /api/club/logo/presign', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setContexto(mockContexto('admin'));
    vi.mocked(createLogoUploadUrl).mockResolvedValue({
      uploadUrl: 'https://s3.example/put',
      key: `clubes/${CLUB_TEST.id}/logo/0b8e7c1a-4f2d-4c1e-9a3b-123456789abc.png`,
    });
  });

  it('401 sin sesión', async () => {
    setContexto(null);
    const res = await POST(makeRequest(presignBody(PNG_OK)));
    expect(res.status).toBe(401);
    expect(createLogoUploadUrl).not.toHaveBeenCalled();
  });

  it.each<AppRole>(['entrenador', 'medico', 'social', 'responsable_viandas'])('403 para %s', async (rol) => {
    setContexto(mockContexto(rol));
    const res = await POST(makeRequest(presignBody(PNG_OK)));
    expect(res.status).toBe(403);
    expect(createLogoUploadUrl).not.toHaveBeenCalled();
  });

  it('admin: 200 con uploadUrl y key, firmados para el club de la sesión', async () => {
    const res = await POST(makeRequest(presignBody(PNG_OK)));
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('application/vnd.api+json');
    const body = await res.json();
    expect(body.data.type).toBe('logo-upload');
    expect(body.data.attributes.uploadUrl).toBe('https://s3.example/put');
    expect(createLogoUploadUrl).toHaveBeenCalledWith({ size: 1024, clubId: CLUB_TEST.id });
  });

  it('el clubId del body se ignora: siempre el de la sesión', async () => {
    await POST(makeRequest(presignBody({ ...PNG_OK, clubId: 'otro_club' })));
    expect(createLogoUploadUrl).toHaveBeenCalledWith({ size: 1024, clubId: CLUB_TEST.id });
  });

  it.each(['image/svg+xml', 'image/jpeg', 'image/webp'])('422 para %s (solo PNG)', async (contentType) => {
    const res = await POST(makeRequest(presignBody({ ...PNG_OK, contentType })));
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.errors[0].source.pointer).toBe('/data/attributes/contentType');
    expect(createLogoUploadUrl).not.toHaveBeenCalled();
  });

  it.each([0, 2 * 1024 * 1024 + 1, 1.5])('422 para size=%s', async (size) => {
    const res = await POST(makeRequest(presignBody({ ...PNG_OK, size })));
    expect(res.status).toBe(422);
    expect(createLogoUploadUrl).not.toHaveBeenCalled();
  });

  it('422 con otro type de recurso', async () => {
    const res = await POST(makeRequest(presignBody(PNG_OK, 'foto-upload')));
    expect(res.status).toBe(422);
  });

  it('415 sin content-type JSON:API', async () => {
    const res = await POST(makeRequest(presignBody(PNG_OK), 'application/json'));
    expect(res.status).toBe(415);
  });

  it('400 con JSON inválido', async () => {
    const res = await POST(makeRequest('{no'));
    expect(res.status).toBe(400);
  });

  it('500 si S3 falla', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(createLogoUploadUrl).mockRejectedValue(new Error('S3 no está configurado'));
    const res = await POST(makeRequest(presignBody(PNG_OK)));
    expect(res.status).toBe(500);
  });
});
