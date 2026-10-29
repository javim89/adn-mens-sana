import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@/lib/tenant/contexto', async () =>
  (await import('@/test-utils/tenant')).moduloContextoMock(),
);

vi.mock('@/lib/s3', () => ({
  createUploadUrl: vi.fn(),
}));

import { createUploadUrl } from '@/lib/s3';
import { POST } from '../foto/presign/route';
import { mockContexto, setContexto } from '@/test-utils/tenant';
import type { AppRole } from '@/lib/roles';


function makeRequest(body: unknown, contentType = 'application/vnd.api+json') {
  return new Request('http://localhost/api/deportistas/foto/presign', {
    method: 'POST',
    headers: { 'Content-Type': contentType },
    body: JSON.stringify(body),
  });
}

function presignBody(attributes: Record<string, unknown>) {
  return { data: { type: 'foto-upload', attributes } };
}

function asRole(role: string) {
  setContexto(mockContexto(role as AppRole, { userId: 'user1' }));
}

describe('POST /api/deportistas/foto/presign', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setContexto(mockContexto('admin', { userId: 'user1' }));
    asRole('admin');
  });

  it('returns 401 when not authenticated', async () => {
    setContexto(null);

    const res = await POST(makeRequest(presignBody({ contentType: 'image/png', size: 100 })));

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.errors[0].status).toBe('401');
    expect(createUploadUrl).not.toHaveBeenCalled();
  });

  it('returns 403 for the social role', async () => {
    asRole('social');

    const res = await POST(makeRequest(presignBody({ contentType: 'image/png', size: 100 })));

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.errors[0].status).toBe('403');
    expect(createUploadUrl).not.toHaveBeenCalled();
  });

  it('returns 415 when Content-Type is not JSON:API', async () => {
    const res = await POST(
      makeRequest(presignBody({ contentType: 'image/png', size: 100 }), 'application/json'),
    );

    expect(res.status).toBe(415);
  });

  it('returns 422 for a content type outside the whitelist', async () => {
    const res = await POST(makeRequest(presignBody({ contentType: 'application/pdf', size: 100 })));

    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.errors[0].source.pointer).toBe('/data/attributes/contentType');
    expect(createUploadUrl).not.toHaveBeenCalled();
  });

  it('returns 422 when the file exceeds 5 MB', async () => {
    const res = await POST(
      makeRequest(presignBody({ contentType: 'image/jpeg', size: 5 * 1024 * 1024 + 1 })),
    );

    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.errors[0].source.pointer).toBe('/data/attributes/size');
  });

  it('returns 200 with the upload url and key', async () => {
    vi.mocked(createUploadUrl).mockResolvedValue({
      uploadUrl: 'https://s3.example/put',
      key: 'deportistas/123e4567-e89b-12d3-a456-426614174000.png',
    });

    const res = await POST(makeRequest(presignBody({ contentType: 'image/png', size: 2048 })));

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('application/vnd.api+json');
    const body = await res.json();
    expect(body).toEqual({
      data: {
        type: 'foto-upload',
        attributes: {
          uploadUrl: 'https://s3.example/put',
          key: 'deportistas/123e4567-e89b-12d3-a456-426614174000.png',
        },
      },
    });
    expect(createUploadUrl).toHaveBeenCalledWith({ contentType: 'image/png', size: 2048 });
  });

  it('returns 500 without leaking details when presigning fails', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(createUploadUrl).mockRejectedValue(new Error('S3 no está configurado'));

    const res = await POST(makeRequest(presignBody({ contentType: 'image/png', size: 2048 })));

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(JSON.stringify(body)).not.toContain('S3 no está configurado');
    consoleSpy.mockRestore();
  });
});
