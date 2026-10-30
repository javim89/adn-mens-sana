import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import AppShell from '../AppShell';
import { getNavItemsForRole } from '../../../../lib/roles';

// El selector de club importa la server action; acá alcanza con que no toque la DB.
vi.mock('@/lib/actions/club-activo', () => ({ cambiarClubActivo: vi.fn() }));
vi.mock('next/navigation', () => ({
  usePathname: () => '/dashboard',
}));

vi.mock('@clerk/nextjs', () => ({
  Show: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SignInButton: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SignUpButton: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  UserButton: () => <div data-testid="user-button" />,
}));

const CLUB = { id: 'club_a', nombre: 'Club Atlético Ejemplo', logoSrc: '/api/clubes/club-a/logo?v=1' };

describe('AppShell', () => {
  it('el header mobile y el sidebar muestran el nombre del club', () => {
    const navItems = getNavItemsForRole('admin');
    render(<AppShell navItems={navItems} club={CLUB}><div>content</div></AppShell>);

    expect(screen.getAllByText(CLUB.nombre)).toHaveLength(2);
  });

  it('muestra el logo del club (decorativo) en el header mobile y en el sidebar', () => {
    const navItems = getNavItemsForRole('admin');
    const { container } = render(<AppShell navItems={navItems} club={CLUB}><div /></AppShell>);

    const logos = container.querySelectorAll('img[data-logo-club]');
    expect(logos).toHaveLength(2);
    logos.forEach((logo) => {
      expect(logo).toHaveAttribute('alt', '');
      expect(logo).toHaveAttribute('src', CLUB.logoSrc);
    });
  });

  it('sin logo muestra las iniciales del club', () => {
    const navItems = getNavItemsForRole('admin');
    const { container } = render(
      <AppShell navItems={navItems} club={{ ...CLUB, logoSrc: null }}><div /></AppShell>,
    );

    expect(container.querySelector('img')).toBeNull();
    const iniciales = container.querySelectorAll('[data-iniciales-club]');
    expect(iniciales).toHaveLength(2);
    expect(iniciales[0]).toHaveTextContent('E');
  });

  it('no aparece la marca BioTeam', () => {
    const navItems = getNavItemsForRole('admin');
    const { container } = render(<AppShell navItems={navItems} club={CLUB}><div /></AppShell>);

    expect(container.textContent).not.toMatch(/bioteam|historia deportiva/i);
    expect(container.querySelector('img[data-logo-bioteam]')).toBeNull();
  });

  it('Configuración solo con puedeConfigurar', () => {
    const navItems = getNavItemsForRole('admin');
    const { rerender } = render(<AppShell navItems={navItems} club={CLUB}><div /></AppShell>);
    expect(screen.queryByRole('link', { name: /configuración/i })).not.toBeInTheDocument();

    rerender(<AppShell navItems={navItems} club={CLUB} puedeConfigurar><div /></AppShell>);
    expect(screen.getByRole('link', { name: /configuración/i })).toHaveAttribute('href', '/configuracion');
  });

  it('does not render the Gimnasia crest', () => {
    const navItems = getNavItemsForRole('admin');
    render(<AppShell navItems={navItems}><div>content</div></AppShell>);

    expect(screen.queryByRole('img', { name: /escudo gimnasia/i })).not.toBeInTheDocument();
  });

  it('renders the hamburger button', () => {
    const navItems = getNavItemsForRole('admin');
    render(<AppShell navItems={navItems}><div>content</div></AppShell>);

    expect(screen.getByRole('button', { name: /abrir menú/i })).toBeInTheDocument();
  });

  it('renders children', () => {
    const navItems = getNavItemsForRole('admin');
    render(<AppShell navItems={navItems}><div>main content</div></AppShell>);

    expect(screen.getByText('main content')).toBeInTheDocument();
  });

  it('renders nav items in sidebar', () => {
    const navItems = getNavItemsForRole('admin');
    render(<AppShell navItems={navItems}><div /></AppShell>);

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Deportistas')).toBeInTheDocument();
  });

  it('clicking hamburger opens the sidebar (backdrop appears)', () => {
    const navItems = getNavItemsForRole('admin');
    render(<AppShell navItems={navItems}><div /></AppShell>);

    const hamburger = screen.getByRole('button', { name: /abrir menú/i });
    fireEvent.click(hamburger);

    expect(screen.getByRole('complementary')).toBeInTheDocument();
  });
});
