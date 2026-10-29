import { render, screen, fireEvent } from '@testing-library/react';
import { describe, test, expect, vi } from 'vitest';
import TabPersonal from '../_components/tabs/TabPersonal';
import type { DeportistaFormData } from '@/lib/types/deportistas';

const emptyData: DeportistaFormData = {
  apellido: '',
  nombre: '',
  dni: '',
  fechaNacimiento: '',
  vivePensionClub: false,
  vivePensionExterna: false,
  estado: 'ACTIVO',
  tieneRepresentante: false,
  clubesAnteriores: [],
};

const fotoProps = { foto: undefined, fotoUrl: null, onFotoChange: vi.fn() };

describe('TabPersonal', () => {
  test('renderiza campos: nombre, apellido, DNI, fechaNacimiento', () => {
    render(<TabPersonal data={emptyData} errors={{}} onChange={vi.fn()} {...fotoProps} />);
    expect(screen.getByLabelText(/apellido/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/nombre \*/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/dni/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/fecha de nacimiento/i)).toBeInTheDocument();
  });

  test('renderiza select de Género', () => {
    render(<TabPersonal data={emptyData} errors={{}} onChange={vi.fn()} {...fotoProps} />);
    expect(screen.getByLabelText(/género/i)).toBeInTheDocument();
  });

  test('renderiza opciones del enum Género', () => {
    // Género usa CustomSelect: las opciones se renderizan al abrir el trigger.
    render(<TabPersonal data={emptyData} errors={{}} onChange={vi.fn()} {...fotoProps} />);
    fireEvent.click(screen.getByLabelText(/género/i));
    expect(screen.getByText('Masculino')).toBeInTheDocument();
    expect(screen.getByText('Femenino')).toBeInTheDocument();
  });

  test('checkbox "Vive en pensión del club" existe y funciona', () => {
    const onChange = vi.fn();
    render(<TabPersonal data={emptyData} errors={{}} onChange={onChange} {...fotoProps} />);
    const checkbox = screen.getByLabelText(/vive en pensión del club/i);
    expect(checkbox).toBeInTheDocument();
    fireEvent.click(checkbox);
    expect(onChange).toHaveBeenCalledWith({ vivePensionClub: true });
  });

  test('checkbox "Vive en pensión externa" existe y funciona', () => {
    const onChange = vi.fn();
    render(<TabPersonal data={emptyData} errors={{}} onChange={onChange} {...fotoProps} />);
    const checkbox = screen.getByLabelText(/vive en pensión externa/i);
    expect(checkbox).toBeInTheDocument();
    fireEvent.click(checkbox);
    expect(onChange).toHaveBeenCalledWith({ vivePensionExterna: true });
  });

  test('muestra error cuando se pasa error de apellido', () => {
    render(
      <TabPersonal
        data={emptyData}
        errors={{ apellido: 'El apellido es requerido' }}
        onChange={vi.fn()}
        {...fotoProps}
      />,
    );
    expect(screen.getByText('El apellido es requerido')).toBeInTheDocument();
  });

  test('precarga los valores cuando se pasan en data', () => {
    render(
      <TabPersonal
        data={{ ...emptyData, apellido: 'García', nombre: 'Juan', dni: '12345678' }}
        errors={{}}
        onChange={vi.fn()}
        {...fotoProps}
      />,
    );
    expect(screen.getByDisplayValue('García')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Juan')).toBeInTheDocument();
    expect(screen.getByDisplayValue('12345678')).toBeInTheDocument();
  });

  test('muestra la foto de perfil con las iniciales del deportista', () => {
    render(
      <TabPersonal
        data={{ ...emptyData, apellido: 'García', nombre: 'Juan' }}
        errors={{}}
        onChange={vi.fn()}
        {...fotoProps}
      />,
    );
    expect(screen.getByText('JG')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /subir foto/i })).toBeInTheDocument();
  });
});
