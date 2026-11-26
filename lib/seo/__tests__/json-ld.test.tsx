import { render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ACTUALIZADO, PAGINAS_FUNCIONALIDAD } from '@/app/_landing/funcionalidades/catalogo';
import { AUDIENCIA_BIOTEAM, QUE_ES_BIOTEAM } from '../producto';
import {
  JsonLd,
  SAME_AS,
  breadcrumb,
  faqPage,
  itemList,
  organizacion,
  serializarJsonLd,
  softwareApplication,
  webPage,
  webSite,
  type JsonLdObjeto,
} from '../json-ld';

const MALICIOSO: JsonLdObjeto = {
  '@context': 'https://schema.org',
  '@type': 'Thing',
  name: '</script><script>alert(1)</script>',
};

describe('serializarJsonLd', () => {
  it('escapa < para que </script> no cierre el tag', () => {
    const s = serializarJsonLd(MALICIOSO);
    expect(s).not.toContain('<');
    expect(s).not.toContain('</');
    expect(s).toContain('\\u003c/script>');
  });

  it('sigue siendo el mismo JSON (JSON.parse lo des-escapa)', () => {
    expect(JSON.parse(serializarJsonLd(MALICIOSO))).toEqual(MALICIOSO);
  });

  it('un array se emite como un @graph con el @context arriba', () => {
    const parseado = JSON.parse(serializarJsonLd([organizacion(), softwareApplication()]));
    expect(parseado['@context']).toBe('https://schema.org');
    expect(parseado['@graph'].map((n: { '@type': string }) => n['@type'])).toEqual([
      'Organization',
      'SoftwareApplication',
    ]);
    expect(parseado['@graph'].every((n: object) => !('@context' in n))).toBe(true);
  });
});

describe('<JsonLd>', () => {
  it('renderiza un script application/ld+json parseable y escapado', () => {
    const { container } = render(<JsonLd data={MALICIOSO} />);
    const scripts = container.querySelectorAll('script[type="application/ld+json"]');
    expect(scripts).toHaveLength(1);
    expect(scripts[0].innerHTML).not.toContain('</');
    expect(JSON.parse(scripts[0].textContent ?? '')).toEqual(MALICIOSO);
  });
});

describe('builders', () => {
  beforeEach(() => vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://bioteam.com.ar'));
  afterEach(() => vi.unstubAllEnvs());

  it('organizacion: Organization de BioTeam con @id, logo ImageObject absoluto y área servida', () => {
    expect(SAME_AS).toEqual([]);
    expect(organizacion()).toEqual({
      '@context': 'https://schema.org',
      '@type': 'Organization',
      '@id': 'https://bioteam.com.ar/#organization',
      name: 'BioTeam',
      url: 'https://bioteam.com.ar/',
      logo: {
        '@type': 'ImageObject',
        url: 'https://bioteam.com.ar/brand/bioteam-logo.png',
        width: 783,
        height: 1024,
      },
      description: QUE_ES_BIOTEAM,
      areaServed: [
        { '@type': 'Country', name: 'Argentina' },
        { '@type': 'AdministrativeArea', name: 'Latinoamérica' },
      ],
      knowsLanguage: 'es',
    });
  });

  it('organizacion: sameAs solo cuando hay perfiles', () => {
    expect(organizacion()).not.toHaveProperty('sameAs');
    expect(organizacion([]).sameAs).toBeUndefined();
    expect(organizacion(['https://www.linkedin.com/company/x']).sameAs).toEqual([
      'https://www.linkedin.com/company/x',
    ]);
  });

  it('webSite: WebSite es-AR publicado por la Organization', () => {
    expect(webSite()).toMatchObject({
      '@type': 'WebSite',
      '@id': 'https://bioteam.com.ar/#website',
      name: 'BioTeam',
      url: 'https://bioteam.com.ar/',
      inLanguage: 'es-AR',
      publisher: { '@id': 'https://bioteam.com.ar/#organization' },
    });
  });

  it('softwareApplication: audiencia, featureList del catálogo y sin offers ni ratings inventados', () => {
    const app = softwareApplication();
    expect(app).toMatchObject({
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      '@id': 'https://bioteam.com.ar/#software',
      name: 'BioTeam',
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web',
      url: 'https://bioteam.com.ar/',
      inLanguage: 'es-AR',
      publisher: { '@id': 'https://bioteam.com.ar/#organization' },
      provider: { '@id': 'https://bioteam.com.ar/#organization' },
    });
    expect(typeof app.description).toBe('string');
    expect(app.featureList).toHaveLength(10);
    expect(app.featureList).toEqual(PAGINAS_FUNCIONALIDAD.map((p) => p.nombre));
    const audiencia = app.audience as { '@type': string; audienceType: string };
    expect(audiencia['@type']).toBe('BusinessAudience');
    for (const rol of AUDIENCIA_BIOTEAM) expect(audiencia.audienceType).toContain(rol);
    for (const clave of ['offers', 'aggregateRating', 'review', 'price']) expect(app).not.toHaveProperty(clave);
  });

  it('webPage: WebPage enlazada al sitio y al software, con dateModified', () => {
    expect(
      webPage({ ruta: '/funcionalidades/turnos', nombre: 'Turnos', descripcion: 'Agenda.', conBreadcrumb: true }),
    ).toEqual({
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      '@id': 'https://bioteam.com.ar/funcionalidades/turnos#webpage',
      url: 'https://bioteam.com.ar/funcionalidades/turnos',
      name: 'Turnos',
      description: 'Agenda.',
      inLanguage: 'es-AR',
      isPartOf: { '@id': 'https://bioteam.com.ar/#website' },
      about: { '@id': 'https://bioteam.com.ar/#software' },
      dateModified: ACTUALIZADO,
      breadcrumb: { '@id': 'https://bioteam.com.ar/funcionalidades/turnos#breadcrumb' },
    });
    expect(webPage({ ruta: '/', nombre: 'BioTeam', descripcion: 'x' })).not.toHaveProperty('breadcrumb');
  });

  it('faqPage e itemList con ruta quedan enlazadas a su WebPage', () => {
    const faq = faqPage([{ pregunta: '¿Sirve?', respuesta: 'Sí.' }], '/funcionalidades/turnos');
    expect(faq['@id']).toBe('https://bioteam.com.ar/funcionalidades/turnos#faq');
    expect(faq.isPartOf).toEqual({ '@id': 'https://bioteam.com.ar/funcionalidades/turnos#webpage' });
    const lista = itemList([{ nombre: 'Turnos', ruta: '/funcionalidades/turnos' }], '/funcionalidades');
    expect(lista['@id']).toBe('https://bioteam.com.ar/funcionalidades#itemlist');
    expect(lista.mainEntityOfPage).toEqual({ '@id': 'https://bioteam.com.ar/funcionalidades#webpage' });
  });

  it('breadcrumb: BreadcrumbList con posiciones 1..n e item absoluto', () => {
    expect(
      breadcrumb([
        { nombre: 'Inicio', ruta: '/' },
        { nombre: 'Funcionalidades', ruta: '/funcionalidades' },
        { nombre: 'Turnos', ruta: '/funcionalidades/turnos' },
      ]),
    ).toEqual({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      '@id': 'https://bioteam.com.ar/funcionalidades/turnos#breadcrumb',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Inicio', item: 'https://bioteam.com.ar/' },
        { '@type': 'ListItem', position: 2, name: 'Funcionalidades', item: 'https://bioteam.com.ar/funcionalidades' },
        { '@type': 'ListItem', position: 3, name: 'Turnos', item: 'https://bioteam.com.ar/funcionalidades/turnos' },
      ],
    });
  });

  it('faqPage: FAQPage con Question y acceptedAnswer', () => {
    expect(faqPage([{ pregunta: '¿Sirve en el celular?', respuesta: 'Sí.' }])).toEqual({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        { '@type': 'Question', name: '¿Sirve en el celular?', acceptedAnswer: { '@type': 'Answer', text: 'Sí.' } },
      ],
    });
  });

  it('itemList: ItemList con ListItem (position, url absoluta, name)', () => {
    expect(
      itemList([
        { nombre: 'Turnos', ruta: '/funcionalidades/turnos' },
        { nombre: 'Viandas', ruta: '/funcionalidades/viandas' },
      ]),
    ).toEqual({
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, url: 'https://bioteam.com.ar/funcionalidades/turnos', name: 'Turnos' },
        { '@type': 'ListItem', position: 2, url: 'https://bioteam.com.ar/funcionalidades/viandas', name: 'Viandas' },
      ],
    });
  });
});
