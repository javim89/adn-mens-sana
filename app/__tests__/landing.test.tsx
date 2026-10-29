import { render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockClerk = vi.hoisted(() => ({ auth: vi.fn() }));
vi.mock('@clerk/nextjs/server', () => mockClerk);

import Home from '../page';
import { CONTACTO_HREF } from '../_landing/contacto';

async function renderHome(userId: string | null) {
  mockClerk.auth.mockResolvedValue({ userId });
  render(await Home());
}

beforeEach(() => {
  mockClerk.auth.mockReset();
});

describe('Landing pública (/)', () => {
  it('renderiza el titular del hero', async () => {
    await renderHome(null);
    expect(screen.getByRole('heading', { level: 1, name: 'Todo tu club, en una sola pantalla' })).toBeInTheDocument();
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

  it('Gimnasia solo aparece en la franja de clubes', async () => {
    await renderHome(null);
    const seccion = screen.getByRole('region', { name: /clubes que confían en nosotros/i });
    const fuera = document.body.cloneNode(true) as HTMLElement;
    fuera.querySelector(`[aria-labelledby="${seccion.getAttribute('aria-labelledby')}"]`)?.remove();
    expect(fuera.textContent).not.toMatch(/gimnasia/i);
  });
});
