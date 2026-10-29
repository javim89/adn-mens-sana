import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'

// El rol sale de la membresía del club activo (contexto), no de Clerk.
vi.mock('@/lib/tenant/contexto', async () =>
  (await import('@/test-utils/tenant')).moduloContextoMock(),
)

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

import AppLayout from '../layout'
import { mockContexto, setContexto, CLUB_TEST } from '@/test-utils/tenant'
import type { AppRole } from '@/lib/roles'

function comoRol(rol: AppRole) {
  setContexto(mockContexto(rol))
}

describe('AppLayout: nav según el rol de la membresía', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('admin sees 4 nav items', async () => {
    comoRol('admin')

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
    comoRol('responsable_viandas')

    const result = await AppLayout({ children: <div /> })
    render(result)

    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Viandas')).toBeInTheDocument()
    expect(screen.queryByText('Deportistas')).not.toBeInTheDocument()
    expect(screen.queryByText('Convocatorias')).not.toBeInTheDocument()
    expect(screen.queryByText('Usuarios')).not.toBeInTheDocument()
  })

  it('roles outside the module do not see Viandas', async () => {
    comoRol('entrenador')

    const result = await AppLayout({ children: <div /> })
    render(result)

    expect(screen.getByText('Convocatorias')).toBeInTheDocument()
    expect(screen.queryByText('Viandas')).not.toBeInTheDocument()
  })

  it('pasa el club activo al Sidebar', async () => {
    comoRol('admin')

    const result = await AppLayout({ children: <div /> })
    const { container } = render(result)

    expect(container.querySelector('aside')).toHaveAttribute('data-club-id', CLUB_TEST.id)
  })

  it('sin club accesible redirige a /bienvenida', async () => {
    setContexto(null)

    await expect(AppLayout({ children: <div /> })).rejects.toThrow('NEXT_REDIRECT:/bienvenida')
  })
})
