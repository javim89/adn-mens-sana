import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/lib/tenant/contexto', async () =>
  (await import('@/test-utils/tenant')).moduloContextoMock(),
);

import ConfiguracionPage, { metadata } from '../page';
import { CLUB_TEST, mockContexto, setContexto } from '@/test-utils/tenant';
import type { AppRole } from '@/lib/roles';

describe('/configuracion', () => {
  it('admin: ve la pantalla con el nombre del club', async () => {
    setContexto(mockContexto('admin'));
    render(await ConfiguracionPage());
    expect(screen.getByRole('heading', { level: 1, name: 'Configuración' })).toBeInTheDocument();
    expect(screen.getByText(new RegExp(CLUB_TEST.nombre))).toBeInTheDocument();
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
