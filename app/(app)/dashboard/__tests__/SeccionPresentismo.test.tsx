import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { ResumenPresentismo } from '@/lib/queries/dashboard';
import { SEMANA } from './_semana';

const { getResumenPresentismo } = vi.hoisted(() => ({ getResumenPresentismo: vi.fn() }));
vi.mock('@/lib/queries/dashboard', () => ({ getResumenPresentismo }));

import SeccionPresentismo from '../_components/SeccionPresentismo';

const SEMANA_PREVIA = {
  ...SEMANA,
  desdeClave: '2026-09-21',
  hastaClave: '2026-09-27',
  desdeDb: new Date('2026-09-21T00:00:00.000Z'),
  finExclusivoDb: new Date('2026-09-28T00:00:00.000Z'),
};

const CLAVES = [
  '2026-09-28',
  '2026-09-29',
  '2026-09-30',
  '2026-10-01',
  '2026-10-02',
  '2026-10-03',
  '2026-10-04',
];

const VACIO_ESTADOS = { PRESENTE: 0, LLEGO_TARDE: 0, SE_RETIRO_ANTES: 0, AUSENTE: 0 };

function conDatos(over: Partial<ResumenPresentismo> = {}): ResumenPresentismo {
  return {
    actual: {
      registros: 40,
      asistencias: 32,
      porcentaje: 80,
      porEstado: { PRESENTE: 26, LLEGO_TARDE: 4, SE_RETIRO_ANTES: 2, AUSENTE: 8 },
    },
    previo: {
      registros: 40,
      asistencias: 28,
      porcentaje: 70,
      porEstado: { PRESENTE: 24, LLEGO_TARDE: 2, SE_RETIRO_ANTES: 2, AUSENTE: 12 },
    },
    ausentismoReiterado: [
      { id: 'd1', nombre: 'Ana', apellido: 'Torres', ausencias: 3 },
      { id: 'd2', nombre: 'Juan', apellido: 'Pérez', ausencias: 2 },
    ],
    porDia: CLAVES.map((clave, i) => ({
      clave,
      registros: i < 5 ? 8 : 0,
      asistencias: i < 5 ? 6 + (i % 2) : 0,
      porcentaje: i < 5 ? [75, 88, 75, 88, 75][i] : null,
    })),
    ...over,
  };
}

const VACIO: ResumenPresentismo = {
  actual: { registros: 0, asistencias: 0, porcentaje: null, porEstado: VACIO_ESTADOS },
  previo: { registros: 0, asistencias: 0, porcentaje: null, porEstado: VACIO_ESTADOS },
  ausentismoReiterado: [],
  porDia: CLAVES.map((clave) => ({ clave, registros: 0, asistencias: 0, porcentaje: null })),
};

function renderSeccion(entrenadorId?: string) {
  return SeccionPresentismo({ semana: SEMANA, semanaPrevia: SEMANA_PREVIA, entrenadorId });
}

beforeEach(() => {
  vi.clearAllMocks();
  getResumenPresentismo.mockResolvedValue(conDatos());
});

describe('SeccionPresentismo — con datos', () => {
  test('porcentaje, variación (subir es mejor) y "X de Y registros"', async () => {
    render(await renderSeccion());

    expect(screen.getByText('80%')).toBeInTheDocument();
    expect(screen.getByText(/\+10 \(\+14%\)/).className).toContain('text-green-700');
    expect(screen.getByText(/32 de 40 registros/)).toBeInTheDocument();
    expect(screen.getByText(/incluye llegadas tarde y retiros anticipados/)).toBeInTheDocument();
  });

  test('la barra fina por estado nombra los 4 estados con su conteo', async () => {
    render(await renderSeccion());

    const barra = screen
      .getAllByRole('img')
      .find((el) => el.getAttribute('aria-label')?.startsWith('Presente'))!;
    expect(barra.getAttribute('aria-label')).toBe(
      'Presente: 26, Llegó tarde: 4, Se retiró antes: 2, Ausente: 8',
    );
    expect(barra.className).toContain('h-2.5');
  });

  test('las barras por día van de lunes a domingo, con "—" en los días sin registros', async () => {
    render(await renderSeccion());

    const dias = screen
      .getAllByRole('img')
      .find((el) => el.getAttribute('aria-label')?.startsWith('Lun'))!;
    expect(dias.getAttribute('aria-label')).toBe(
      'Lun: 75%, Mar: 88%, Mié: 75%, Jue: 88%, Vie: 75%, Sáb: sin dato, Dom: sin dato',
    );
    expect(screen.getAllByText('—')).toHaveLength(2);
  });

  test('con ausentismo: card rosa con badge REVISAR y un tile por deportista', async () => {
    render(await renderSeccion());

    expect(screen.getByText('REVISAR')).toBeInTheDocument();
    const card = screen.getByText('Ausencias reiteradas').closest('div.rounded-2xl')!;
    expect(card.className).toContain('bg-rose-50');

    const ana = screen.getByRole('link', { name: 'Ver la ficha de Ana Torres (3 ausencias)' });
    expect(ana).toHaveAttribute('href', '/deportistas/d1');
    expect(ana.textContent).toContain('Torres, Ana');
    expect(ana.textContent).toContain('3');
    expect(screen.getByRole('link', { name: 'Ver la ficha de Juan Pérez (2 ausencias)' })).toHaveAttribute(
      'href',
      '/deportistas/d2',
    );
  });

  // Regresión: el aria-label pisaba el texto visible y el lector de pantalla no
  // anunciaba la cantidad de ausencias, que es el dato del tile.
  test('el nombre accesible de cada tile incluye la cantidad de ausencias', async () => {
    render(await renderSeccion());

    const links = screen
      .getAllByRole('link')
      .filter((l) => l.getAttribute('href')?.startsWith('/deportistas/'));
    expect(links.map((l) => l.getAttribute('aria-label'))).toEqual([
      'Ver la ficha de Ana Torres (3 ausencias)',
      'Ver la ficha de Juan Pérez (2 ausencias)',
    ]);
  });

  test('el link del módulo conserva su aria-label', async () => {
    render(await renderSeccion());

    expect(screen.getByRole('link', { name: 'Ver el módulo de presentismo' })).toHaveAttribute(
      'href',
      '/presentismo',
    );
  });

  test('sin ausentismo pero con registros: sin badge, card blanca y copy positivo', async () => {
    getResumenPresentismo.mockResolvedValue(conDatos({ ausentismoReiterado: [] }));
    render(await renderSeccion());

    expect(screen.queryByText('REVISAR')).not.toBeInTheDocument();
    expect(screen.getByText('Buena señal: no hay ausentismo reiterado.')).toBeInTheDocument();
    const card = screen.getByText('Ausencias reiteradas').closest('div.rounded-2xl')!;
    expect(card.className).toContain('bg-white');
    expect(card.className).toContain('border-t-teal-600');
  });
});

describe('SeccionPresentismo — sin registros', () => {
  test('muestra "—", sin barras, sin badge y sin NaN/undefined', async () => {
    getResumenPresentismo.mockResolvedValue(VACIO);
    const { container } = render(await renderSeccion());

    expect(screen.getByText('—')).toBeInTheDocument();
    expect(screen.getByText(/Sin asistencias registradas del 28 de septiembre/)).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.queryByText('REVISAR')).not.toBeInTheDocument();
    expect(
      screen.getByText('Todavía no hay asistencias registradas en la semana.'),
    ).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/NaN|undefined|Infinity/);
  });
});

describe('SeccionPresentismo — scoping', () => {
  test('pasa el entrenadorId a la query', async () => {
    await renderSeccion('user_1');

    expect(getResumenPresentismo).toHaveBeenCalledWith(
      expect.objectContaining({ entrenadorId: 'user_1' }),
    );
  });
});
