import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import Sidebar from '../Sidebar';
import { getNavItemsForRole } from '../../../lib/roles';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  usePathname: () => '/dashboard',
}));

// Mock next/image
vi.mock('next/image', () => ({
  default: ({ alt }: { alt: string }) => <img alt={alt} />,
}));

// Mock @clerk/nextjs
vi.mock('@clerk/nextjs', () => ({
  Show: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SignInButton: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SignUpButton: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  UserButton: () => <div data-testid="user-button" />,
}));

// El selector importa la server action; acá alcanza con que no toque la DB.
vi.mock('@/lib/actions/club-activo', () => ({ cambiarClubActivo: vi.fn() }));

const noop = () => {};

describe('Sidebar nav items por rol', () => {
  it('admin ve los 4 items: Dashboard, Deportistas, Turnos, Usuarios', () => {
    const navItems = getNavItemsForRole('admin');
    render(<Sidebar navItems={navItems} isOpen={false} onClose={noop} />);

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Deportistas')).toBeInTheDocument();
    expect(screen.getByText('Turnos')).toBeInTheDocument();
    expect(screen.getByText('Usuarios')).toBeInTheDocument();
  });

  it('entrenador ve 2 items: Dashboard, Deportistas (sin Turnos ni Usuarios)', () => {
    const navItems = getNavItemsForRole('entrenador');
    render(<Sidebar navItems={navItems} isOpen={false} onClose={noop} />);

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Deportistas')).toBeInTheDocument();
    expect(screen.queryByText('Turnos')).not.toBeInTheDocument();
    expect(screen.queryByText('Usuarios')).not.toBeInTheDocument();
  });

  it('medico ve 3 items: Dashboard, Deportistas, Turnos (sin Usuarios)', () => {
    const navItems = getNavItemsForRole('medico');
    render(<Sidebar navItems={navItems} isOpen={false} onClose={noop} />);

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Deportistas')).toBeInTheDocument();
    expect(screen.getByText('Turnos')).toBeInTheDocument();
    expect(screen.queryByText('Usuarios')).not.toBeInTheDocument();
  });

  it('sin rol ve solo Dashboard (fallback)', () => {
    const navItems = getNavItemsForRole(undefined);
    render(<Sidebar navItems={navItems} isOpen={false} onClose={noop} />);

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.queryByText('Deportistas')).not.toBeInTheDocument();
    expect(screen.queryByText('Turnos')).not.toBeInTheDocument();
    expect(screen.queryByText('Usuarios')).not.toBeInTheDocument();
  });

  it('kinesiologo ve 3 items: Dashboard, Deportistas, Turnos (sin Usuarios)', () => {
    const navItems = getNavItemsForRole('kinesiologo');
    render(<Sidebar navItems={navItems} isOpen={false} onClose={noop} />);

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Deportistas')).toBeInTheDocument();
    expect(screen.getByText('Turnos')).toBeInTheDocument();
    expect(screen.queryByText('Usuarios')).not.toBeInTheDocument();
  });

  it('nutricionista ve 3 items: Dashboard, Deportistas, Turnos (sin Usuarios)', () => {
    const navItems = getNavItemsForRole('nutricionista');
    render(<Sidebar navItems={navItems} isOpen={false} onClose={noop} />);

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Deportistas')).toBeInTheDocument();
    expect(screen.getByText('Turnos')).toBeInTheDocument();
    expect(screen.queryByText('Usuarios')).not.toBeInTheDocument();
  });

  it('psicologo ve 3 items: Dashboard, Deportistas, Turnos (sin Usuarios)', () => {
    const navItems = getNavItemsForRole('psicologo');
    render(<Sidebar navItems={navItems} isOpen={false} onClose={noop} />);

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Deportistas')).toBeInTheDocument();
    expect(screen.getByText('Turnos')).toBeInTheDocument();
    expect(screen.queryByText('Usuarios')).not.toBeInTheDocument();
  });

  it('cardiologo ve 3 items: Dashboard, Deportistas, Turnos (sin Usuarios)', () => {
    const navItems = getNavItemsForRole('cardiologo');
    render(<Sidebar navItems={navItems} isOpen={false} onClose={noop} />);

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Deportistas')).toBeInTheDocument();
    expect(screen.getByText('Turnos')).toBeInTheDocument();
    expect(screen.queryByText('Usuarios')).not.toBeInTheDocument();
  });
});

describe('Sidebar: club activo y superadmin', () => {
  const navItems = getNavItemsForRole('admin');
  const club = { id: 'club_a', nombre: 'Club A' };

  it('con una sola membresía no muestra el selector de club', () => {
    render(<Sidebar navItems={navItems} club={club} misClubes={[club]} />);
    expect(screen.queryByLabelText('Club')).not.toBeInTheDocument();
  });

  it('con dos membresías muestra el selector', () => {
    render(<Sidebar navItems={navItems} club={club} misClubes={[club, { id: 'club_b', nombre: 'Club B' }]} />);
    expect(screen.getByLabelText('Club')).toBeInTheDocument();
  });

  it('un superadmin ve el link al panel de clubes', () => {
    render(<Sidebar navItems={navItems} club={club} esSuperadmin />);
    expect(screen.getByRole('link', { name: /superadmin · clubes/i })).toHaveAttribute('href', '/superadmin/clubes');
  });

  it('un usuario común no ve el link de superadmin ni el banner', () => {
    render(<Sidebar navItems={navItems} club={club} />);
    expect(screen.queryByRole('link', { name: /superadmin/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('dentro de un club como superadmin muestra el banner con el nombre del club', () => {
    render(<Sidebar navItems={navItems} club={club} esSuperadmin comoSuperadmin />);
    expect(screen.getByRole('status')).toHaveTextContent('Estás viendo Club A como superadmin');
  });
});

describe('Sidebar: marca del club', () => {
  const navItems = getNavItemsForRole('admin');

  it('muestra el nombre y el logo del club, sin la marca BioTeam', () => {
    const club = { id: 'club_a', nombre: 'Club A', logoSrc: '/api/clubes/club-a/logo?v=1' };
    const { container } = render(<Sidebar navItems={navItems} club={club} />);

    expect(screen.getByText('Club A')).toBeInTheDocument();
    expect(container.querySelector('img[data-logo-club]')).toHaveAttribute('src', club.logoSrc);
    expect(container.textContent).not.toMatch(/bioteam|historia deportiva/i);
  });

  it('sin logo muestra las iniciales', () => {
    const { container } = render(<Sidebar navItems={navItems} club={{ id: 'club_a', nombre: 'River Plate' }} />);
    expect(container.querySelector('[data-iniciales-club]')).toHaveTextContent('RP');
  });
});

describe('Sidebar: link a Configuración', () => {
  const club = { id: 'club_a', nombre: 'Club A' };

  it('el admin ve Configuración', () => {
    render(<Sidebar navItems={getNavItemsForRole('admin')} club={club} puedeConfigurar />);
    expect(screen.getByRole('link', { name: /configuración/i })).toHaveAttribute('href', '/configuracion');
  });

  it.each(['entrenador', 'medico', 'social'] as const)('%s no ve Configuración', (rol) => {
    render(<Sidebar navItems={getNavItemsForRole(rol)} club={club} />);
    expect(screen.queryByRole('link', { name: /configuración/i })).not.toBeInTheDocument();
  });

  it('Configuración no es un item del nav por rol (no aparece en la demo de la landing)', () => {
    expect(getNavItemsForRole('admin').some((i) => i.href === '/configuracion')).toBe(false);
  });
});
