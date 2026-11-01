import { describe, it, expect, vi } from 'vitest';
import { appearanceLogin, destinoLoginDelClub, rutaLoginDelClub } from '../login';
import { TEMA_BIOTEAM, TEMA_NEUTRO } from '../tokens';

describe('appearanceLogin', () => {
  it('usa el primario del tema', () => {
    const a = appearanceLogin(TEMA_NEUTRO, { pantalla: 'sign-in', ocultarHeader: false });
    expect(a.variables.colorPrimary).toBe(TEMA_NEUTRO.primario);
  });

  it('en el login de un club oculta el header y el logo de Clerk', () => {
    const a = appearanceLogin(TEMA_BIOTEAM, { pantalla: 'sign-up', ocultarHeader: true });
    expect(a.elements).toEqual({ header: { display: 'none' }, logoBox: { display: 'none' } });
  });

  it('el sign-in nunca muestra el link de registro (solo se entra por invitación)', () => {
    expect(appearanceLogin(TEMA_NEUTRO, { pantalla: 'sign-in', ocultarHeader: false }).elements).toEqual({
      footerAction: { display: 'none' },
    });
    expect(appearanceLogin(TEMA_NEUTRO, { pantalla: 'sign-up', ocultarHeader: false }).elements).toEqual({});
  });
});

describe('rutaLoginDelClub', () => {
  it('arma la ruta interna /c/<slug>/<pantalla>', () => {
    expect(rutaLoginDelClub('gimnasia-la-plata', 'sign-in')).toBe('/c/gimnasia-la-plata/sign-in');
    expect(rutaLoginDelClub('club-prueba', 'entrar')).toBe('/c/club-prueba/entrar');
  });
});

describe('destinoLoginDelClub', () => {
  const existe = vi.fn(async (slug: string) => (slug === 'club-prueba' ? { slug } : null));

  it('sin cookie no redirige', async () => {
    await expect(destinoLoginDelClub('sign-in', undefined, existe)).resolves.toBeNull();
  });

  it('con la cookie de un club activo manda a su login, con el query original', async () => {
    await expect(destinoLoginDelClub('sign-in', 'club-prueba', existe)).resolves.toBe('/c/club-prueba/sign-in');
    await expect(
      destinoLoginDelClub('sign-up', 'club-prueba', existe, { __clerk_ticket: 'tk', x: ['1', '2'] }),
    ).resolves.toBe('/c/club-prueba/sign-up?__clerk_ticket=tk&x=1&x=2');
  });

  it('un club que no existe o está desactivado no redirige (si no, el login daría 404)', async () => {
    await expect(destinoLoginDelClub('sign-in', 'no-existe', existe)).resolves.toBeNull();
  });

  it('una cookie con un slug inválido no llega a la base', async () => {
    existe.mockClear();
    await expect(destinoLoginDelClub('sign-in', '../../evil', existe)).resolves.toBeNull();
    await expect(destinoLoginDelClub('sign-in', 'https://evil.com', existe)).resolves.toBeNull();
    expect(existe).not.toHaveBeenCalled();
  });
});
