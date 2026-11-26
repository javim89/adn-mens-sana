import { render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockClerk = vi.hoisted(() => ({ auth: vi.fn() }));
vi.mock('@clerk/nextjs/server', () => mockClerk);

const mockNotFound = vi.hoisted(() =>
  vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
);
vi.mock('next/navigation', () => ({ notFound: mockNotFound }));

import IndiceFuncionalidades from '../paginas/IndiceFuncionalidades';
import PaginaFuncionalidadVista from '../paginas/PaginaFuncionalidadVista';
import LandingNav from '../LandingNav';
import { ACTUALIZADO, PAGINAS_FUNCIONALIDAD, paginaPorSlug, rutaFuncionalidad } from '../funcionalidades/catalogo';
import IndicePage, { metadata as metadataIndice } from '@/app/funcionalidades/page';
import FuncionalidadPage, {
  dynamicParams,
  generateMetadata,
  generateStaticParams,
} from '@/app/funcionalidades/[slug]/page';

const pagina = paginaPorSlug('turnos')!;

type NodoLd = { '@type': string; '@id'?: string; [clave: string]: unknown } & {
  itemListElement?: unknown[];
  mainEntity?: unknown[];
};

function jsonLd(): Record<string, unknown> {
  const script = document.querySelector('script[type="application/ld+json"]');
  expect(script).not.toBeNull();
  return JSON.parse(script!.textContent ?? '');
}

beforeEach(() => {
  mockClerk.auth.mockReset();
  mockClerk.auth.mockResolvedValue({ userId: null });
  mockNotFound.mockClear();
});

describe('IndiceFuncionalidades', () => {
  it('tiene un solo H1 y una tarjeta enlazada por funcionalidad', () => {
    render(<IndiceFuncionalidades conSesion={false} />);
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    const grilla = screen.getByRole('region', { name: 'Todas las funcionalidades' });
    const hrefs = within(grilla)
      .getAllByRole('link')
      .map((a) => a.getAttribute('href'));
    expect(hrefs).toEqual(PAGINAS_FUNCIONALIDAD.map((p) => rutaFuncionalidad(p.slug)));
  });
});

describe('PaginaFuncionalidadVista', () => {
  it('tiene un solo H1, igual al del catálogo', () => {
    render(<PaginaFuncionalidadVista pagina={pagina} conSesion={false} />);
    const h1s = screen.getAllByRole('heading', { level: 1 });
    expect(h1s).toHaveLength(1);
    expect(h1s[0]).toHaveTextContent(pagina.h1);
  });

  it.each(PAGINAS_FUNCIONALIDAD.map((p) => [p.slug, p] as const))(
    '%s muestra "En pocas palabras" con su resumenRespuesta, justo después del hero',
    (_slug, p) => {
      render(<PaginaFuncionalidadVista pagina={p} conSesion={false} />);
      const resumen = screen.getByRole('region', { name: 'En pocas palabras' });
      expect(resumen).toHaveAttribute('data-testid', 'resumen-funcionalidad');
      expect(within(resumen).getByRole('heading', { level: 2, name: 'En pocas palabras' })).toBeInTheDocument();
      expect(within(resumen).getByText(p.resumenRespuesta)).toBeVisible();
      const hero = screen.getByRole('region', { name: p.h1 });
      expect(hero.nextElementSibling).toBe(resumen);
    },
  );

  it('muestra el breadcrumb Inicio → Funcionalidades → página', () => {
    render(<PaginaFuncionalidadVista pagina={pagina} conSesion={false} />);
    const ruta = screen.getByRole('navigation', { name: 'Ruta' });
    expect(within(ruta).getByRole('link', { name: 'Inicio' })).toHaveAttribute('href', '/');
    expect(within(ruta).getByRole('link', { name: 'Funcionalidades' })).toHaveAttribute('href', '/funcionalidades');
    expect(within(ruta).getByText(pagina.nombre)).toHaveAttribute('aria-current', 'page');
  });

  it('enlaza a las otras 9 funcionalidades y a todas', () => {
    render(<PaginaFuncionalidadVista pagina={pagina} conSesion={false} />);
    const seccion = screen.getByRole('region', { name: 'Otras funcionalidades' });
    const hrefs = within(seccion)
      .getAllByRole('link')
      .map((a) => a.getAttribute('href'));
    const otras = PAGINAS_FUNCIONALIDAD.filter((p) => p.slug !== pagina.slug).map((p) => rutaFuncionalidad(p.slug));
    expect(otras).toHaveLength(9);
    expect(hrefs).toEqual(['/funcionalidades', ...otras]);
    expect(hrefs).not.toContain(rutaFuncionalidad(pagina.slug));
  });

  it('las preguntas frecuentes son <details> nativos', () => {
    render(<PaginaFuncionalidadVista pagina={pagina} conSesion={false} />);
    const details = document.querySelectorAll('details');
    expect(details).toHaveLength(pagina.faqs.length);
    expect(details[0].querySelector('summary')).toHaveTextContent(pagina.faqs[0].pregunta);
  });

  it('entre el H1 y el primer H2 no hay headings de las pantallas', () => {
    render(<PaginaFuncionalidadVista pagina={pagina} conSesion={false} />);
    const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'));
    const iH1 = headings.findIndex((h) => h.tagName === 'H1');
    expect(headings[iH1 + 1]?.tagName).toBe('H2');
  });
});

describe('LandingNav', () => {
  it('enlaza a /funcionalidades, sin clase que lo oculte en mobile', () => {
    render(<LandingNav conSesion={false} />);
    const link = screen.getByRole('link', { name: 'Funcionalidades' });
    expect(link).toHaveAttribute('href', '/funcionalidades');
    expect(link.className).not.toMatch(/(^|\s)hidden(\s|$)/);
  });
});

describe('ruta /funcionalidades', () => {
  it('metadata propia: título, canonical e index', () => {
    expect(metadataIndice.title).toEqual({ absolute: 'Funcionalidades para gestionar tu club deportivo | BioTeam' });
    expect(metadataIndice.alternates?.canonical).toBe('/funcionalidades');
    expect(metadataIndice.robots).toMatchObject({ index: true });
  });

  it('emite un JSON-LD con BreadcrumbList e ItemList de las 10 páginas', async () => {
    render(await IndicePage());
    const ld = jsonLd();
    const grafo = ld['@graph'] as NodoLd[];
    expect(grafo.map((n) => n['@type'])).toEqual(['WebPage', 'BreadcrumbList', 'ItemList']);
    const [webPage, migas, lista] = grafo;
    expect(webPage['@id']).toMatch(/\/funcionalidades#webpage$/);
    expect(webPage.breadcrumb).toEqual({ '@id': migas['@id'] });
    expect(lista.itemListElement).toHaveLength(10);
    expect(lista.mainEntityOfPage).toEqual({ '@id': webPage['@id'] });
  });

  it('con sesión, el CTA del nav lleva al panel', async () => {
    mockClerk.auth.mockResolvedValue({ userId: 'user_1' });
    render(await IndicePage());
    const nav = screen.getByRole('navigation', { name: 'Principal' });
    expect(within(nav).getByRole('link', { name: 'Ir al panel' })).toHaveAttribute('href', '/dashboard');
  });
});

describe('ruta /funcionalidades/[slug]', () => {
  it('genera los 10 slugs y no acepta otros', () => {
    expect(generateStaticParams()).toEqual(PAGINAS_FUNCIONALIDAD.map((p) => ({ slug: p.slug })));
    expect(dynamicParams).toBe(false);
  });

  it('generateMetadata usa el SEO y el canonical de la página', async () => {
    const meta = await generateMetadata({ params: Promise.resolve({ slug: 'turnos' }) });
    expect(meta.title).toEqual({ absolute: pagina.seo.titulo });
    expect(meta.description).toBe(pagina.seo.descripcion);
    expect(meta.alternates?.canonical).toBe('/funcionalidades/turnos');
  });

  it('renderiza la página con JSON-LD de WebPage, breadcrumb y FAQ enlazados por @id', async () => {
    render(await FuncionalidadPage({ params: Promise.resolve({ slug: 'turnos' }) }));
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(pagina.h1);
    const grafo = jsonLd()['@graph'] as NodoLd[];
    expect(grafo.map((n) => n['@type'])).toEqual(['WebPage', 'BreadcrumbList', 'FAQPage']);
    const [webPage, migas, faq] = grafo;
    expect(webPage['@id']).toMatch(/\/funcionalidades\/turnos#webpage$/);
    expect(webPage.description).toBe(pagina.resumenRespuesta);
    expect(webPage.dateModified).toBe(ACTUALIZADO);
    expect(webPage.breadcrumb).toEqual({ '@id': migas['@id'] });
    expect(migas.itemListElement).toHaveLength(3);
    expect(faq.mainEntity).toHaveLength(pagina.faqs.length);
    expect(faq.isPartOf).toEqual({ '@id': webPage['@id'] });
  });

  it('un slug desconocido llama a notFound()', async () => {
    await expect(FuncionalidadPage({ params: Promise.resolve({ slug: 'no-existe' }) })).rejects.toThrow(
      'NEXT_NOT_FOUND',
    );
    await expect(generateMetadata({ params: Promise.resolve({ slug: 'no-existe' }) })).rejects.toThrow(
      'NEXT_NOT_FOUND',
    );
    expect(mockNotFound).toHaveBeenCalledTimes(2);
    expect(mockClerk.auth).not.toHaveBeenCalled();
  });
});
