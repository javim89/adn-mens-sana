import { describe, test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { DistribucionTriage } from '@/lib/queries/triage';
import TriageDistribucion from '../_components/TriageDistribucion';

function datos(over: Partial<DistribucionTriage> = {}): DistribucionTriage {
  return {
    actual: { VERDE: 100, AMARILLO: 30, NARANJA: 15, ROJO: 5 },
    previo: null,
    ultimoPrevio: null,
    totalConTriage: 150,
    sinCalcular: 50,
    totalActivos: 200,
    ...over,
  };
}

describe('TriageDistribucion', () => {
  test('muestra los 4 niveles con su conteo', () => {
    render(<TriageDistribucion datos={datos()} />);

    for (const label of ['Verde', 'Amarillo', 'Naranja', 'Rojo']) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
    expect(screen.getByText('100')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  test('el denominador que muestra es el plantel activo', () => {
    render(<TriageDistribucion datos={datos()} />);

    expect(screen.getByText(/Sobre 200 deportistas activos/)).toBeInTheDocument();
  });

  test('los porcentajes se calculan sobre el total de activos', () => {
    render(<TriageDistribucion datos={datos()} />);

    // 100/200 = 50%, 50/200 = 25% (sin calcular)
    expect(screen.getByText('50%')).toBeInTheDocument();
    expect(screen.getByText('25%')).toBeInTheDocument();
  });
});

/**
 * EL BUCKET "SIN CALCULAR" ES OBLIGATORIO.
 *
 * Sin él, con la base sin seed de triage la barra muestra 0/0/0/0 y esconde que hay
 * ~250 deportistas sin snapshot — que es justamente la información útil y accionable.
 * Es el estado real del día 1, no un borde.
 */
describe('TriageDistribucion — el bucket "sin calcular"', () => {
  test('se muestra como un nivel más, con su conteo', () => {
    render(<TriageDistribucion datos={datos()} />);

    expect(screen.getByText('Sin calcular')).toBeInTheDocument();
    expect(screen.getByText('50')).toBeInTheDocument();
  });

  test('con la base sin triage revela los 250 sin calcular en vez de mostrar 0/0/0/0', () => {
    render(
      <TriageDistribucion
        datos={datos({
          actual: { VERDE: 0, AMARILLO: 0, NARANJA: 0, ROJO: 0 },
          totalConTriage: 0,
          sinCalcular: 250,
          totalActivos: 250,
        })}
      />,
    );

    expect(screen.getByText('Sin calcular')).toBeInTheDocument();
    expect(screen.getByText('250')).toBeInTheDocument();
    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  test('linkea al filtro SIN_CALCULAR, que la API ya acepta', () => {
    render(<TriageDistribucion datos={datos()} />);

    const link = screen.getByRole('link', { name: /Sin calcular/ });
    expect(decodeURIComponent(link.getAttribute('href')!)).toContain(
      'filter[nivelTriage]=SIN_CALCULAR',
    );
  });
});

/**
 * LA PROPIEDAD QUE EL USUARIO PIDIÓ VERIFICAR: si el query string no es exacto, la
 * card muestra un número y el listado muestra otro conjunto — o sea, la card miente.
 */
describe('TriageDistribucion — los deep links son exactos', () => {
  test('el link de ROJO lleva el nivel Y el estado ACTIVO', () => {
    render(<TriageDistribucion datos={datos()} />);

    const href = decodeURIComponent(
      screen.getByRole('link', { name: /nivel Rojo/ }).getAttribute('href')!,
    );

    expect(href).toContain('/deportistas?');
    expect(href).toContain('filter[nivelTriage]=ROJO');
    // Sin esto el listado contaría también INACTIVO y SUSPENDIDO, y el total no
    // coincidiría con el número de la card.
    expect(href).toContain('filter[estado]=ACTIVO');
    expect(href).toContain('page[number]=1');
    expect(href).toContain('page[size]=20');
  });

  test.each([
    ['Verde', 'VERDE'],
    ['Amarillo', 'AMARILLO'],
    ['Naranja', 'NARANJA'],
    ['Rojo', 'ROJO'],
  ])('el link de %s filtra por %s y por estado ACTIVO', (label, nivel) => {
    render(<TriageDistribucion datos={datos()} />);

    const href = decodeURIComponent(
      screen.getByRole('link', { name: new RegExp(`nivel ${label}`) }).getAttribute('href')!,
    );
    expect(href).toContain(`filter[nivelTriage]=${nivel}`);
    expect(href).toContain('filter[estado]=ACTIVO');
  });

  // Cada segmento tiene su propio link: 4 niveles + sin calcular.
  test('hay exactamente 5 links, uno por segmento', () => {
    render(<TriageDistribucion datos={datos()} />);

    expect(screen.getAllByRole('link')).toHaveLength(5);
  });

  test('cada link lleva aria-label con el nivel y el conteo', () => {
    render(<TriageDistribucion datos={datos()} />);

    expect(
      screen.getByRole('link', { name: 'Ver deportistas activos en nivel Rojo (5)' }),
    ).toBeInTheDocument();
  });
});

describe('TriageDistribucion — bordes', () => {
  /**
   * Sin deportistas activos, `cantidad / totalActivos` sería una división por cero
   * (NaN en el width del segmento y en el porcentaje). El early return lo evita y
   * además dice algo útil.
   */
  test('sin deportistas activos muestra el estado vacío y no divide por cero', () => {
    const { container } = render(
      <TriageDistribucion
        datos={datos({
          actual: { VERDE: 0, AMARILLO: 0, NARANJA: 0, ROJO: 0 },
          totalConTriage: 0,
          sinCalcular: 0,
          totalActivos: 0,
        })}
      />,
    );

    expect(screen.getByText(/Todavía no hay deportistas activos/)).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/NaN|Infinity/);
    expect(screen.queryAllByRole('link')).toHaveLength(0);
  });

  test('un nivel en cero sigue apareciendo en la leyenda, con su 0', () => {
    render(
      <TriageDistribucion
        datos={datos({
          actual: { VERDE: 10, AMARILLO: 0, NARANJA: 0, ROJO: 0 },
          totalConTriage: 10,
          sinCalcular: 0,
          totalActivos: 10,
        })}
      />,
    );

    // Los cuatro niveles + sin calcular están listados aunque tres estén en cero:
    // "no hay nadie en naranja" es información, no un motivo para esconder la fila.
    expect(screen.getByText('Naranja')).toBeInTheDocument();
    expect(screen.getAllByRole('link')).toHaveLength(5);
  });

  test('la barra tiene un aria-label con los niveles que sí tienen gente', () => {
    render(<TriageDistribucion datos={datos()} />);

    const barra = screen.getByRole('img');
    expect(barra.getAttribute('aria-label')).toContain('Rojo: 5');
    expect(barra.getAttribute('aria-label')).toContain('Sin calcular: 50');
  });
});

describe('TriageDistribucion — barra apilada y mini-cards', () => {
  test('la etiqueta del segmento mayor dice "NN% en rojo"', () => {
    render(
      <TriageDistribucion
        datos={datos({
          actual: { VERDE: 5, AMARILLO: 5, NARANJA: 5, ROJO: 85 },
          totalConTriage: 100,
          sinCalcular: 0,
          totalActivos: 100,
        })}
      />,
    );

    expect(screen.getByText('85% en rojo')).toBeInTheDocument();
  });

  test('con todos sin calcular la etiqueta lo dice sin "en"', () => {
    render(
      <TriageDistribucion
        datos={datos({
          actual: { VERDE: 0, AMARILLO: 0, NARANJA: 0, ROJO: 0 },
          totalConTriage: 0,
          sinCalcular: 250,
          totalActivos: 250,
        })}
      />,
    );

    expect(screen.getByText('100% sin calcular')).toBeInTheDocument();
  });

  test('las mini-cards van de más grave a menos grave, y sin calcular al final', () => {
    render(<TriageDistribucion datos={datos()} />);

    const nombres = screen.getAllByRole('link').map((l) => l.getAttribute('aria-label'));
    expect(nombres).toEqual([
      'Ver deportistas activos en nivel Rojo (5)',
      'Ver deportistas activos en nivel Naranja (15)',
      'Ver deportistas activos en nivel Amarillo (30)',
      'Ver deportistas activos en nivel Verde (100)',
      'Ver deportistas activos en nivel Sin calcular (50)',
    ]);
  });

  test('un nivel en 0 queda atenuado', () => {
    render(
      <TriageDistribucion
        datos={datos({
          actual: { VERDE: 10, AMARILLO: 0, NARANJA: 0, ROJO: 0 },
          totalConTriage: 10,
          sinCalcular: 0,
          totalActivos: 10,
        })}
      />,
    );

    expect(screen.getByRole('link', { name: /nivel Naranja \(0\)/ }).className).toContain(
      'bg-gray-50',
    );
    expect(screen.getByRole('link', { name: /nivel Verde \(10\)/ }).className).not.toContain(
      'bg-gray-50',
    );
  });
});
