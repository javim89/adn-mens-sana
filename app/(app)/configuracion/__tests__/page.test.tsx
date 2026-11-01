import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/lib/tenant/contexto', async () =>
  (await import('@/test-utils/tenant')).moduloContextoMock(),
);
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock('@/lib/actions/configuracion', () => ({ guardarConfiguracionClub: vi.fn() }));

import ConfiguracionPage, { metadata } from '../page';
import { CLUB_TEST, mockContexto, setContexto } from '@/test-utils/tenant';
import type { AppRole } from '@/lib/roles';

describe('/configuracion', () => {
  it('admin: ve el form con los datos del club y su link de ingreso', async () => {
    setContexto(mockContexto('admin'));
    render(await ConfiguracionPage());
    expect(screen.getByRole('heading', { level: 1, name: 'Configuración' })).toBeInTheDocument();
    expect(screen.getByText(`Identidad y colores de ${CLUB_TEST.nombre}`)).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Nombre del club' })).toHaveValue(CLUB_TEST.nombre);
    expect((screen.getByRole('textbox', { name: 'Link de ingreso del club' }) as HTMLInputElement).value).toMatch(
      new RegExp(`/c/${CLUB_TEST.slug}/sign-in$`),
    );
    expect(screen.getByRole('button', { name: 'Elegir logo' })).toBeInTheDocument();
  });

  it('con logo guardado lo muestra con la URL versionada', async () => {
    const club = { ...CLUB_TEST, logoKey: `clubes/${CLUB_TEST.id}/logo.png` };
    setContexto(mockContexto('admin', { club }));
    const { container } = render(await ConfiguracionPage());
    const imgs = [...container.querySelectorAll('img')].map((i) => i.getAttribute('src'));
    expect(imgs.length).toBeGreaterThan(0);
    expect(imgs.every((s) => s?.startsWith(`/api/clubes/${CLUB_TEST.slug}/logo?v=`))).toBe(true);
    expect(screen.getByRole('button', { name: 'Cambiar logo' })).toBeInTheDocument();
  });

  it.each<AppRole>(['entrenador', 'medico', 'social', 'responsable_viandas'])('%s: redirige a /dashboard', async (rol) => {
    setContexto(mockContexto(rol));
    await expect(ConfiguracionPage()).rejects.toThrow('NEXT_REDIRECT:/dashboard');
  });

  it('sin club: redirige a /bienvenida', async () => {
    setContexto(null);
    await expect(ConfiguracionPage()).rejects.toThrow('NEXT_REDIRECT:/bienvenida');
  });

  it('título de la sección', () => {
    expect(metadata.title).toBe('Configuración');
  });
});
