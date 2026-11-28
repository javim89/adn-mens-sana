import { describe, test, expect, vi, beforeAll, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const { pushMock, urlActual } = vi.hoisted(() => ({ pushMock: vi.fn(), urlActual: { qs: '' } }));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
  usePathname: () => '/presentismo',
  useSearchParams: () => new URLSearchParams(urlActual.qs),
}));

import FiltrosPresentismo from '../_components/FiltrosPresentismo';

beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
  Element.prototype.scrollIntoView ??= function () {};
  Element.prototype.hasPointerCapture ??= () => false;
});

const DISCIPLINAS = [
  { id: 'disc-1', nombre: 'Handball', categorias: [{ id: 'cat-1', nombre: 'Sub-15' }] },
  { id: 'disc-2', nombre: 'Vóley', categorias: [{ id: 'cat-2', nombre: 'Mayores' }] },
];

beforeEach(() => {
  vi.clearAllMocks();
  urlActual.qs = '';
});

describe('FiltrosPresentismo', () => {
  test('la categoría se deshabilita sin disciplina', () => {
    render(<FiltrosPresentismo disciplinas={DISCIPLINAS} disciplinaId={null} categoriaId={null} tipoSesion={null} />);
    expect(screen.getByRole('button', { name: 'Categoría' })).toBeDisabled();
  });

  test('elegir disciplina la escribe en la URL, resetea categoría y página', async () => {
    const user = userEvent.setup();
    urlActual.qs = 'categoria=cat-1&page=2&tipo=FISICO';
    render(<FiltrosPresentismo disciplinas={DISCIPLINAS} disciplinaId={null} categoriaId={null} tipoSesion="FISICO" />);

    await user.click(screen.getByRole('button', { name: 'Disciplina' }));
    await user.click(screen.getByRole('option', { name: 'Vóley' }));

    const url = pushMock.mock.calls[0][0] as string;
    expect(url).toContain('disciplina=disc-2');
    expect(url).toContain('tipo=FISICO');
    expect(url).not.toContain('categoria=');
    expect(url).not.toContain('page=');
  });

  test('con disciplina muestra sus categorías y el chip activo', async () => {
    const user = userEvent.setup();
    urlActual.qs = 'disciplina=disc-1';
    render(<FiltrosPresentismo disciplinas={DISCIPLINAS} disciplinaId="disc-1" categoriaId={null} tipoSesion={null} />);

    expect(screen.getByRole('button', { name: 'Disciplina: Handball' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Categoría' }));
    expect(screen.queryByRole('option', { name: 'Mayores' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('option', { name: 'Sub-15' }));

    expect(pushMock.mock.calls[0][0]).toBe('/presentismo?disciplina=disc-1&categoria=cat-1');
  });

  test('"Todos" en tipo de sesión borra el param', async () => {
    const user = userEvent.setup();
    urlActual.qs = 'tipo=TECNICO';
    render(<FiltrosPresentismo disciplinas={DISCIPLINAS} disciplinaId={null} categoriaId={null} tipoSesion="TECNICO" />);

    await user.click(screen.getByRole('button', { name: /^Tipo de sesión: / }));
    await user.click(screen.getByRole('option', { name: 'Todos' }));

    expect(pushMock.mock.calls[0][0]).toBe('/presentismo');
  });
});
