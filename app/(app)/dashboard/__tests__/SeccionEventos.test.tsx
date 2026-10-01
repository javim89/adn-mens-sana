import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { EventoProximo } from '@/lib/queries/dashboard';

const { getProximosEventos } = vi.hoisted(() => ({ getProximosEventos: vi.fn() }));
vi.mock('@/lib/queries/dashboard', () => ({ getProximosEventos }));

import SeccionEventos from '../_components/SeccionEventos';

const HOY = new Date('2026-09-30T00:00:00.000Z');

function evento(i: number, over: Partial<EventoProximo> = {}): EventoProximo {
  return {
    id: `e${i}`,
    fecha: new Date(`2026-10-0${i}T00:00:00.000Z`),
    categoria: `Cuarta ${i}`,
    local: 'Gimnasia',
    visitante: `Rival ${i}`,
    estado: 'PROGRAMADO',
    tieneConvocatoria: true,
    ...over,
  } as EventoProximo;
}

beforeEach(() => {
  vi.clearAllMocks();
  getProximosEventos.mockResolvedValue([
    evento(1, { tieneConvocatoria: false }),
    evento(2, { estado: 'SUSPENDIDO' }),
    evento(3),
  ]);
});

describe('SeccionEventos', () => {
  test('pide hasta 5 eventos desde hoy', async () => {
    await SeccionEventos({ hoyDb: HOY });

    expect(getProximosEventos).toHaveBeenCalledWith({ desdeHoyDb: HOY, limite: 5 });
  });

  test('el primero va destacado como próximo partido, con su fecha', async () => {
    render(await SeccionEventos({ hoyDb: HOY }));

    const destacado = screen.getByText('Próximo partido').parentElement!.parentElement!;
    expect(destacado.className).toContain('bg-[#121A61]');
    expect(destacado.textContent).toContain('Gimnasia vs. Rival 1');
    expect(destacado.textContent).toContain('JUE');
    expect(destacado.textContent).toContain('1/10');
  });

  test('"sin convocatoria" y el estado no programado se marcan', async () => {
    render(await SeccionEventos({ hoyDb: HOY }));

    expect(screen.getAllByText('sin convocatoria')).toHaveLength(1);
    expect(screen.getByText('Suspendido')).toBeInTheDocument();
  });

  test('el resto va como tiles y hay un único link al calendario', async () => {
    render(await SeccionEventos({ hoyDb: HOY }));

    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAttribute('href', '/calendario');
  });

  test('sin eventos: estado vacío sin link ni NaN', async () => {
    getProximosEventos.mockResolvedValue([]);
    const { container } = render(await SeccionEventos({ hoyDb: HOY }));

    expect(screen.getByText('No hay eventos próximos')).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(container.textContent).not.toMatch(/NaN|undefined/);
  });
});
