import { render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const mockClerk = vi.hoisted(() => ({ auth: vi.fn() }));
vi.mock('@clerk/nextjs/server', () => mockClerk);

import Home from '../page';
import { ACTUALIZADO } from '../_landing/funcionalidades/catalogo';

type Nodo = { '@type': string; '@id': string; [clave: string]: unknown };

describe('JSON-LD de la home', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('emite un solo @graph con WebSite, Organization, SoftwareApplication y WebPage enlazados por @id', async () => {
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://bioteam.com.ar');
    mockClerk.auth.mockResolvedValue({ userId: null });
    const { container } = render(await Home());
    const scripts = container.querySelectorAll('script[type="application/ld+json"]');
    expect(scripts).toHaveLength(1);

    const data = JSON.parse(scripts[0].textContent ?? '');
    expect(data['@context']).toBe('https://schema.org');
    const grafo = data['@graph'] as Nodo[];
    expect(grafo.map((n) => n['@type'])).toEqual(['WebSite', 'Organization', 'SoftwareApplication', 'WebPage']);
    const [sitio, org, app, pagina] = grafo;

    expect(sitio['@id']).toBe('https://bioteam.com.ar/#website');
    expect(org['@id']).toBe('https://bioteam.com.ar/#organization');
    expect(app['@id']).toBe('https://bioteam.com.ar/#software');
    expect(pagina['@id']).toBe('https://bioteam.com.ar/#webpage');
    expect(new Set(grafo.map((n) => n['@id'])).size).toBe(4);

    expect(sitio.publisher).toEqual({ '@id': org['@id'] });
    expect(app.publisher).toEqual({ '@id': org['@id'] });
    expect(pagina.isPartOf).toEqual({ '@id': sitio['@id'] });
    expect(pagina.about).toEqual({ '@id': app['@id'] });
    expect(pagina.dateModified).toBe(ACTUALIZADO);
    expect([sitio, org, app].every((n) => n.name === 'BioTeam')).toBe(true);
  });
});
