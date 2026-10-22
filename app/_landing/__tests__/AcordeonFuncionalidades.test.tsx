import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import AcordeonFuncionalidades from '../AcordeonFuncionalidades';
import { DURACION_FUNCIONALIDAD_MS, FUNCIONALIDADES } from '../funcionalidades';

const IDS = ['insights', 'seguimientos', 'convocatorias', 'deportistas'] as const;
const TITULOS = ['Insights', 'Seguimientos', 'Convocatorias', 'Deportistas'];

const DEMOS = {
  insights: <p>demo insights</p>,
  seguimientos: <p>demo seguimientos</p>,
  convocatorias: <p>demo convocatorias</p>,
  deportistas: <p>demo deportistas</p>,
};

/**
 * `matchMedia` falso: `desktop` responde a `(min-width: 1024px)` y `menosMovimiento` a
 * `prefers-reduced-motion`. `cambiarDesktop` simula el `change` de un resize.
 */
function mockMatchMedia({ desktop = false, menosMovimiento = false } = {}) {
  const estado = { desktop, menosMovimiento };
  const oyentes = new Set<() => void>();
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      get matches() {
        if (query === '(min-width: 1024px)') return estado.desktop;
        if (query === '(prefers-reduced-motion: reduce)') return estado.menosMovimiento;
        return false;
      },
      media: query,
      addEventListener: (_: string, fn: () => void) => oyentes.add(fn),
      removeEventListener: (_: string, fn: () => void) => oyentes.delete(fn),
    })),
  );
  return {
    cambiarDesktop(valor: boolean) {
      estado.desktop = valor;
      act(() => oyentes.forEach((fn) => fn()));
    },
  };
}

function renderAcordeon() {
  render(<AcordeonFuncionalidades demos={DEMOS} />);
  return screen.getByTestId('acordeon-funcionalidades');
}

function demo(id: string) {
  return document.querySelector(`[data-demo="${id}"]`) as HTMLElement;
}

function boton(nombre: string) {
  return screen.getByRole('button', { name: nombre });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('funcionalidades', () => {
  it('cada feature dura 7s y están en el orden del contrato', () => {
    expect(DURACION_FUNCIONALIDAD_MS).toBe(7000);
    expect(FUNCIONALIDADES.map((f) => f.id)).toEqual(IDS);
    expect(FUNCIONALIDADES.map((f) => f.titulo)).toEqual(TITULOS);
  });
});

describe('AcordeonFuncionalidades — modo lista (< lg)', () => {
  it('sin matchMedia arranca en lista, sin auto-avance ni barra', () => {
    const raiz = renderAcordeon();
    expect(raiz).toHaveAttribute('data-modo', 'lista');
    expect(raiz).toHaveAttribute('data-autoavance', 'off');
    expect(screen.queryByTestId(/^progreso-/)).not.toBeInTheDocument();
  });

  it('muestra las 4 features: títulos estáticos en orden, paneles y demos visibles', () => {
    mockMatchMedia({ desktop: false });
    const raiz = renderAcordeon();
    expect(raiz).toHaveAttribute('data-modo', 'lista');
    expect(raiz).toHaveAttribute('data-autoavance', 'off');
    expect(screen.queryByTestId(/^progreso-/)).not.toBeInTheDocument();

    const titulos = Array.from(raiz.querySelectorAll('[data-titulo-movil]')).map((t) => t.textContent);
    expect(titulos).toEqual(TITULOS);
    IDS.forEach((id) => {
      expect(demo(id)).toHaveAttribute('data-visible', 'true');
      expect(document.getElementById(`funcionalidad-${id}-panel`)).not.toHaveAttribute('hidden');
    });
  });

  it('intercala texto y demo con order consecutivos (texto impar, demo par)', () => {
    mockMatchMedia({ desktop: false });
    renderAcordeon();
    IDS.forEach((id, i) => {
      const texto = document.querySelector(`[data-funcionalidad-texto="${id}"]`);
      expect(texto).toHaveClass(`order-${2 * i + 1}`, 'lg:order-none');
      expect(demo(id)).toHaveClass(`order-${2 * i + 2}`, 'lg:order-none');
    });
  });

  it('en el DOM van primero los 4 textos y después las 4 demos, todos hermanos', () => {
    const raiz = renderAcordeon();
    const hijos = Array.from(raiz.children).map(
      (h) => h.getAttribute('data-funcionalidad-texto') ?? `demo:${h.getAttribute('data-demo')}`,
    );
    expect(hijos).toEqual([...IDS, ...IDS.map((id) => `demo:${id}`)]);
  });
});

describe('AcordeonFuncionalidades — modo acordeón (lg+)', () => {
  it('arranca con Insights abierto, auto-avance y su barra', () => {
    mockMatchMedia({ desktop: true });
    const raiz = renderAcordeon();
    expect(raiz).toHaveAttribute('data-modo', 'acordeon');
    expect(raiz).toHaveAttribute('data-activa', 'insights');
    expect(raiz).toHaveAttribute('data-autoavance', 'on');
    expect(raiz).toHaveAttribute('data-pausado', 'false');

    const botones = screen.getAllByRole('button');
    expect(botones.map((b) => b.textContent)).toEqual(TITULOS);
    botones.forEach((b, i) => {
      expect(b).toHaveAttribute('aria-expanded', i === 0 ? 'true' : 'false');
      expect(b).toHaveAttribute('id', `funcionalidad-${IDS[i]}-boton`);
      const panel = document.getElementById(b.getAttribute('aria-controls') ?? '');
      expect(panel).toBeInTheDocument();
      expect(panel).toHaveAttribute('role', 'region');
      expect(panel).toHaveAttribute('aria-labelledby', b.id);
    });

    expect(document.getElementById('funcionalidad-insights-panel')).not.toHaveClass('lg:hidden');
    IDS.slice(1).forEach((id) =>
      expect(document.getElementById(`funcionalidad-${id}-panel`)).toHaveClass('lg:hidden'),
    );
    expect(screen.getByTestId('progreso-insights')).toBeInTheDocument();
    expect(screen.getAllByTestId(/^progreso-/)).toHaveLength(1);
  });

  it('solo la demo activa queda visible', () => {
    mockMatchMedia({ desktop: true });
    renderAcordeon();
    IDS.forEach((id) => expect(demo(id)).toHaveAttribute('data-visible', id === 'insights' ? 'true' : 'false'));
  });

  it('click en Convocatorias la abre, cambia la demo y el auto-avance sigue encendido', async () => {
    const user = userEvent.setup();
    mockMatchMedia({ desktop: true });
    const raiz = renderAcordeon();

    await user.click(boton('Convocatorias'));

    TITULOS.forEach((t) =>
      expect(boton(t)).toHaveAttribute('aria-expanded', t === 'Convocatorias' ? 'true' : 'false'),
    );
    expect(raiz).toHaveAttribute('data-activa', 'convocatorias');
    expect(raiz).toHaveAttribute('data-autoavance', 'on');
    IDS.forEach((id) =>
      expect(demo(id)).toHaveAttribute('data-visible', id === 'convocatorias' ? 'true' : 'false'),
    );
    expect(document.getElementById('funcionalidad-convocatorias-panel')).not.toHaveClass('lg:hidden');
    expect(document.getElementById('funcionalidad-insights-panel')).toHaveClass('lg:hidden');
  });

  // Regresión: antes un click cortaba el auto-avance para siempre (la barra quedaba llena y quieta).
  it('después de un click la barra del ítem clickeado sigue y su animationend pasa al siguiente', async () => {
    const user = userEvent.setup();
    mockMatchMedia({ desktop: true });
    const raiz = renderAcordeon();

    await user.click(boton('Convocatorias'));
    expect(screen.getAllByTestId(/^progreso-/)).toHaveLength(1);
    // Ni el foco del click ni el puntero encima pausan: la barra corre.
    fireEvent.pointerEnter(raiz);
    fireEvent.pointerEnter(boton('Convocatorias'));
    expect(raiz).toHaveAttribute('data-pausado', 'false');
    fireEvent.animationEnd(screen.getByTestId('progreso-convocatorias'));

    expect(raiz).toHaveAttribute('data-activa', 'deportistas');
    expect(raiz).toHaveAttribute('data-autoavance', 'on');
    expect(screen.getByTestId('progreso-deportistas')).toBeInTheDocument();
  });

  it('click sobre el ítem abierto no lo cierra y remonta su barra desde 0', async () => {
    const user = userEvent.setup();
    mockMatchMedia({ desktop: true });
    const raiz = renderAcordeon();
    const antes = screen.getByTestId('progreso-insights');

    await user.click(boton('Insights'));

    expect(boton('Insights')).toHaveAttribute('aria-expanded', 'true');
    expect(raiz).toHaveAttribute('data-activa', 'insights');
    const despues = screen.getByTestId('progreso-insights');
    expect(despues).not.toBe(antes);
    expect(antes).not.toBeInTheDocument();

    fireEvent.animationEnd(despues);
    expect(raiz).toHaveAttribute('data-activa', 'seguimientos');
  });

  it('las flechas no cortan el auto-avance ni cambian el ítem abierto', async () => {
    const user = userEvent.setup();
    mockMatchMedia({ desktop: true });
    const raiz = renderAcordeon();
    const barra = screen.getByTestId('progreso-insights');

    boton('Insights').focus();
    await user.keyboard('{ArrowDown}{End}{Home}');
    expect(raiz).toHaveAttribute('data-activa', 'insights');
    expect(raiz).toHaveAttribute('data-autoavance', 'on');
    // Misma barra (no se remontó): sigue desde donde estaba, pausada por el foco.
    expect(screen.getByTestId('progreso-insights')).toBe(barra);
    expect(raiz).toHaveAttribute('data-pausado', 'true');
  });

  it('el animationend de la barra pasa a la siguiente y del último vuelve al primero', () => {
    mockMatchMedia({ desktop: true });
    const raiz = renderAcordeon();

    fireEvent.animationEnd(screen.getByTestId('progreso-insights'));
    expect(raiz).toHaveAttribute('data-activa', 'seguimientos');
    expect(boton('Seguimientos')).toHaveAttribute('aria-expanded', 'true');
    expect(demo('seguimientos')).toHaveAttribute('data-visible', 'true');
    expect(raiz).toHaveAttribute('data-autoavance', 'on');

    fireEvent.animationEnd(screen.getByTestId('progreso-seguimientos'));
    fireEvent.animationEnd(screen.getByTestId('progreso-convocatorias'));
    expect(raiz).toHaveAttribute('data-activa', 'deportistas');

    fireEvent.animationEnd(screen.getByTestId('progreso-deportistas'));
    expect(raiz).toHaveAttribute('data-activa', 'insights');
  });

  it('las flechas, Home y End mueven el foco entre los botones (circular)', async () => {
    const user = userEvent.setup();
    mockMatchMedia({ desktop: true });
    renderAcordeon();

    boton('Insights').focus();
    await user.keyboard('{ArrowDown}');
    expect(boton('Seguimientos')).toHaveFocus();
    await user.keyboard('{ArrowUp}');
    expect(boton('Insights')).toHaveFocus();
    await user.keyboard('{ArrowUp}');
    expect(boton('Deportistas')).toHaveFocus();
    await user.keyboard('{ArrowDown}');
    expect(boton('Insights')).toHaveFocus();
    await user.keyboard('{End}');
    expect(boton('Deportistas')).toHaveFocus();
    await user.keyboard('{Home}');
    expect(boton('Insights')).toHaveFocus();
  });

  it('Enter sobre un botón lo abre', async () => {
    const user = userEvent.setup();
    mockMatchMedia({ desktop: true });
    const raiz = renderAcordeon();

    boton('Deportistas').focus();
    await user.keyboard('{Enter}');
    expect(raiz).toHaveAttribute('data-activa', 'deportistas');
    expect(raiz).toHaveAttribute('data-autoavance', 'on');
    expect(screen.getByTestId('progreso-deportistas')).toBeInTheDocument();
  });

  it('no se pausa con el puntero encima; sí con el foco de teclado adentro', () => {
    mockMatchMedia({ desktop: true });
    const raiz = renderAcordeon();

    fireEvent.pointerEnter(raiz);
    expect(raiz).toHaveAttribute('data-pausado', 'false');
    fireEvent.animationEnd(screen.getByTestId('progreso-insights'));
    expect(raiz).toHaveAttribute('data-activa', 'seguimientos');

    act(() => boton('Seguimientos').focus());
    expect(raiz).toHaveAttribute('data-pausado', 'true');
    act(() => boton('Seguimientos').blur());
    expect(raiz).toHaveAttribute('data-pausado', 'false');
  });

  it('se pausa cuando queda fuera del viewport', () => {
    type Callback = (entradas: Array<{ isIntersecting: boolean }>) => void;
    const callbacks: Callback[] = [];
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        observe = vi.fn();
        disconnect = vi.fn();
        constructor(cb: Callback) {
          callbacks.push(cb);
        }
      },
    );
    mockMatchMedia({ desktop: true });
    const raiz = renderAcordeon();

    act(() => callbacks[0]([{ isIntersecting: false }]));
    expect(raiz).toHaveAttribute('data-pausado', 'true');
    act(() => callbacks[0]([{ isIntersecting: true }]));
    expect(raiz).toHaveAttribute('data-pausado', 'false');
  });

  it('se pausa con la pestaña oculta', () => {
    mockMatchMedia({ desktop: true });
    const raiz = renderAcordeon();
    const hidden = vi.spyOn(document, 'hidden', 'get');

    hidden.mockReturnValue(true);
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(raiz).toHaveAttribute('data-pausado', 'true');

    hidden.mockReturnValue(false);
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(raiz).toHaveAttribute('data-pausado', 'false');
    hidden.mockRestore();
  });

  it('con prefers-reduced-motion no hay auto-avance ni barra', async () => {
    const user = userEvent.setup();
    mockMatchMedia({ desktop: true, menosMovimiento: true });
    const raiz = renderAcordeon();

    expect(raiz).toHaveAttribute('data-modo', 'acordeon');
    expect(raiz).toHaveAttribute('data-autoavance', 'off');
    expect(screen.queryByTestId(/^progreso-/)).not.toBeInTheDocument();

    await user.click(boton('Seguimientos'));
    expect(raiz).toHaveAttribute('data-activa', 'seguimientos');
  });

  it('al pasar de lg a < lg queda en lista, sin barra y con todas las demos visibles', () => {
    const media = mockMatchMedia({ desktop: true });
    const raiz = renderAcordeon();
    expect(screen.getByTestId('progreso-insights')).toBeInTheDocument();

    media.cambiarDesktop(false);
    expect(raiz).toHaveAttribute('data-modo', 'lista');
    expect(raiz).toHaveAttribute('data-autoavance', 'off');
    expect(screen.queryByTestId(/^progreso-/)).not.toBeInTheDocument();
    IDS.forEach((id) => expect(demo(id)).toHaveAttribute('data-visible', 'true'));

    media.cambiarDesktop(true);
    expect(raiz).toHaveAttribute('data-modo', 'acordeon');
    expect(document.querySelectorAll('[data-visible="true"]')).toHaveLength(1);
  });
});

describe('AcordeonFuncionalidades — demos', () => {
  it('cada demo es decorativa (aria-hidden + inert) y se monta una sola vez', () => {
    mockMatchMedia({ desktop: true });
    renderAcordeon();
    const demos = document.querySelectorAll('[data-demo]');
    expect(demos).toHaveLength(4);
    demos.forEach((d) => {
      expect(d).toHaveAttribute('aria-hidden', 'true');
      expect(d).toHaveAttribute('inert');
    });
    IDS.forEach((id) => expect(screen.getAllByText(`demo ${id}`)).toHaveLength(1));
  });

  it('cada demo va en su lienzo; en modo lista el lienzo no tiene escala ni transform', () => {
    mockMatchMedia({ desktop: false });
    renderAcordeon();
    IDS.forEach((id) => {
      const lienzo = demo(id).querySelector<HTMLElement>('[data-demo-lienzo]');
      expect(lienzo).toHaveTextContent(`demo ${id}`);
      expect(lienzo).not.toHaveAttribute('data-escala');
      expect(lienzo!.style.getPropertyValue('--escala')).toBe('');
      expect(lienzo!.style.transform).toBe('');
    });
  });

  it('sin matchMedia (SSR / jsdom) tampoco hay escala', () => {
    renderAcordeon();
    document.querySelectorAll('[data-demo-lienzo]').forEach((l) => expect(l).not.toHaveAttribute('data-escala'));
  });

  it('en modo acordeón cada lienzo recibe su escala', () => {
    mockMatchMedia({ desktop: true });
    renderAcordeon();
    // jsdom no tiene layout (ancho 0): alcanza con ver que el lienzo se mide y se escala.
    IDS.forEach((id) => expect(demo(id).querySelector('[data-demo-lienzo]')).toHaveAttribute('data-escala'));
  });

  it('en desktop los títulos son botones sin ícono y en sentence case (sin uppercase ni Oswald)', () => {
    mockMatchMedia({ desktop: true });
    renderAcordeon();
    IDS.forEach((id, i) => {
      const b = document.getElementById(`funcionalidad-${id}-boton`)!;
      expect(b).toHaveTextContent(TITULOS[i]);
      expect(b.querySelector('svg')).toBeNull();
      expect(b.className).not.toMatch(/uppercase|oswald/);
    });
  });
});
