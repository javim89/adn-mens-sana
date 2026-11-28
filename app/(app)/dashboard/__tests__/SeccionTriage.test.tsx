import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { SEMANA } from './_semana';

const { getDistribucionTriage, getAtencionPrioritaria } = vi.hoisted(() => ({
  getDistribucionTriage: vi.fn(),
  getAtencionPrioritaria: vi.fn(),
}));
vi.mock('@/lib/queries/triage', () => ({ getDistribucionTriage, getAtencionPrioritaria }));

import SeccionTriage from '../_components/SeccionTriage';
import { linkTriage } from '../_lib/links';

const ATENCION = [
  {
    deportistaId: 'dep-1',
    nombre: 'Tomás',
    apellido: 'Ferreyra',
    fotoUrl: null,
    categoria: 'Primera',
    nivel: 'ROJO' as const,
    puntaje: 9,
    motivos: ['Seguimiento urgente abierto', 'Ausentismo reiterado'],
  },
  {
    deportistaId: 'dep-2',
    nombre: 'Lucía',
    apellido: 'Benítez',
    fotoUrl: null,
    categoria: null,
    nivel: 'NARANJA' as const,
    puntaje: 5,
    motivos: ['Lesión activa'],
  },
];

beforeEach(() => {
  vi.clearAllMocks();
  getDistribucionTriage.mockResolvedValue({
    actual: { VERDE: 10, AMARILLO: 5, NARANJA: 5, ROJO: 80 },
    previo: { VERDE: 10, AMARILLO: 5, NARANJA: 5, ROJO: 40 },
    ultimoPrevio: new Date('2026-09-21T05:00:00.000Z'),
    totalConTriage: 100,
    sinCalcular: 0,
    totalActivos: 100,
  });
  getAtencionPrioritaria.mockResolvedValue(ATENCION);
});

describe('SeccionTriage', () => {
  test('el hero es navy, con el número y el link con su aria-label', async () => {
    render(await SeccionTriage({ semana: SEMANA }));

    // El 80 aparece también en la mini-card de Rojo: el primero es el del hero.
    const numero = screen.getAllByText('80')[0];
    expect(numero.className).toContain('text-white');
    expect(numero.closest('div.rounded-2xl')!.className).toContain('bg-primario');
    expect(
      screen.getByRole('link', { name: 'Ver los deportistas activos en nivel Rojo' }),
    ).toBeInTheDocument();
  });

  test('la subida de rojos se pinta en rosa sobre el fondo oscuro', async () => {
    render(await SeccionTriage({ semana: SEMANA }));

    expect(screen.getByText(/\+40 \(\+100%\)/).className).toContain('text-rose-300');
  });

  test('la distribución dice el % del nivel mayor', async () => {
    render(await SeccionTriage({ semana: SEMANA }));

    expect(screen.getByText('80% en rojo')).toBeInTheDocument();
  });

  describe('A quién atender primero', () => {
    test('pide la lista con límite 5', async () => {
      render(await SeccionTriage({ semana: SEMANA }));

      expect(getAtencionPrioritaria).toHaveBeenCalledWith(5);
      expect(screen.getByRole('heading', { name: 'A quién atender primero' })).toBeInTheDocument();
    });

    test('cada fila linkea a la ficha, con nivel, categoría y los motivos', async () => {
      render(await SeccionTriage({ semana: SEMANA }));

      const fila = screen.getByRole('link', { name: /Tomás Ferreyra/ });
      expect(fila).toHaveAttribute('href', '/deportistas/dep-1');
      expect(within(fila).getByText('Rojo')).toBeInTheDocument();
      expect(
        within(fila).getByText('Primera · Seguimiento urgente abierto · Ausentismo reiterado'),
      ).toBeInTheDocument();
      // Sin foto: avatar con iniciales.
      expect(within(fila).getByText('TF')).toBeInTheDocument();
    });

    test('sin categoría muestra solo los motivos', async () => {
      render(await SeccionTriage({ semana: SEMANA }));

      const fila = screen.getByRole('link', { name: /Lucía Benítez/ });
      expect(within(fila).getByText('Naranja')).toBeInTheDocument();
      expect(within(fila).getByText('Lesión activa')).toBeInTheDocument();
    });

    test('"Ver todos" lleva a los activos en rojo', async () => {
      render(await SeccionTriage({ semana: SEMANA }));

      const verTodos = screen.getByRole('link', { name: 'Ver todos los deportistas activos en rojo' });
      expect(verTodos).toHaveAttribute('href', linkTriage('ROJO'));
      expect(verTodos).toHaveTextContent('Ver todos');
    });

    test('sin nadie fuera de verde, estado vacío y sin "Ver todos"', async () => {
      getAtencionPrioritaria.mockResolvedValue([]);
      render(await SeccionTriage({ semana: SEMANA }));

      expect(screen.getByText('No hay nadie para atender primero')).toBeInTheDocument();
      expect(
        screen.queryByRole('link', { name: 'Ver todos los deportistas activos en rojo' }),
      ).toBeNull();
    });
  });
});
