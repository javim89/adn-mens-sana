import { describe, it, expect, afterEach, vi } from 'vitest';
import robots from '@/app/robots';
import sitemap from '@/app/sitemap';
import { ACTUALIZADO, PAGINAS_FUNCIONALIDAD, rutaFuncionalidad } from '@/app/_landing/funcionalidades/catalogo';
import { AGENTES_IA } from '@/lib/seo/agentes-ia';

describe('robots.txt y sitemap.xml', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('robots permite todo salvo /api/ y apunta al sitemap absoluto', () => {
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://bioteam.com.ar/');
    const r = robots();
    const reglas = [r.rules].flat();
    expect(reglas[0]).toEqual({ userAgent: '*', allow: '/', disallow: ['/api/'] });
    expect(r.sitemap).toBe('https://bioteam.com.ar/sitemap.xml');
  });

  it('robots tiene un grupo explícito por cada crawler de IA, con las mismas reglas que *', () => {
    expect(AGENTES_IA).toEqual([
      'OAI-SearchBot',
      'ChatGPT-User',
      'GPTBot',
      'PerplexityBot',
      'Perplexity-User',
      'ClaudeBot',
      'Claude-SearchBot',
      'Claude-User',
      'Google-Extended',
      'Applebot-Extended',
    ]);
    const reglas = [robots().rules].flat();
    expect(reglas).toHaveLength(AGENTES_IA.length + 1);
    expect(reglas.slice(1)).toEqual(AGENTES_IA.map((userAgent) => ({ userAgent, allow: '/', disallow: ['/api/'] })));
  });

  it('el sitemap lista la landing, el índice de funcionalidades y las 10 páginas', () => {
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://bioteam.com.ar');
    const s = sitemap();
    expect(s).toHaveLength(12);
    expect(s[0]).toMatchObject({ url: 'https://bioteam.com.ar/', changeFrequency: 'monthly', priority: 1 });
    expect(s[1]).toMatchObject({
      url: 'https://bioteam.com.ar/funcionalidades',
      changeFrequency: 'monthly',
      priority: 0.9,
    });

    const urls = s.map((e) => e.url);
    expect(new Set(urls).size).toBe(urls.length);
    expect(urls.every((u) => u.startsWith('https://bioteam.com.ar/'))).toBe(true);
    expect(urls.slice(2)).toEqual(PAGINAS_FUNCIONALIDAD.map((p) => `https://bioteam.com.ar${rutaFuncionalidad(p.slug)}`));
    for (const e of s.slice(2)) expect(e).toMatchObject({ changeFrequency: 'monthly', priority: 0.8 });
    for (const e of s) expect(e.lastModified).toBe(ACTUALIZADO);
    expect(ACTUALIZADO).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(Number.isNaN(Date.parse(ACTUALIZADO))).toBe(false);
  });
});
