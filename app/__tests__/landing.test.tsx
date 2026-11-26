import { render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockClerk = vi.hoisted(() => ({ auth: vi.fn() }));
vi.mock('@clerk/nextjs/server', () => mockClerk);

import Home, { metadata } from '../page';
import { ICONOS_BIOTEAM } from '@/lib/branding/iconos-bioteam';
import { CONTACTO_HREF } from '../_landing/contacto';
import { AUDIENCIA_BIOTEAM, PREGUNTA_QUE_ES_BIOTEAM, QUE_ES_BIOTEAM } from '@/lib/seo/producto';

async function renderHome(userId: string | null) {
  mockClerk.auth.mockResolvedValue({ userId });
  render(await Home());
}

beforeEach(() => {
  mockClerk.auth.mockReset();
});

describe('Landing pública (/)', () => {
  it('declara los íconos de BioTeam (el root layout es neutro)', () => {
    expect(metadata.icons).toBe(ICONOS_BIOTEAM);
  });

  it('el H1 lleva la keyword del título y el claim del hero', async () => {
    await renderHome(null);
    const h1s = screen.getAllByRole('heading', { level: 1 });
    expect(h1s).toHaveLength(1);
    expect(h1s[0]).toHaveAccessibleName(
      'Software de gestión para clubes deportivos Todo tu club, en una sola pantalla',
    );
  });

  it('el nav enlaza a /funcionalidades', async () => {
    await renderHome(null);
    const nav = screen.getByRole('navigation', { name: 'Principal' });
    expect(within(nav).getByRole('link', { name: 'Funcionalidades' })).toHaveAttribute('href', '/funcionalidades');
  });

  it('el footer enlaza a las 10 funcionalidades y al índice', async () => {
    await renderHome(null);
    const footer = screen.getByRole('contentinfo');
    const hrefs = within(footer)
      .getAllByRole('link')
      .map((a) => a.getAttribute('href'))
      .filter((h) => h?.startsWith('/funcionalidades'));
    expect(hrefs).toHaveLength(11);
    expect(hrefs).toContain('/funcionalidades');
    expect(hrefs).toContain('/funcionalidades/branding-del-club');
  });

  it('sin sesión, los CTAs dicen "Ingresar" y llevan a /sign-in', async () => {
    await renderHome(null);
    const ctas = screen.getAllByRole('link', { name: /ingresar/i });
    expect(ctas.length).toBeGreaterThan(0);
    ctas.forEach((cta) => expect(cta).toHaveAttribute('href', '/sign-in'));
    expect(screen.queryByRole('link', { name: /ir al panel/i })).not.toBeInTheDocument();
  });

  it('con sesión, los CTAs dicen "Ir al panel" y llevan a /dashboard', async () => {
    await renderHome('user_1');
    const ctas = screen.getAllByRole('link', { name: /ir al panel/i });
    expect(ctas.length).toBeGreaterThan(0);
    ctas.forEach((cta) => expect(cta).toHaveAttribute('href', '/dashboard'));
    expect(screen.queryByRole('link', { name: /^ingresar/i })).not.toBeInTheDocument();
  });

  it('el CTA de contacto usa la constante única CONTACTO_HREF', async () => {
    await renderHome(null);
    screen
      .getAllByRole('link', { name: /contact/i })
      .forEach((link) => expect(link).toHaveAttribute('href', CONTACTO_HREF));
  });

  it('el contacto es WhatsApp y todos sus links abren en una pestaña nueva', async () => {
    await renderHome(null);
    expect(CONTACTO_HREF).toMatch(/^https:\/\/wa\.me\/5492216230592\?text=/);
    const links = screen.getAllByRole('link').filter((link) => link.getAttribute('href') === CONTACTO_HREF);
    // Nav, hero, funcionalidades, CTA final y footer.
    expect(links.length).toBeGreaterThanOrEqual(5);
    links.forEach((link) => {
      expect(link).toHaveAttribute('target', '_blank');
      expect(link.getAttribute('rel')).toContain('noopener');
    });
  });

  it('lista los módulos reales del panel', async () => {
    await renderHome(null);
    const seccion = screen.getByRole('region', { name: /todo el seguimiento del deportista/i });
    const nombres = within(seccion)
      .getAllByRole('heading', { level: 3 })
      .map((h) => h.textContent);
    expect(nombres).toEqual([
      'Deportistas',
      'Seguimientos',
      'Turnos',
      'Presentismo',
      'Convocatorias',
      'Viandas',
      'Calendario',
      'Insights',
    ]);
  });

  it('cada módulo enlaza a su página de funcionalidad, y hay un link a todas', async () => {
    await renderHome(null);
    const seccion = screen.getByRole('region', { name: /todo el seguimiento del deportista/i });
    const hrefs = within(seccion)
      .getAllByRole('heading', { level: 3 })
      .map((h) => h.closest('a')?.getAttribute('href'));
    expect(hrefs).toEqual([
      '/funcionalidades/ficha-del-deportista',
      '/funcionalidades/seguimientos-medicos',
      '/funcionalidades/turnos',
      '/funcionalidades/presentismo',
      '/funcionalidades/convocatorias',
      '/funcionalidades/viandas',
      '/funcionalidades/calendario',
      '/funcionalidades/insights',
    ]);
    expect(within(seccion).getByRole('link', { name: 'Ver todas las funcionalidades' })).toHaveAttribute(
      'href',
      '/funcionalidades',
    );
  });

  it('entre el H1 y el primer H2 del DOM no hay headings (las demos no suman outline)', async () => {
    await renderHome(null);
    const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'));
    const iH1 = headings.findIndex((h) => h.tagName === 'H1');
    expect(headings[iH1 + 1]?.tagName).toBe('H2');
  });

  it('las cards de producto son decorativas: aria-hidden + inert, sin nada enfocable', async () => {
    await renderHome(null);
    const cards = screen.getByTestId('hero-cards');
    expect(cards).toHaveAttribute('aria-hidden', 'true');
    expect(cards).toHaveAttribute('inert');
    // Fuera del árbol de accesibilidad: la barra de triage (role="img") no aparece.
    expect(screen.queryByRole('img', { name: /rojo: 6/i })).not.toBeInTheDocument();
    // Ningún link de las cards apunta a una ruta protegida.
    cards.querySelectorAll('a').forEach((a) => expect(a.getAttribute('href')).toBe('#'));
  });

  it('muestra la sección de funcionalidades con las 4 features en orden', async () => {
    await renderHome(null);
    const seccion = screen.getByRole('region', { name: /del dato a la decisión/i });
    expect(seccion).toHaveAttribute('id', 'funcionalidades');
    // El h3 tiene botón (lg+) y título estático (< lg); jsdom no aplica CSS y ve los dos.
    const titulos = Array.from(seccion.querySelectorAll('h3 [data-titulo-movil]')).map((t) => t.textContent);
    expect(titulos).toEqual(['Insights', 'Seguimientos', 'Convocatorias', 'Deportistas']);
    expect(within(seccion).getAllByRole('heading', { level: 3 })).toHaveLength(4);
  });

  it('las tres secciones viejas ya no están', async () => {
    await renderHome(null);
    [
      'Detectá a tiempo quién necesita apoyo',
      'Todas las miradas sobre el mismo deportista',
      'Tableros sobre los datos de tu club',
    ].forEach((titulo) => expect(screen.queryByRole('heading', { name: titulo })).not.toBeInTheDocument());
  });

  it('las demos de funcionalidades son decorativas y no linkean a rutas protegidas', async () => {
    await renderHome(null);
    const demos = screen.getByTestId('seccion-funcionalidades').querySelectorAll('[data-demo]');
    expect(demos).toHaveLength(4);
    demos.forEach((demo) => {
      expect(demo).toHaveAttribute('aria-hidden', 'true');
      expect(demo).toHaveAttribute('inert');
      demo.querySelectorAll('a').forEach((a) => expect(a.getAttribute('href')).toBe('#'));
    });
  });

  it('el pill del hero lleva a la sección de funcionalidades', async () => {
    await renderHome(null);
    expect(screen.getByRole('link', { name: /tableros de insights/i })).toHaveAttribute('href', '#funcionalidades');
  });

  it('muestra los clubes que confían, con el escudo de Gimnasia como único club', async () => {
    await renderHome(null);
    const seccion = screen.getByRole('region', { name: /clubes que confían en nosotros/i });
    const escudos = within(seccion).getAllByRole('img');
    expect(escudos).toHaveLength(1);
    expect(escudos[0]).toHaveAttribute('alt', 'Escudo de Club de Gimnasia y Esgrima La Plata');
    expect(within(seccion).getByText('Club de Gimnasia y Esgrima La Plata')).toBeInTheDocument();
  });

  it('la marca del producto es BioTeam, sin el escudo ni el nombre de Gimnasia', async () => {
    await renderHome(null);
    const nav = screen.getByRole('banner');
    expect(within(nav).getByText('BioTeam')).toBeInTheDocument();
    expect(within(nav).getByRole('link', { name: 'BioTeam, inicio' })).toBeInTheDocument();
    expect(nav.textContent).not.toMatch(/gimnasia/i);
    // El ícono de BioTeam es decorativo: no suma un img al árbol de accesibilidad.
    expect(within(nav).queryByRole('img')).not.toBeInTheDocument();
    const iconoNav = nav.querySelector('img[data-logo-bioteam]');
    expect(iconoNav).toHaveAttribute('data-logo-bioteam', 'normal');
    expect(iconoNav).toHaveAttribute('alt', '');
    expect(iconoNav?.getAttribute('src')).not.toContain('logo.png');

    const footer = screen.getByRole('contentinfo');
    expect(footer.textContent).not.toMatch(/gimnasia/i);
    expect(within(footer).queryByRole('img')).not.toBeInTheDocument();
    expect(footer.querySelector('img[data-logo-bioteam]')).toHaveAttribute('data-logo-bioteam', 'inverso');
  });

  it('muestra "¿Qué es BioTeam?" como H2 con la respuesta completa, después del hero', async () => {
    await renderHome(null);
    const seccion = screen.getByRole('region', { name: PREGUNTA_QUE_ES_BIOTEAM });
    expect(seccion).toHaveAttribute('data-testid', 'seccion-que-es');
    expect(within(seccion).getByRole('heading', { level: 2, name: PREGUNTA_QUE_ES_BIOTEAM })).toHaveAttribute(
      'id',
      'que-es-titulo',
    );
    expect(within(seccion).getByText(QUE_ES_BIOTEAM)).toBeVisible();
    const roles = within(seccion)
      .getAllByRole('listitem')
      .map((li) => li.textContent);
    expect(roles).toEqual([...AUDIENCIA_BIOTEAM]);
    // Sin Reveal: el texto no depende de una animación para verse.
    expect(seccion.querySelector('[data-reveal]')).toBeNull();
    // Va antes de la franja de clubes.
    const clubes = screen.getByTestId('seccion-clubes');
    expect(seccion.compareDocumentPosition(clubes) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('Gimnasia solo aparece en la franja de clubes', async () => {
    await renderHome(null);
    const seccion = screen.getByRole('region', { name: /clubes que confían en nosotros/i });
    const fuera = document.body.cloneNode(true) as HTMLElement;
    fuera.querySelector(`[aria-labelledby="${seccion.getAttribute('aria-labelledby')}"]`)?.remove();
    expect(fuera.textContent).not.toMatch(/gimnasia/i);
  });
});
