import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

const { mockAuth, mockEsSuperadmin, mockNotFound } = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockEsSuperadmin: vi.fn(),
  mockNotFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
}));

vi.mock('@clerk/nextjs/server', () => ({ auth: mockAuth }));
vi.mock('@clerk/nextjs', () => ({ UserButton: () => <div data-testid="user-button" /> }));
vi.mock('next/navigation', () => ({ notFound: mockNotFound }));
vi.mock('@/lib/tenant/clubes', () => ({ esSuperadmin: mockEsSuperadmin }));

import SuperadminLayout from '../layout';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('SuperadminLayout: guard', () => {
  it('superadmin: renderiza el panel', async () => {
    mockAuth.mockResolvedValue({ userId: 'user_staff' });
    mockEsSuperadmin.mockResolvedValue(true);

    render(await SuperadminLayout({ children: <p>contenido</p> }));

    expect(mockEsSuperadmin).toHaveBeenCalledWith('user_staff');
    expect(screen.getByText('contenido')).toBeInTheDocument();
    expect(screen.getByText('Superadmin')).toBeInTheDocument();
  });

  it('usuario común: 404', async () => {
    mockAuth.mockResolvedValue({ userId: 'user_comun' });
    mockEsSuperadmin.mockResolvedValue(false);

    await expect(SuperadminLayout({ children: <p>contenido</p> })).rejects.toThrow('NEXT_NOT_FOUND');
  });

  it('sin sesión: 404 sin consultar la tabla de superadmins', async () => {
    mockAuth.mockResolvedValue({ userId: null });

    await expect(SuperadminLayout({ children: <p>contenido</p> })).rejects.toThrow('NEXT_NOT_FOUND');
    expect(mockEsSuperadmin).not.toHaveBeenCalled();
  });
});
