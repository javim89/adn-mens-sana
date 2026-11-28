import { describe, test, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import ProximosPartidos from '../_components/ProximosPartidos';
import type { EventoProximo } from '@/lib/queries/dashboard';

const base: EventoProximo = {
  id: 'e1',
  fecha: new Date('2026-12-05T00:00:00.000Z'),
  categoria: '4ta',
  local: 'GIMNASIA (LP)',
  visitante: 'ESTUDIANTES',
  estado: 'PROGRAMADO',
  tieneConvocatoria: true,
  condicion: 'Local',
  rival: 'ESTUDIANTES',
};

describe('ProximosPartidos', () => {
  test('cada fila muestra día, categoría, rival y condición', () => {
    render(<ProximosPartidos eventos={[base]} />);
    expect(screen.getByRole('heading', { name: 'Próximos partidos' })).toBeInTheDocument();
    const fila = screen.getByRole('listitem');
    expect(fila).toHaveTextContent('SÁB');
    expect(fila).toHaveTextContent('5/12');
    expect(fila).toHaveTextContent('4ta');
    expect(fila).toHaveTextContent('vs. ESTUDIANTES · Local');
    expect(within(fila).queryByText('sin convocatoria')).toBeNull();
  });

  test('sin equipo propio muestra "local vs. visitante"; estado y falta de convocatoria como píldoras', () => {
    render(
      <ProximosPartidos
        eventos={[{ ...base, condicion: null, rival: null, estado: 'SUSPENDIDO', tieneConvocatoria: false }]}
      />,
    );
    expect(screen.getByText('GIMNASIA (LP) vs. ESTUDIANTES')).toBeInTheDocument();
    expect(screen.getByText('Suspendido')).toHaveClass('bg-red-100');
    expect(screen.getByText('sin convocatoria')).toBeInTheDocument();
  });

  test('estado vacío', () => {
    render(<ProximosPartidos eventos={[]} />);
    expect(screen.getByText('No hay partidos próximos cargados.')).toBeInTheDocument();
  });
});
