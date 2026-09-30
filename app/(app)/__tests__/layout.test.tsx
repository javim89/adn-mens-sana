import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'

// Mock @clerk/nextjs/server — must be hoisted before the layout import
vi.mock('@clerk/nextjs/server', () => ({
  currentUser: vi.fn(),
}))

// Mock next/navigation
vi.mock('next/navigation', () => ({
  usePathname: () => '/dashboard',
}))

// Mock next/image
vi.mock('next/image', () => ({
  default: ({ alt }: { alt: string }) => <img alt={alt} />,
}))

// Mock @clerk/nextjs (used by Sidebar and AppShell)
vi.mock('@clerk/nextjs', () => ({
  Show: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SignInButton: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SignUpButton: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  UserButton: () => <div data-testid="user-button" />,
}))

// Mock @tanstack/react-query (used by Providers)
vi.mock('@tanstack/react-query', () => ({
  QueryClient: class QueryClient {},
  QueryClientProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

import { currentUser } from '@clerk/nextjs/server'
import AppLayout from '../layout'

const mockCurrentUser = currentUser as ReturnType<typeof vi.fn>

describe('AppLayout role resolution from publicMetadata', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('admin (publicMetadata.role = admin) sees 4 nav items', async () => {
    mockCurrentUser.mockResolvedValue({
      publicMetadata: { role: 'admin' },
    })

    const result = await AppLayout({ children: <div /> })
    render(result)

    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Deportistas')).toBeInTheDocument()
    expect(screen.getByText('Turnos')).toBeInTheDocument()
    expect(screen.getByText('Usuarios')).toBeInTheDocument()
  })

  // Este caso renderiza de verdad el nav item de /viandas, así que es el que
  // atrapa un ICON_MAP incompleto en Sidebar: el icono viaja como string y un
  // IconKey sin entrada en el mapa revienta en runtime, no en compilación.
  it('responsable_viandas sees Viandas and nothing beyond Dashboard', async () => {
    mockCurrentUser.mockResolvedValue({
      publicMetadata: { role: 'responsable_viandas' },
    })

    const result = await AppLayout({ children: <div /> })
    render(result)

    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Viandas')).toBeInTheDocument()
    expect(screen.queryByText('Deportistas')).not.toBeInTheDocument()
    expect(screen.queryByText('Convocatorias')).not.toBeInTheDocument()
    expect(screen.queryByText('Usuarios')).not.toBeInTheDocument()
  })

  it('roles outside the module do not see Viandas', async () => {
    mockCurrentUser.mockResolvedValue({
      publicMetadata: { role: 'entrenador' },
    })

    const result = await AppLayout({ children: <div /> })
    render(result)

    expect(screen.getByText('Convocatorias')).toBeInTheDocument()
    expect(screen.queryByText('Viandas')).not.toBeInTheDocument()
  })

  it('user without role sees only Dashboard (fallback)', async () => {
    mockCurrentUser.mockResolvedValue({
      publicMetadata: {},
    })

    const result = await AppLayout({ children: <div /> })
    render(result)

    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.queryByText('Deportistas')).not.toBeInTheDocument()
    expect(screen.queryByText('Turnos')).not.toBeInTheDocument()
    expect(screen.queryByText('Usuarios')).not.toBeInTheDocument()
  })

  it('unauthenticated (currentUser = null) sees only Dashboard', async () => {
    mockCurrentUser.mockResolvedValue(null)

    const result = await AppLayout({ children: <div /> })
    render(result)

    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.queryByText('Deportistas')).not.toBeInTheDocument()
    expect(screen.queryByText('Turnos')).not.toBeInTheDocument()
    expect(screen.queryByText('Usuarios')).not.toBeInTheDocument()
  })
})
