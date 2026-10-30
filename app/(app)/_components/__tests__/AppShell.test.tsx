import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import AppShell from '../AppShell';
import { getNavItemsForRole } from '../../../../lib/roles';

// El selector de club importa la server action; acá alcanza con que no toque la DB.
vi.mock('@/lib/actions/club-activo', () => ({ cambiarClubActivo: vi.fn() }));
vi.mock('next/navigation', () => ({
  usePathname: () => '/dashboard',
}));

vi.mock('next/image', () => ({
  default: ({ alt, src, ...rest }: { alt: string; src: string; 'data-logo-bioteam'?: string }) => (
    <img alt={alt} src={src} data-logo-bioteam={rest['data-logo-bioteam']} />
  ),
}));

vi.mock('@clerk/nextjs', () => ({
  Show: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SignInButton: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SignUpButton: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  UserButton: () => <div data-testid="user-button" />,
}));

describe('AppShell', () => {
  it('renders the mobile top bar with app name', () => {
    const navItems = getNavItemsForRole('admin');
    render(<AppShell navItems={navItems}><div>content</div></AppShell>);

    // "BioTeam" appears in both the mobile header and the sidebar
    expect(screen.getAllByText('BioTeam').length).toBeGreaterThan(0);
  });

  it('shows the inverse BioTeam icon in the mobile header and in the sidebar', () => {
    const navItems = getNavItemsForRole('admin');
    const { container } = render(<AppShell navItems={navItems}><div /></AppShell>);

    const iconos = container.querySelectorAll('img[data-logo-bioteam]');
    expect(iconos).toHaveLength(2);
    iconos.forEach((icono) => {
      expect(icono).toHaveAttribute('data-logo-bioteam', 'inverso');
      expect(icono).toHaveAttribute('alt', '');
      expect(icono.getAttribute('src')).toBe('/brand/bioteam-logo-inverso.svg');
    });
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
