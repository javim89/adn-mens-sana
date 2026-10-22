import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import MorphHero, { MEDIA_MORPH } from '../MorphHero';
import VentanaDashboard from '../VentanaDashboard';

function mockMedia(morph: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockImplementation((q: string) => ({
      matches: q === MEDIA_MORPH ? morph : false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
}

function renderMorph() {
  return render(
    <MorphHero>
      <div data-morph-texto>Titular</div>
      <div data-morph-card="triage">card</div>
      <VentanaDashboard />
    </MorphHero>,
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('MorphHero', () => {
  it('sin matchMedia (o sin JS) queda apagado: hero normal + ventana estática', () => {
    renderMorph();
    expect(screen.getByTestId('morph-hero')).toHaveAttribute('data-morph', 'off');
  });

  it('con reduced-motion, mobile o poco alto (MEDIA_MORPH no matchea) queda apagado', () => {
    mockMedia(false);
    renderMorph();
    expect(screen.getByTestId('morph-hero')).toHaveAttribute('data-morph', 'off');
    expect(screen.getByText('Titular').style.transform).toBe('');
  });

  it('en desktop con movimiento se enciende y posiciona la ventana y las cards', () => {
    mockMedia(true);
    renderMorph();
    expect(screen.getByTestId('morph-hero')).toHaveAttribute('data-morph', 'on');
    expect(screen.getByTestId('ventana-dashboard').style.transform).toMatch(/^translate3d\(.*\) scale\(/);
    // Scroll en 0: el titular y la card en su lugar del hero, la ventana invisible.
    expect(screen.getByText('card').style.transform).toBe('translate3d(0px, 0px, 0) scale(1)');
    expect(screen.getByText('Titular').style.opacity).toBe('1');
    // La ventana arranca asomada y casi transparente, no invisible.
    expect(screen.getByTestId('ventana-dashboard').style.opacity).toBe('0.15');
    // Etapa 2 sin arrancar: el contenido de la ventana sin scrollear, las copias ocultas.
    expect(screen.getByTestId('morph-hero')).not.toHaveAttribute('data-morph-etapa2');
    expect(screen.getByTestId('ventana-dashboard').querySelector<HTMLElement>('[data-morph-contenido]')!.style.transform).toMatch(/translate3d\(0, -?0px, 0\)/);
  });

  it('MEDIA_MORPH exige xl y sin reduced-motion; el alto mínimo es el de una laptop baja', () => {
    expect(MEDIA_MORPH).toContain('min-width: 1280px');
    // Regresión: con 840px quedaba apagado en una laptop de 1440×783.
    expect(MEDIA_MORPH).toContain('min-height: 640px');
    expect(MEDIA_MORPH).toContain('prefers-reduced-motion: no-preference');
  });
});

describe('VentanaDashboard', () => {
  it('es decorativa y tiene un slot por cada card del hero', () => {
    render(<VentanaDashboard />);
    const ventana = screen.getByTestId('ventana-dashboard');
    expect(ventana).toHaveAttribute('aria-hidden', 'true');
    expect(ventana).toHaveAttribute('inert');
    const slots = [...ventana.querySelectorAll('[data-morph-slot]')].map((s) => s.getAttribute('data-morph-slot'));
    expect(slots.sort()).toEqual(['presentismo-dia', 'presentismo-kpi', 'triage', 'turnos']);
    ventana.querySelectorAll('a').forEach((a) => expect(a.getAttribute('href')).toBe('#'));
  });

  it('trae la segunda fila entera, con anclas para el cursor de la etapa 2', () => {
    render(<VentanaDashboard />);
    const ventana = screen.getByTestId('ventana-dashboard');
    const anclas = [...ventana.querySelectorAll('[data-morph-ancla]')].map((a) => a.getAttribute('data-morph-ancla'));
    expect(anclas).toEqual(['seguimientos', 'viandas', 'plantel']);
    expect(ventana.querySelector('[data-morph-ancla="seguimientos"] [data-kpi-valor]')).toHaveTextContent('42');
    expect(ventana.querySelector('[data-morph-ancla="plantel"] [data-kpi-valor]')).toHaveTextContent('212');
    expect(ventana.querySelector('[data-morph-columna] [data-morph-contenido]')).not.toBeNull();
  });

  it('muestra el marco del panel: sidebar con los módulos reales y el encabezado del dashboard', () => {
    render(<VentanaDashboard />);
    const ventana = screen.getByTestId('ventana-dashboard');
    for (const label of ['Dashboard', 'Deportistas', 'Turnos', 'Presentismo', 'Convocatorias', 'Viandas', 'Seguimientos', 'Calendario', 'Insights', 'Usuarios']) {
      expect(ventana.textContent).toContain(label);
    }
    expect(ventana.textContent).toContain('Resumen de la semana');
  });
});

describe('Hero cards ↔ slots', () => {
  it('cada card del hero tiene su slot en la ventana', async () => {
    const { default: HeroCards } = await import('../HeroCards');
    render(
      <>
        <HeroCards />
        <VentanaDashboard />
      </>,
    );
    const cards = [...screen.getByTestId('hero-cards').querySelectorAll('[data-morph-card]')].map((c) =>
      c.getAttribute('data-morph-card'),
    );
    const slots = [...screen.getByTestId('ventana-dashboard').querySelectorAll('[data-morph-slot]')].map((s) =>
      s.getAttribute('data-morph-slot'),
    );
    expect(cards.sort()).toEqual(slots.sort());
    expect(cards).toHaveLength(4);
  });

  it('sin buscador y con un solo cursor, el de Viandas, que apunta a su card de la etapa 2', async () => {
    const { default: HeroCards } = await import('../HeroCards');
    render(
      <>
        <HeroCards />
        <VentanaDashboard />
      </>,
    );
    expect(document.querySelector('input')).toBeNull();
    const cursores = [...screen.getByTestId('hero-cards').querySelectorAll<HTMLElement>('[data-morph-cursor]')];
    expect(cursores.map((c) => c.textContent)).toEqual(['VViandas']);
    const [ancla] = cursores[0].dataset.morphCursor!.split(',');
    expect(screen.getByTestId('ventana-dashboard').querySelector(`[data-morph-ancla="${ancla}"]`)).not.toBeNull();
  });
});
