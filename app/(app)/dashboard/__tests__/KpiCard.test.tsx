import { describe, test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import KpiCard from '../_components/KpiCard';
import { calcularVariacion } from '../_lib/variacion';

describe('KpiCard', () => {
  test('muestra el label y el número', () => {
    render(<KpiCard label="Deportistas activos en rojo" valor={12} />);

    expect(screen.getByText('Deportistas activos en rojo')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
  });

  // `tabular-nums` evita que el número salte al cambiar de dígitos. Es el mismo
  // tratamiento que `KpiChart.tsx` de Insights.
  test('el número usa tabular-nums para no saltar', () => {
    render(<KpiCard label="Turnos" valor={7} />);

    expect(screen.getByText('7').className).toContain('tabular-nums');
  });

  test('un cero se muestra como cero, no como vacío', () => {
    render(<KpiCard label="Entregas fuera de ficha" valor={0} />);

    expect(screen.getByText('0')).toBeInTheDocument();
  });

  test('acepta un string para los casos sin dato', () => {
    render(<KpiCard label="Presentismo" valor="—" />);

    expect(screen.getByText('—')).toBeInTheDocument();
  });

  test('sin href no renderiza ningún link', () => {
    render(<KpiCard label="Turnos" valor={3} />);

    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  /**
   * El `aria-label` explícito no es opcional: "Ver deportistas" aparece en varias
   * cards de la misma página, y sin label un lector de pantalla lista varios links
   * idénticos sin forma de distinguirlos.
   */
  test('el link lleva aria-label explícito y el href exacto', () => {
    render(
      <KpiCard
        label="Deportistas activos en rojo"
        valor={12}
        href="/deportistas?filter%5BnivelTriage%5D=ROJO"
        linkLabel="Ver deportistas"
        ariaLabel="Ver los deportistas activos en nivel Rojo"
      />,
    );

    const link = screen.getByRole('link', {
      name: 'Ver los deportistas activos en nivel Rojo',
    });
    expect(link).toHaveAttribute('href', '/deportistas?filter%5BnivelTriage%5D=ROJO');
  });

  test('sin ariaLabel usa el linkLabel', () => {
    render(<KpiCard label="Turnos" valor={3} href="/turnos" linkLabel="Ver turnos" />);

    expect(screen.getByRole('link', { name: 'Ver turnos' })).toBeInTheDocument();
  });
});

describe('KpiCard — la variación', () => {
  /**
   * EL COPY DEL DÍA 1. Con la base sin seed de triage no hay snapshot anterior, así
   * que esto es lo que se ve por defecto: tiene que decir que no hay comparación y
   * **nunca** un 0% que se leería como "no cambió nada".
   */
  test('sin base dice "sin comparación previa" y nunca un 0%', () => {
    render(<KpiCard label="Rojo" valor={3} variacion={{ tipo: 'sin_base' }} />);

    expect(screen.getByText(/sin comparación previa/)).toBeInTheDocument();
    expect(screen.queryByText(/0%/)).not.toBeInTheDocument();
  });

  test('una subida muestra los puntos y el porcentaje', () => {
    render(<KpiCard label="Rojo" valor={12} variacion={calcularVariacion(12, 10)} />);

    expect(screen.getByText(/\+2 \(\+20%\)/)).toBeInTheDocument();
  });

  test('previo en cero muestra el absoluto en vez de un Infinity', () => {
    render(<KpiCard label="Rojo" valor={3} variacion={calcularVariacion(3, 0)} />);

    expect(screen.getByText(/\+3 vs\. la semana anterior \(antes 0\)/)).toBeInTheDocument();
  });

  test('sin cambios lo dice explícitamente', () => {
    render(<KpiCard label="Rojo" valor={5} variacion={calcularVariacion(5, 5)} />);

    expect(screen.getByText(/sin cambios/)).toBeInTheDocument();
  });

  test('ninguna variación imprime NaN, Infinity ni undefined', () => {
    for (const previo of [null, 0, 5, 10]) {
      const { container, unmount } = render(
        <KpiCard label="Rojo" valor={3} variacion={calcularVariacion(3, previo)} />,
      );
      expect(container.textContent).not.toMatch(/NaN|Infinity|undefined/);
      unmount();
    }
  });

  /**
   * EL BUG DE UX MÁS FÁCIL DE COMETER: el color tiene que salir del `sentido` de la
   * métrica, no de la dirección. En triage subir es EMPEORAR, así que una subida va
   * en rojo; en presentismo la misma subida va en verde.
   */
  describe('el color depende del sentido, no de la dirección', () => {
    const sube = calcularVariacion(12, 10);

    test('en triage (menos_es_mejor) una subida se pinta en rojo', () => {
      render(<KpiCard label="Rojo" valor={12} variacion={sube} sentido="menos_es_mejor" />);

      expect(screen.getByText(/\+2/).className).toContain('text-red-700');
    });

    test('en presentismo (mas_es_mejor) la MISMA subida se pinta en verde', () => {
      render(<KpiCard label="Presentismo" valor={12} variacion={sube} sentido="mas_es_mejor" />);

      expect(screen.getByText(/\+2/).className).toContain('text-green-700');
    });

    test('en triage una bajada se pinta en verde', () => {
      render(
        <KpiCard
          label="Rojo"
          valor={8}
          variacion={calcularVariacion(8, 10)}
          sentido="menos_es_mejor"
        />,
      );

      expect(screen.getByText(/−2/).className).toContain('text-green-700');
    });

    test('sin base se pinta en gris, no en rojo ni verde', () => {
      render(<KpiCard label="Rojo" valor={3} variacion={{ tipo: 'sin_base' }} />);

      const texto = screen.getByText(/sin comparación previa/);
      expect(texto.className).toContain('text-[#6B7280]');
      expect(texto.className).not.toContain('text-red-700');
      expect(texto.className).not.toContain('text-green-700');
    });
  });
});

describe('KpiCard — variantes', () => {
  test('default con módulo lleva el borde superior del acento', () => {
    const { container } = render(<KpiCard label="Turnos" valor={3} modulo="turnos" />);

    expect(container.firstElementChild!.className).toContain('border-t-emerald-600');
    expect(container.firstElementChild!.className).toContain('bg-white');
  });

  test('el número es gigante y en Oswald', () => {
    render(<KpiCard label="Turnos" valor={7} />);

    const numero = screen.getByText('7');
    expect(numero.className).toContain('text-6xl');
    expect(numero.className).toContain('md:text-7xl');
    expect(numero.style.fontFamily).toContain('Oswald');
  });

  test('hero: fondo navy, número blanco y link claro', () => {
    const { container } = render(
      <KpiCard
        variante="hero"
        label="Deportistas activos en rojo"
        valor={12}
        href="/deportistas"
        linkLabel="Ver deportistas"
      />,
    );

    expect(container.firstElementChild!.className).toContain('bg-[#121A61]');
    expect(screen.getByText('12').className).toContain('text-white');
    expect(screen.getByRole('link', { name: 'Ver deportistas' }).className).toContain(
      'text-white',
    );
  });

  test('hero: la variación usa los tonos para fondo oscuro', () => {
    render(
      <KpiCard
        variante="hero"
        label="Rojo"
        valor={12}
        variacion={calcularVariacion(12, 10)}
        sentido="menos_es_mejor"
      />,
    );

    const texto = screen.getByText(/\+2/);
    expect(texto.className).toContain('text-rose-300');
    expect(texto.className).not.toContain('text-red-700');
  });

  test('hero: sin base sigue diciendo "sin comparación previa", en blanco atenuado', () => {
    render(<KpiCard variante="hero" label="Rojo" valor={3} variacion={{ tipo: 'sin_base' }} />);

    expect(screen.getByText(/sin comparación previa/).className).toContain('text-white/70');
  });

  test('alerta-ambar tiñe la card', () => {
    const { container } = render(
      <KpiCard variante="alerta-ambar" label="Entregas fuera de ficha" valor={4} />,
    );

    expect(container.firstElementChild!.className).toContain('bg-amber-50');
    expect(container.firstElementChild!.className).toContain('border-t-amber-400');
  });

  test('alerta-rosa tiñe la card', () => {
    const { container } = render(
      <KpiCard variante="alerta-rosa" label="Seguimientos urgentes" valor={2} />,
    );

    expect(container.firstElementChild!.className).toContain('bg-rose-50');
  });

  test('el badge aparece solo cuando se pasa', () => {
    const { rerender } = render(<KpiCard label="Fuera de ficha" valor={4} badge="REVISAR" />);
    expect(screen.getByText('REVISAR')).toBeInTheDocument();

    rerender(<KpiCard label="Fuera de ficha" valor={4} />);
    expect(screen.queryByText('REVISAR')).not.toBeInTheDocument();
  });

  test('renderiza los children entre el detalle y el link', () => {
    render(
      <KpiCard label="Viandas" valor={4} detalle="detalle" href="/viandas" linkLabel="Ir">
        <div data-testid="mini-viz" />
      </KpiCard>,
    );

    const viz = screen.getByTestId('mini-viz');
    const detalle = screen.getByText('detalle');
    const link = screen.getByRole('link');
    expect(detalle.compareDocumentPosition(viz) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(viz.compareDocumentPosition(link) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
