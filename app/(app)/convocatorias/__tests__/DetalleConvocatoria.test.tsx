import { describe, test, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import DetalleConvocatoria from '../_components/DetalleConvocatoria';
import type { ConvocatoriaDetail } from '@/lib/queries/convocatorias';

const base: ConvocatoriaDetail = {
  id: 'conv-1',
  eventoTorneoId: 'ev-1',
  disciplinaId: 'futbol',
  categoriaId: 'cat-4',
  horaCitacion: '13:00',
  lugar: 'Puerta 3',
  observaciones: 'Llevar documento',
  entrenadorId: 'user_1',
  entrenadorNombre: 'Carlos Pérez',
  registradoPor: 'user_1',
  disciplina: 'Fútbol',
  categoria: '4ta',
  partido: {
    fecha: '2026-11-15',
    local: 'Estudiantes',
    visitante: 'Club Propio',
    estado: 'REPROGRAMADO',
    condicion: 'Visitante',
    rival: 'Estudiantes',
  },
  convocados: [
    { id: 'd1', apellido: 'Alvarez', nombre: 'Juan', posicion: 'Arquero', estado: 'ACTIVO', fotoUrl: null },
    { id: 'd2', apellido: 'Benitez', nombre: 'Marta', posicion: ' arquero', estado: 'LESIONADO', fotoUrl: null },
    { id: 'd3', apellido: 'Castro', nombre: 'Luis', posicion: 'Delantero', estado: 'ACTIVO', fotoUrl: null },
    { id: 'd4', apellido: 'Díaz', nombre: 'Ana', posicion: null, estado: 'ACTIVO', fotoUrl: null },
  ],
};

describe('DetalleConvocatoria', () => {
  test('título "vs. rival" con badge de estado y chips de disciplina, categoría y condición', () => {
    render(<DetalleConvocatoria convocatoria={base} />);
    expect(screen.getByRole('heading', { level: 1, name: 'vs. Estudiantes' })).toBeInTheDocument();
    expect(screen.getByText('Reprogramado')).toHaveClass('bg-amber-100');
    expect(screen.getAllByText('Fútbol').length).toBeGreaterThan(0);
    expect(screen.getAllByText('4ta').length).toBeGreaterThan(0);
    expect(screen.getByText('Visitante')).toHaveClass('bg-primario-suave');
  });

  test('sin equipo propio el título es "local vs. visitante"', () => {
    render(
      <DetalleConvocatoria
        convocatoria={{ ...base, partido: { ...base.partido, rival: null, condicion: null } }}
      />,
    );
    expect(
      screen.getByRole('heading', { level: 1, name: 'Estudiantes vs. Club Propio' }),
    ).toBeInTheDocument();
    expect(screen.queryByText('Visitante')).toBeNull();
  });

  test('datos de la citación: tile, hora, lugar, entrenador y observaciones', () => {
    render(<DetalleConvocatoria convocatoria={base} />);
    expect(screen.getByText('DOM')).toBeInTheDocument();
    expect(screen.getByText('15/11')).toBeInTheDocument();
    expect(screen.getByText('13:00')).toBeInTheDocument();
    expect(screen.getByText('Puerta 3')).toBeInTheDocument();
    expect(screen.getByText('Entrenador a cargo')).toBeInTheDocument();
    expect(screen.getByText('Carlos Pérez')).toBeInTheDocument();
    expect(screen.getByText('Llevar documento')).toBeInTheDocument();
  });

  test('citados con avatar, posición y badge de estado', () => {
    render(<DetalleConvocatoria convocatoria={base} />);
    expect(screen.getByRole('heading', { name: 'Citados (4)' })).toBeInTheDocument();
    const fila = screen.getByText('Benitez, Marta').closest('li') as HTMLElement;
    expect(within(fila).getByRole('img', { name: 'Marta Benitez' })).toHaveTextContent('BM');
    expect(within(fila).getByText('arquero')).toBeInTheDocument();
    expect(within(fila).getByText('Lesionado')).toHaveClass('bg-amber-100');
  });

  test('resumen: convocados por estado y por posición agrupada', () => {
    render(<DetalleConvocatoria convocatoria={base} />);
    const resumen = screen.getByRole('complementary', { name: 'Resumen de la convocatoria' });
    expect(within(resumen).getByText('Activos').nextSibling).toHaveTextContent('3');
    expect(within(resumen).getByText('Lesionados').nextSibling).toHaveTextContent('1');
    expect(within(resumen).queryByText('Suspendidos')).toBeNull();
    expect(within(resumen).getByText('Fútbol · 4ta')).toBeInTheDocument();
    const posiciones = within(resumen).getByRole('list', { name: 'Convocados por posición' });
    const filas = within(posiciones).getAllByRole('listitem').map((li) => li.textContent);
    expect(filas).toEqual(['Arquero2', 'Delantero1', 'Sin posición1']);
  });

  test('sin convocados', () => {
    render(<DetalleConvocatoria convocatoria={{ ...base, convocados: [] }} />);
    expect(screen.getByText('No hay deportistas convocados.')).toBeInTheDocument();
    expect(screen.getByText('Todavía no hay convocados.')).toBeInTheDocument();
  });

  test('renderiza las acciones recibidas', () => {
    render(<DetalleConvocatoria convocatoria={base} acciones={<button type="button">Editar</button>} />);
    expect(screen.getByRole('button', { name: 'Editar' })).toBeInTheDocument();
  });
});
