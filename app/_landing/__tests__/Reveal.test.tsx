import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Reveal from '../Reveal';

type Callback = (entradas: Array<{ isIntersecting: boolean }>) => void;

function mockIntersectionObserver() {
  const instancias: { callback: Callback; disconnect: ReturnType<typeof vi.fn> }[] = [];
  class IO {
    callback: Callback;
    disconnect = vi.fn();
    observe = vi.fn();
    unobserve = vi.fn();
    constructor(callback: Callback) {
      this.callback = callback;
      instancias.push(this);
    }
  }
  vi.stubGlobal('IntersectionObserver', IO);
  return instancias;
}

function mockReducedMotion(reduce: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockReturnValue({ matches: reduce, addEventListener: vi.fn(), removeEventListener: vi.fn() }),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('Reveal', () => {
  it('se oculta al montar y aparece cuando entra al viewport', () => {
    const instancias = mockIntersectionObserver();
    render(<Reveal>contenido</Reveal>);
    const el = screen.getByText('contenido');
    expect(el).toHaveAttribute('data-reveal', 'oculto');

    act(() => instancias[0].callback([{ isIntersecting: true }]));
    expect(el).toHaveAttribute('data-reveal', 'visible');
    expect(instancias[0].disconnect).toHaveBeenCalled();
  });

  it('no se muestra mientras no intersecta', () => {
    const instancias = mockIntersectionObserver();
    render(<Reveal>contenido</Reveal>);
    act(() => instancias[0].callback([{ isIntersecting: false }]));
    expect(screen.getByText('contenido')).toHaveAttribute('data-reveal', 'oculto');
  });

  it('sin IntersectionObserver queda visible', () => {
    vi.stubGlobal('IntersectionObserver', undefined);
    render(<Reveal>contenido</Reveal>);
    expect(screen.getByText('contenido')).toHaveAttribute('data-reveal', 'visible');
  });

  it('con prefers-reduced-motion queda visible sin observar', () => {
    const instancias = mockIntersectionObserver();
    mockReducedMotion(true);
    render(<Reveal>contenido</Reveal>);
    expect(screen.getByText('contenido')).toHaveAttribute('data-reveal', 'visible');
    expect(instancias).toHaveLength(0);
  });
});
