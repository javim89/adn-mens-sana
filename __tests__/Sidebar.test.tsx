import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';

// Mock next/navigation before importing Sidebar
vi.mock('next/navigation', () => ({ usePathname: () => '/dashboard' }));
// Mock next/image
vi.mock('next/image', () => ({ default: ({ alt, ...props }: { alt: string; [key: string]: unknown }) => <img alt={alt} {...props} /> }));
// Mock @clerk/nextjs (Sidebar uses Show, UserButton, etc.)
vi.mock('@clerk/nextjs', () => ({
  Show: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SignInButton: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SignUpButton: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  UserButton: () => <div data-testid="user-button" />,
}));

import React from 'react';
import Sidebar from '../app/components/Sidebar';
import type { NavItem } from '../lib/roles';

const items: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: 'LayoutDashboard' },
  { href: '/deportistas', label: 'Deportistas', icon: 'Users' },
];

test('renders nav items without serialization error', () => {
  const serializationErrors: string[] = [];
  const consoleSpy = vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
    const msg = typeof args[0] === 'string' ? args[0] : '';
    // Only capture React serialization / plain-object boundary errors
    if (msg.includes('plain objects') || msg.includes('cannot be passed')) {
      serializationErrors.push(msg);
    }
  });
  render(<Sidebar navItems={items} />);
  expect(screen.getByText('Dashboard')).toBeInTheDocument();
  expect(screen.getByText('Deportistas')).toBeInTheDocument();
  expect(serializationErrors).toHaveLength(0);
  consoleSpy.mockRestore();
});

test('icon field is a plain string (not a React component object)', () => {
  items.forEach(item => {
    expect(typeof item.icon).toBe('string');
    // Ensure no $$typeof property (which React component objects carry)
    expect((item.icon as unknown as { $$typeof?: unknown }).$$typeof).toBeUndefined();
  });
});
