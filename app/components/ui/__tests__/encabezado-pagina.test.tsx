import { render, screen } from '@testing-library/react';
import { describe, test, expect } from 'vitest';
import { EncabezadoPagina } from '../encabezado-pagina';

describe('EncabezadoPagina', () => {
  test('renderiza el título como h1', () => {
    render(<EncabezadoPagina titulo="Seguimientos" />);
    expect(screen.getByRole('heading', { level: 1, name: 'Seguimientos' })).toBeInTheDocument();
  });

  test('el contador va fuera del h1 y usa contadorLabel para lectores de pantalla', () => {
    render(<EncabezadoPagina titulo="Deportistas" contador={42} contadorLabel="42 deportistas activos" />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveAccessibleName('Deportistas');
    expect(screen.getByText('42')).toHaveAttribute('aria-hidden');
    expect(screen.getByText('42 deportistas activos')).toHaveClass('sr-only');
  });

  test('sin contadorLabel muestra el número tal cual; con 0 también se muestra', () => {
    const { container } = render(<EncabezadoPagina titulo="Turnos" contador={0} />);
    const pill = container.querySelector('[data-slot="contador"]');
    expect(pill).toHaveTextContent('0');
    expect(pill).toHaveClass('bg-primario-suave', 'text-primario');
  });

  test('sin contador no renderiza la píldora', () => {
    const { container } = render(<EncabezadoPagina titulo="Turnos" />);
    expect(container.querySelector('[data-slot="contador"]')).toBeNull();
  });

  test('renderiza subtítulo, acción y children', () => {
    render(
      <EncabezadoPagina titulo="Turnos" subtitulo="Agenda del área" accion={<button>Nuevo turno</button>}>
        <div>Filtros</div>
      </EncabezadoPagina>,
    );
    expect(screen.getByText('Agenda del área')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Nuevo turno' })).toBeInTheDocument();
    expect(screen.getByText('Filtros')).toBeInTheDocument();
  });
});
