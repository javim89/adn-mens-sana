// @vitest-environment node

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { NextRequest } from 'next/server';

const { mockBranding, mockLeer } = vi.hoisted(() => ({ mockBranding: vi.fn(), mockLeer: vi.fn() }));

vi.mock('@/lib/tenant/clubes', () => ({ getBrandingPublico: mockBranding }));
vi.mock('@/lib/s3', async () => {
  const real = await vi.importActual<typeof import('@/lib/s3')>('@/lib/s3');
  return { keyLogoEsDelClub: real.keyLogoEsDelClub, leerObjeto: mockLeer };
});

import { GET as getLogo } from '../[slug]/logo/route';
import { GET as getIcono } from '../[slug]/icono/route';
import { versionTema } from '@/lib/branding/tema';

const PNG = readFileSync(join(process.cwd(), 'public/brand/bioteam-logo.png'));
const FIRMA_PNG = [0x89, 0x50, 0x4e, 0x47];

const CLUB = {
  id: 'club_a',
  nombre: 'Club de Gimnasia y Esgrima La Plata',
  slug: 'club-a',
  logoKey: 'clubes/club_a/logo/0b8e7c1a-4f2d-4c1e-9a3b-123456789abc.png',
  colorPrimario: null,
  colorSecundario: null,
  colorAcento: null,
};

function objeto(bytes: Buffer = PNG) {
  return {
    body: new Response(new Uint8Array(bytes)).body!,
    contentType: 'image/png',
    contentLength: bytes.length,
  };
}

const req = (path: string) => new NextRequest(`http://localhost${path}`);
const ctx = (slug: string) => ({ params: Promise.resolve({ slug }) });

beforeEach(() => {
  vi.clearAllMocks();
  mockBranding.mockResolvedValue(CLUB);
  mockLeer.mockImplementation(async () => objeto());
});

describe('GET /api/clubes/[slug]/logo', () => {
  it('sirve el PNG del club con nosniff y CSP', async () => {
    const res = await getLogo(req('/api/clubes/club-a/logo'), ctx('club-a'));
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('image/png');
    expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect(res.headers.get('Content-Security-Policy')).toBe("default-src 'none'");
    expect(res.headers.get('Content-Length')).toBe(String(PNG.length));
    expect(Buffer.from(await res.arrayBuffer()).equals(PNG)).toBe(true);
    expect(mockBranding).toHaveBeenCalledWith('club-a');
    expect(mockLeer).toHaveBeenCalledWith(CLUB.logoKey);
  });

  it('cache immutable con ?v= de la versión actual', async () => {
    const res = await getLogo(req(`/api/clubes/club-a/logo?v=${versionTema(CLUB)}`), ctx('club-a'));
    expect(res.headers.get('Cache-Control')).toBe('public, max-age=31536000, immutable');
  });

  it.each(['', '?v=vieja'])('cache corto sin ?v= o con una versión vieja (%s)', async (qs) => {
    const res = await getLogo(req(`/api/clubes/club-a/logo${qs}`), ctx('club-a'));
    expect(res.headers.get('Cache-Control')).toBe('public, max-age=300');
  });

  it('acepta la key legacy del escudo de Gimnasia', async () => {
    mockBranding.mockResolvedValue({ ...CLUB, id: 'club_gimnasia_lp', logoKey: 'clubes/club_gimnasia_lp/logo.png' });
    const res = await getLogo(req('/api/clubes/gimnasia-la-plata/logo'), ctx('gimnasia-la-plata'));
    expect(res.status).toBe(200);
  });

  it('404 si el club no existe o está desactivado', async () => {
    mockBranding.mockResolvedValue(null);
    const res = await getLogo(req('/api/clubes/no-existe/logo'), ctx('no-existe'));
    expect(res.status).toBe(404);
    expect(mockLeer).not.toHaveBeenCalled();
  });

  it('404 si el club no tiene logo', async () => {
    mockBranding.mockResolvedValue({ ...CLUB, logoKey: null });
    const res = await getLogo(req('/api/clubes/club-a/logo'), ctx('club-a'));
    expect(res.status).toBe(404);
  });

  it('404 si la key guardada es de otro club (no se sirve un objeto ajeno)', async () => {
    mockBranding.mockResolvedValue({ ...CLUB, logoKey: 'clubes/club_b/logo/0b8e7c1a-4f2d-4c1e-9a3b-123456789abc.png' });
    const res = await getLogo(req('/api/clubes/club-a/logo'), ctx('club-a'));
    expect(res.status).toBe(404);
    expect(mockLeer).not.toHaveBeenCalled();
  });

  it('404 si el objeto no está en S3', async () => {
    mockLeer.mockResolvedValue(null);
    const res = await getLogo(req('/api/clubes/club-a/logo'), ctx('club-a'));
    expect(res.status).toBe(404);
  });

  it('502 sin cache si S3 falla', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mockLeer.mockRejectedValue(new Error('denied'));
    const res = await getLogo(req('/api/clubes/club-a/logo'), ctx('club-a'));
    expect(res.status).toBe(502);
    expect(res.headers.get('Cache-Control')).toBe('no-store');
  });
});

describe('GET /api/clubes/[slug]/icono', () => {
  async function pngDe(res: Response) {
    const bytes = new Uint8Array(await res.arrayBuffer());
    expect(Array.from(bytes.slice(0, 4))).toEqual(FIRMA_PNG);
    // Ancho y alto del IHDR (big endian, bytes 16–23).
    const vista = new DataView(bytes.buffer, bytes.byteOffset);
    return { ancho: vista.getUint32(16), alto: vista.getUint32(20) };
  }

  it.each([32, 180])('con logo: PNG de %ipx', async (tam) => {
    const res = await getIcono(req(`/api/clubes/club-a/icono?tam=${tam}&v=${versionTema(CLUB)}`), ctx('club-a'));
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('image/png');
    expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect(res.headers.get('Cache-Control')).toBe('public, max-age=31536000, immutable');
    await expect(pngDe(res)).resolves.toEqual({ ancho: tam, alto: tam });
    expect(mockLeer).toHaveBeenCalledWith(CLUB.logoKey);
  });

  it('sin logo: iniciales sobre el primario, sin leer S3', async () => {
    mockBranding.mockResolvedValue({ ...CLUB, logoKey: null });
    const res = await getIcono(req('/api/clubes/club-a/icono?tam=32'), ctx('club-a'));
    expect(res.status).toBe(200);
    await expect(pngDe(res)).resolves.toEqual({ ancho: 32, alto: 32 });
    expect(mockLeer).not.toHaveBeenCalled();
  });

  it('sin ?tam= usa 32', async () => {
    const res = await getIcono(req('/api/clubes/club-a/icono'), ctx('club-a'));
    await expect(pngDe(res)).resolves.toEqual({ ancho: 32, alto: 32 });
  });

  it('si S3 falla cae a las iniciales y no cachea', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mockLeer.mockRejectedValue(new Error('denied'));
    const res = await getIcono(req(`/api/clubes/club-a/icono?tam=180&v=${versionTema(CLUB)}`), ctx('club-a'));
    expect(res.status).toBe(200);
    expect(res.headers.get('Cache-Control')).toBe('no-store');
    await expect(pngDe(res)).resolves.toEqual({ ancho: 180, alto: 180 });
  });

  it.each(['64', 'abc', '0'])('400 con tam=%s', async (tam) => {
    const res = await getIcono(req(`/api/clubes/club-a/icono?tam=${tam}`), ctx('club-a'));
    expect(res.status).toBe(400);
    expect(mockBranding).not.toHaveBeenCalled();
  });

  it('404 si el club no existe', async () => {
    mockBranding.mockResolvedValue(null);
    const res = await getIcono(req('/api/clubes/no-existe/icono?tam=32'), ctx('no-existe'));
    expect(res.status).toBe(404);
  });
});
