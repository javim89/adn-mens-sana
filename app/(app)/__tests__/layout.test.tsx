import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'

// El rol sale de la membresía del club activo (contexto), no de Clerk.
vi.mock('@/lib/tenant/contexto', async () =>
  (await import('@/test-utils/tenant')).moduloContextoMock(),
)

// Las membresías cruzan clubes y se leen con el cliente base: se mockean.
const { mockGetMisClubes } = vi.hoisted(() => ({ mockGetMisClubes: vi.fn() }))
vi.mock('@/lib/tenant/clubes', () => ({ getMisClubes: mockGetMisClubes }))
vi.mock('@/lib/actions/club-activo', () => ({ cambiarClubActivo: vi.fn() }))

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

import AppLayout, { generateMetadata } from '../layout'
import { mockContexto, setContexto, CLUB_TEST } from '@/test-utils/tenant'
import type { AppRole } from '@/lib/roles'
import { versionTema } from '@/lib/branding/tema'

function comoRol(rol: AppRole) {
  setContexto(mockContexto(rol))
}

describe('AppLayout: nav según el rol de la membresía', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetMisClubes.mockResolvedValue([])
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

  it('inyecta el tema del club activo', async () => {
    setContexto(mockContexto('admin', { club: { ...CLUB_TEST, colorPrimario: '#8b0000' } }))

    const result = await AppLayout({ children: <div /> })
    const { container } = render(result)

    const style = container.querySelector('style[data-tema-club]')
    expect(style?.textContent).toContain('--club-primario:#8b0000;')
  })

  it('club sin colores: el tema es el default (BioTeam)', async () => {
    comoRol('admin')

    const result = await AppLayout({ children: <div /> })
    const { container } = render(result)

    expect(container.querySelector('style[data-tema-club]')?.textContent).toContain('--club-primario:#121a61;')
  })

  it('sin club accesible redirige a /bienvenida', async () => {
    setContexto(null)

    await expect(AppLayout({ children: <div /> })).rejects.toThrow('NEXT_REDIRECT:/bienvenida')
  })

  it('con dos membresías muestra el selector de club con las del usuario', async () => {
    comoRol('admin')
    mockGetMisClubes.mockResolvedValue([
      { id: CLUB_TEST.id, nombre: CLUB_TEST.nombre, slug: CLUB_TEST.slug },
      { id: 'club_b', nombre: 'Club B', slug: 'club-b' },
    ])

    const result = await AppLayout({ children: <div /> })
    render(result)

    expect(mockGetMisClubes).toHaveBeenCalledWith('user_test')
    expect(screen.getByLabelText('Club')).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Club B' })).toBeInTheDocument()
  })

  it('superadmin dentro de un club ajeno: link al panel y banner', async () => {
    setContexto(mockContexto('admin', { esSuperadmin: true, comoSuperadmin: true }))

    const result = await AppLayout({ children: <div /> })
    render(result)

    expect(screen.getByRole('link', { name: /superadmin · clubes/i })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent(`Estás viendo ${CLUB_TEST.nombre} como superadmin`)
  })
})

describe('AppLayout: marca del club', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetMisClubes.mockResolvedValue([])
  })

  const CLUB_CON_LOGO = { ...CLUB_TEST, logoKey: 'clubes/club_test/logo/0b8e7c1a-4f2d-4c1e-9a3b-123456789abc.png' }

  it('pasa el logo versionado y el nombre del club al shell', async () => {
    setContexto(mockContexto('admin', { club: CLUB_CON_LOGO }))

    const { container } = render(await AppLayout({ children: <div /> }))

    const logo = container.querySelector('aside img[data-logo-club]')
    expect(logo).toHaveAttribute('src', `/api/clubes/${CLUB_TEST.slug}/logo?v=${versionTema(CLUB_CON_LOGO)}`)
    expect(screen.getAllByText(CLUB_TEST.nombre).length).toBeGreaterThan(0)
    expect(container.textContent).not.toMatch(/bioteam/i)
  })

  it('el admin ve Configuración', async () => {
    comoRol('admin')
    render(await AppLayout({ children: <div /> }))
    expect(screen.getByRole('link', { name: /configuración/i })).toHaveAttribute('href', '/configuracion')
  })

  it.each<AppRole>(['entrenador', 'medico', 'social', 'responsable_viandas'])('%s no ve Configuración', async (rol) => {
    comoRol(rol)
    render(await AppLayout({ children: <div /> }))
    expect(screen.queryByRole('link', { name: /configuración/i })).not.toBeInTheDocument()
  })
})

describe('generateMetadata del layout de (app)', () => {
  it('título "%s · <Club>" e íconos del club versionados', async () => {
    const club = { ...CLUB_TEST, colorPrimario: '#8b0000' }
    setContexto(mockContexto('admin', { club }))
    const v = versionTema(club)

    const metadata = await generateMetadata()

    expect(metadata.title).toEqual({ template: `%s · ${CLUB_TEST.nombre}`, default: CLUB_TEST.nombre })
    expect(metadata.icons).toEqual({
      icon: [{ url: `/api/clubes/${CLUB_TEST.slug}/icono?tam=32&v=${v}`, sizes: '32x32', type: 'image/png' }],
      apple: [{ url: `/api/clubes/${CLUB_TEST.slug}/icono?tam=180&v=${v}`, sizes: '180x180', type: 'image/png' }],
    })
  })

  it('sin contexto no declara nada (el layout redirige)', async () => {
    setContexto(null)
    await expect(generateMetadata()).resolves.toEqual({})
  })
})
