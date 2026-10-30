import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

const { mockBranding, mockNotFound, mockSignIn, mockSignUp } = vi.hoisted(() => ({
  mockBranding: vi.fn(),
  mockNotFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
  mockSignIn: vi.fn(() => null),
  mockSignUp: vi.fn(() => null),
}));

vi.mock('@/lib/tenant/clubes', () => ({ getBrandingPublico: mockBranding }));
vi.mock('next/navigation', () => ({ notFound: mockNotFound }));
vi.mock('@clerk/nextjs', () => ({ SignIn: mockSignIn, SignUp: mockSignUp }));

import LoginClubLayout, { generateMetadata } from '../layout';
import SignInClubPage from '../sign-in/[[...sign-in]]/page';
import SignUpClubPage from '../sign-up/[[...sign-up]]/page';

const CLUB = {
  id: 'club_a',
  nombre: 'Club Atlético Ejemplo',
  slug: 'club-ejemplo',
  logoKey: 'clubes/club_a/logo/abc.png',
  colorPrimario: '#8b0000',
  colorSecundario: null,
  colorAcento: null,
};
const params = (slug: string) => Promise.resolve({ slug });

beforeEach(() => {
  vi.clearAllMocks();
  mockBranding.mockImplementation(async (slug: string) => (slug === CLUB.slug ? CLUB : null));
});

describe('layout del login de un club', () => {
  it('muestra el nombre y el logo del club, con su tema, y nada de BioTeam', async () => {
    const { container } = render(await LoginClubLayout({ children: <div>form</div>, params: params(CLUB.slug) }));
    expect(screen.getByRole('heading', { name: /Ingresá a Club Atlético Ejemplo/ })).toBeInTheDocument();
    expect(container.querySelector('img[data-logo-club]')?.getAttribute('src')).toMatch(
      /^\/api\/clubes\/club-ejemplo\/logo\?v=/,
    );
    expect(container.querySelector('style[data-tema-club]')?.textContent).toContain('--club-primario:#8b0000;');
    expect(container.textContent).not.toMatch(/bioteam/i);
    expect(screen.getByText('form')).toBeInTheDocument();
  });

  it('un club inexistente o desactivado da 404', async () => {
    await expect(LoginClubLayout({ children: null, params: params('no-existe') })).rejects.toThrow('NEXT_NOT_FOUND');
  });

  it('generateMetadata: título e íconos del club', async () => {
    const meta = await generateMetadata({ params: params(CLUB.slug) });
    expect(meta.title).toBe('Ingresar · Club Atlético Ejemplo');
    expect(JSON.stringify(meta.icons)).toContain('/api/clubes/club-ejemplo/icono?tam=32');
    await expect(generateMetadata({ params: params('no-existe') })).resolves.toEqual({});
  });
});

describe('páginas de Clerk del club', () => {
  it('sign-in: path routing bajo /c/<slug>, siempre termina en /c/<slug>/entrar', async () => {
    const el = await SignInClubPage({ params: params(CLUB.slug) });
    expect(el.type).toBe(mockSignIn);
    expect(el.props).toMatchObject({
      routing: 'path',
      path: '/c/club-ejemplo/sign-in',
      signUpUrl: '/c/club-ejemplo/sign-up',
      forceRedirectUrl: '/c/club-ejemplo/entrar',
    });
    expect(el.props.appearance.variables.colorPrimary).toBe('#8b0000');
    expect(el.props.appearance.elements.header).toEqual({ display: 'none' });
  });

  it('sign-up: también termina en entrar', async () => {
    const el = await SignUpClubPage({ params: params(CLUB.slug) });
    expect(el.type).toBe(mockSignUp);
    expect(el.props).toMatchObject({
      routing: 'path',
      path: '/c/club-ejemplo/sign-up',
      signInUrl: '/c/club-ejemplo/sign-in',
      forceRedirectUrl: '/c/club-ejemplo/entrar',
    });
  });

  it('un club inexistente da 404', async () => {
    await expect(SignInClubPage({ params: params('no-existe') })).rejects.toThrow('NEXT_NOT_FOUND');
    await expect(SignUpClubPage({ params: params('no-existe') })).rejects.toThrow('NEXT_NOT_FOUND');
  });
});
