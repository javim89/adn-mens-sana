import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockCookieGet, mockRedirect, mockBranding, mockSignIn, mockSignUp } = vi.hoisted(() => ({
  mockCookieGet: vi.fn(),
  mockRedirect: vi.fn((destino: string) => {
    throw new Error(`NEXT_REDIRECT:${destino}`);
  }),
  mockBranding: vi.fn(),
  mockSignIn: vi.fn(() => null),
  mockSignUp: vi.fn(() => null),
}));

vi.mock('next/headers', () => ({ cookies: async () => ({ get: mockCookieGet }) }));
vi.mock('next/navigation', () => ({ redirect: mockRedirect }));
vi.mock('@/lib/tenant/clubes', () => ({ CLUB_SLUG_COOKIE: 'bt_club_slug', getBrandingPublico: mockBranding }));
vi.mock('@clerk/nextjs', () => ({ SignIn: mockSignIn, SignUp: mockSignUp }));

import SignInPage from '../sign-in/[[...sign-in]]/page';
import SignUpPage from '../sign-up/[[...sign-up]]/page';

function cookie(slug?: string) {
  mockCookieGet.mockImplementation((n: string) => (n === 'bt_club_slug' && slug ? { value: slug } : undefined));
}

beforeEach(() => {
  vi.clearAllMocks();
  mockBranding.mockImplementation(async (slug: string) => (slug === 'club-prueba' ? { slug } : null));
});

describe('/sign-in genérico', () => {
  it('sin cookie de club muestra el login neutro', async () => {
    cookie();
    const el = await SignInPage({ params: Promise.resolve({}), searchParams: Promise.resolve({}) });
    expect(el.type).toBe(mockSignIn);
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it('con la cookie del último club manda al login con su marca', async () => {
    cookie('club-prueba');
    await expect(
      SignInPage({ params: Promise.resolve({}), searchParams: Promise.resolve({ redirect_url: '/x' }) }),
    ).rejects.toThrow('NEXT_REDIRECT:/c/club-prueba/sign-in?redirect_url=%2Fx');
  });

  it('un paso intermedio del flujo de Clerk no se redirige', async () => {
    cookie('club-prueba');
    const el = await SignInPage({
      params: Promise.resolve({ 'sign-in': ['factor-one'] }),
      searchParams: Promise.resolve({}),
    });
    expect(el.type).toBe(mockSignIn);
  });

  it('con la cookie de un club que ya no existe muestra el login neutro', async () => {
    cookie('no-existe');
    const el = await SignInPage({ params: Promise.resolve({}), searchParams: Promise.resolve({}) });
    expect(el.type).toBe(mockSignIn);
  });
});

describe('/sign-up genérico', () => {
  it('con la cookie del último club manda a su alta, conservando el ticket', async () => {
    cookie('club-prueba');
    await expect(
      SignUpPage({ params: Promise.resolve({}), searchParams: Promise.resolve({ __clerk_ticket: 'tk' }) }),
    ).rejects.toThrow('NEXT_REDIRECT:/c/club-prueba/sign-up?__clerk_ticket=tk');
  });
});
