import { describe, it, expect } from 'vitest';
import { urlDelSitio } from '@/lib/seo/sitio';

const env = (vars: Record<string, string>) => vars as unknown as NodeJS.ProcessEnv;

describe('urlDelSitio', () => {
  it('usa NEXT_PUBLIC_APP_URL cuando está', () => {
    const url = urlDelSitio(env({ NEXT_PUBLIC_APP_URL: 'https://bioteam.com.ar', URL: 'https://netlify.app' }));
    expect(url).toBeInstanceOf(URL);
    expect(url.origin).toBe('https://bioteam.com.ar');
  });

  it('normaliza espacios y la / final', () => {
    const url = urlDelSitio(env({ NEXT_PUBLIC_APP_URL: '  https://bioteam.com.ar/  ' }));
    expect(url.href).toBe('https://bioteam.com.ar/');
    expect(new URL('/sitemap.xml', url).href).toBe('https://bioteam.com.ar/sitemap.xml');
  });

  it('con NEXT_PUBLIC_APP_URL vacía cae a URL de Netlify', () => {
    const url = urlDelSitio(env({ NEXT_PUBLIC_APP_URL: '', URL: 'https://bioteam.netlify.app' }));
    expect(url.origin).toBe('https://bioteam.netlify.app');
  });

  it('con un valor inválido pasa al fallback sin tirar', () => {
    expect(urlDelSitio(env({ NEXT_PUBLIC_APP_URL: 'no es una url', URL: 'https://bioteam.netlify.app' })).origin).toBe(
      'https://bioteam.netlify.app',
    );
    expect(urlDelSitio(env({ NEXT_PUBLIC_APP_URL: 'ftp://bioteam.com.ar', URL: '::' })).origin).toBe(
      'http://localhost:3000',
    );
  });

  it('sin nada devuelve localhost:3000', () => {
    expect(urlDelSitio(env({})).origin).toBe('http://localhost:3000');
  });
});
