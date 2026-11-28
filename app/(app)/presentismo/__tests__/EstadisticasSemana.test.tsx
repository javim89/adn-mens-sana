import { describe, test, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import EstadisticasSemana from '../_components/EstadisticasSemana';
import type { ResumenPresentismo, PresentismoSemana } from '@/lib/queries/dashboard';

function semana(asistencias: number, registros: number): PresentismoSemana {
  return {
    registros,
    asistencias,
    porcentaje: registros === 0 ? null : Math.round((asistencias / registros) * 100),
    porEstado: { PRESENTE: asistencias, AUSENTE: registros - asistencias, LLEGO_TARDE: 0, SE_RETIRO_ANTES: 0 },
  };
}

const DIAS = ['2026-11-23', '2026-11-24', '2026-11-25', '2026-11-26', '2026-11-27', '2026-11-28', '2026-11-29'];

function resumen(over: Partial<ResumenPresentismo> = {}): ResumenPresentismo {
  return {
    actual: semana(8, 10),
    previo: semana(7, 10),
    variacion: 10,
    porCategoria: [
      { categoriaId: 'c1', categoria: 'Sub-15', registros: 6, asistencias: 6, porcentaje: 100 },
      { categoriaId: 'c2', categoria: 'Sub-17', registros: 4, asistencias: 2, porcentaje: 50 },
    ],
    ausentismoReiterado: [
      { id: 'd1', nombre: 'Juan', apellido: 'Pérez', categoria: 'Sub-17', ausencias: 2 },
    ],
    porDia: DIAS.map((clave, i) => ({
      clave,
      registros: i === 0 ? 10 : 0,
      asistencias: i === 0 ? 8 : 0,
      porcentaje: i === 0 ? 80 : null,
    })),
    ...over,
  };
}

describe('EstadisticasSemana', () => {
  test('KPI con anillo, porcentaje y variación; sin objetivo', () => {
    const { container } = render(<EstadisticasSemana datos={resumen()} />);

    expect(container.querySelector('[data-kpi-valor]')).toHaveTextContent('80%');
    expect(screen.getByRole('img', { name: 'Presentismo semanal: 80%' })).toBeInTheDocument();
    expect(screen.getByText(/vs\. la semana anterior/)).toBeInTheDocument();
    expect(screen.getByText('8 de 10 registros.')).toBeInTheDocument();
    expect(screen.queryByText(/objetivo/i)).not.toBeInTheDocument();
  });

  test('barras por día y por categoría', () => {
    render(<EstadisticasSemana datos={resumen()} />);

    expect(screen.getByRole('heading', { name: 'Por día' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /Lun: 80%, Mar: sin dato/ })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Por categoría' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Sub-15: 100%, Sub-17: 50%' })).toBeInTheDocument();
  });

  test('lista quién tiene dos o más ausencias, con avatar y categoría', () => {
    render(<EstadisticasSemana datos={resumen()} />);

    const link = screen.getByRole('link', { name: /Ver la ficha de Juan Pérez \(2 ausencias\)/ });
    expect(link).toHaveAttribute('href', '/deportistas/d1');
    expect(within(link).getByText('Sub-17')).toBeInTheDocument();
    expect(within(link).getByText('JP')).toBeInTheDocument();
    expect(screen.getByText('Revisar')).toBeInTheDocument();
  });

  test('sin registros no inventa un 0% ni muestra el anillo', () => {
    const { container } = render(
      <EstadisticasSemana
        datos={resumen({
          actual: semana(0, 0),
          previo: semana(0, 0),
          variacion: null,
          porCategoria: [],
          ausentismoReiterado: [],
          porDia: DIAS.map((clave) => ({ clave, registros: 0, asistencias: 0, porcentaje: null })),
        })}
      />,
    );

    expect(container.querySelector('[data-kpi-valor]')).toHaveTextContent('—');
    expect(screen.queryByRole('img', { name: /Presentismo semanal/ })).not.toBeInTheDocument();
    expect(screen.getByText('Sin registros por categoría esta semana')).toBeInTheDocument();
    expect(
      screen.getByText('Todavía no hay asistencias registradas en la semana.'),
    ).toBeInTheDocument();
    expect(screen.queryByText('Revisar')).not.toBeInTheDocument();
  });
});
