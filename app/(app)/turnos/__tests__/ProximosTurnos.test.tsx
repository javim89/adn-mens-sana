import { describe, test, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import ProximosTurnos from '../_components/ProximosTurnos';
import type { TurnoFila } from '../_components/TurnosTable';

const turno = (overrides: Partial<TurnoFila> = {}): TurnoFila => ({
  id: 't-1',
  titulo: 'Control kinésico',
  fecha: '2026-11-11',
  hora: '09:30',
  lugar: 'Consultorio 2',
  descripcion: null,
  profesionalId: 'prof-1',
  profesionalNombre: 'Lic. Romero',
  deportistas: [
    { id: 'd-1', nombre: 'Ana', apellido: 'Paz', categoria: { id: 'c4', nombre: '4ta' } },
    { id: 'd-2', nombre: 'Eva', apellido: 'Sol', categoria: null },
  ],
  ...overrides,
});

describe('ProximosTurnos', () => {
  test('muestra el título del panel y cada turno con tile, profesional y resumen', () => {
    render(<ProximosTurnos turnos={[turno()]} />);
    expect(screen.getByRole('heading', { name: 'Próximos turnos' })).toBeInTheDocument();
    const item = screen.getByRole('listitem');
    expect(within(item).getByText('MIÉ 11/11')).toBeInTheDocument();
    expect(within(item).getByText('09:30')).toBeInTheDocument();
    expect(within(item).getByText('Control kinésico')).toBeInTheDocument();
    expect(within(item).getByText('Lic. Romero')).toBeInTheDocument();
    expect(within(item).getByText('4ta (1) · Sin categoría (1) · Consultorio 2')).toBeInTheDocument();
  });

  test('sin turnos muestra el estado vacío', () => {
    render(<ProximosTurnos turnos={[]} />);
    expect(screen.getByText('No hay turnos agendados de hoy en adelante.')).toBeInTheDocument();
  });
});
