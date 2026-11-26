import { describe, it, expect, afterEach, vi } from 'vitest';
import robots from '@/app/robots';
import sitemap from '@/app/sitemap';

describe('robots.txt y sitemap.xml', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('robots permite todo salvo /api/ y apunta al sitemap absoluto', () => {
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://bioteam.com.ar/');
    const r = robots();
    expect(r.rules).toEqual({ userAgent: '*', allow: '/', disallow: ['/api/'] });
    expect(r.sitemap).toBe('https://bioteam.com.ar/sitemap.xml');
  });

  it('el sitemap lista solo la landing', () => {
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://bioteam.com.ar');
    const s = sitemap();
    expect(s).toHaveLength(1);
    expect(s[0]).toMatchObject({ url: 'https://bioteam.com.ar/', changeFrequency: 'monthly', priority: 1 });
  });
});
