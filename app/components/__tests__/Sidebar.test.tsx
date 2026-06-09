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

describe('Sidebar nav items por rol', () => {
  it('admin ve los 4 items: Dashboard, Deportistas, Turnos, Usuarios', () => {
    const navItems = getNavItemsForRole('admin');
    render(<Sidebar navItems={navItems} />);

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Deportistas')).toBeInTheDocument();
    expect(screen.getByText('Turnos')).toBeInTheDocument();
    expect(screen.getByText('Usuarios')).toBeInTheDocument();
  });

  it('entrenador ve 2 items: Dashboard, Deportistas (sin Turnos ni Usuarios)', () => {
    const navItems = getNavItemsForRole('entrenador');
    render(<Sidebar navItems={navItems} />);

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Deportistas')).toBeInTheDocument();
    expect(screen.queryByText('Turnos')).not.toBeInTheDocument();
    expect(screen.queryByText('Usuarios')).not.toBeInTheDocument();
  });

  it('medico ve 3 items: Dashboard, Deportistas, Turnos (sin Usuarios)', () => {
    const navItems = getNavItemsForRole('medico');
    render(<Sidebar navItems={navItems} />);

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Deportistas')).toBeInTheDocument();
    expect(screen.getByText('Turnos')).toBeInTheDocument();
    expect(screen.queryByText('Usuarios')).not.toBeInTheDocument();
  });

  it('sin rol ve solo Dashboard (fallback)', () => {
    const navItems = getNavItemsForRole(undefined);
    render(<Sidebar navItems={navItems} />);

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.queryByText('Deportistas')).not.toBeInTheDocument();
    expect(screen.queryByText('Turnos')).not.toBeInTheDocument();
    expect(screen.queryByText('Usuarios')).not.toBeInTheDocument();
  });
});
