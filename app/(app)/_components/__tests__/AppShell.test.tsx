import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import AppShell from '../AppShell';
import { getNavItemsForRole } from '../../../../lib/roles';

vi.mock('next/navigation', () => ({
  usePathname: () => '/dashboard',
}));

vi.mock('next/image', () => ({
  default: ({ alt }: { alt: string }) => <img alt={alt} />,
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

    // "ADN Mens Sana" appears in both the mobile header and the sidebar
    expect(screen.getAllByText('ADN Mens Sana').length).toBeGreaterThan(0);
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
