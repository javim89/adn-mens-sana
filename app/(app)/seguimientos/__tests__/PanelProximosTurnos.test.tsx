import { describe, test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import PanelProximosTurnos from '../_components/PanelProximosTurnos';

describe('PanelProximosTurnos', () => {
  test('muestra cada turno con su tile de fecha, hora y deportistas', () => {
    render(
      <PanelProximosTurnos
        turnos={[
          {
            id: 't1',
            titulo: 'Control kinésico',
            fecha: new Date('2026-11-30T00:00:00.000Z'),
            hora: '10:30',
            lugar: 'Consultorio',
            deportistas: [
              { id: 'd1', nombre: 'Ana', apellido: 'Torres' },
              { id: 'd2', nombre: 'Juan', apellido: 'Pérez' },
            ],
          },
        ]}
      />,
    );
    expect(screen.getByRole('heading', { name: 'Próximos turnos' })).toBeInTheDocument();
    expect(screen.getByText('Control kinésico')).toBeInTheDocument();
    expect(screen.getByText('LUN 30/11')).toBeInTheDocument();
    expect(screen.getByText('10:30')).toBeInTheDocument();
    expect(screen.getByText('Ana Torres y 1 más · Consultorio')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver todos' })).toHaveAttribute('href', '/turnos');
  });

  test('sin turnos muestra un estado vacío', () => {
    render(<PanelProximosTurnos turnos={[]} />);
    expect(screen.getByText('No hay turnos agendados de hoy en adelante.')).toBeInTheDocument();
  });
});
