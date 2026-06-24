import { render, screen, fireEvent } from '@testing-library/react';
import { describe, test, expect, vi } from 'vitest';
import TabPersonal from '../_components/tabs/TabPersonal';
import type { DeportistaFormData } from '@/lib/types/deportistas';

// Radix Select uses a portal and doesn't render options until opened.
// Mock the shadcn select primitives to render all options inline.
vi.mock('@/app/components/ui/select', () => ({
  Select: ({ children, value, onValueChange }: { children: React.ReactNode; value?: string; onValueChange?: (v: string) => void }) => (
    <div data-testid="select" data-value={value}>{children}</div>
  ),
  SelectTrigger: ({ children, id, className }: { children: React.ReactNode; id?: string; className?: string }) => (
    <button id={id} className={className} role="combobox">{children}</button>
  ),
  SelectValue: ({ placeholder }: { placeholder?: string }) => <span>{placeholder}</span>,
  SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <div role="option" data-value={value}>{children}</div>
  ),
}));

const emptyData: DeportistaFormData = {
  apellido: '',
  nombre: '',
  dni: '',
  fechaNacimiento: '',
  vivePensionClub: false,
  vivePensionExterna: false,
  estado: 'ACTIVO',
  esRepresentante: false,
  clubesAnteriores: [],
};

describe('TabPersonal', () => {
  test('renderiza campos: nombre, apellido, DNI, fechaNacimiento', () => {
    render(<TabPersonal data={emptyData} errors={{}} onChange={vi.fn()} />);
    expect(screen.getByLabelText(/apellido/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/nombre \*/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/dni/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/fecha de nacimiento/i)).toBeInTheDocument();
  });

  test('renderiza select de Género', () => {
    render(<TabPersonal data={emptyData} errors={{}} onChange={vi.fn()} />);
    expect(screen.getByLabelText(/género/i)).toBeInTheDocument();
  });

  test('renderiza opciones del enum Género', () => {
    render(<TabPersonal data={emptyData} errors={{}} onChange={vi.fn()} />);
    expect(screen.getByText('Masculino')).toBeInTheDocument();
    expect(screen.getByText('Femenino')).toBeInTheDocument();
  });

  test('checkbox "Vive en pensión del club" existe y funciona', () => {
    const onChange = vi.fn();
    render(<TabPersonal data={emptyData} errors={{}} onChange={onChange} />);
    const checkbox = screen.getByLabelText(/vive en pensión del club/i);
    expect(checkbox).toBeInTheDocument();
    fireEvent.click(checkbox);
    expect(onChange).toHaveBeenCalledWith({ vivePensionClub: true });
  });

  test('checkbox "Vive en pensión externa" existe y funciona', () => {
    const onChange = vi.fn();
    render(<TabPersonal data={emptyData} errors={{}} onChange={onChange} />);
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
      />,
    );
    expect(screen.getByDisplayValue('García')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Juan')).toBeInTheDocument();
    expect(screen.getByDisplayValue('12345678')).toBeInTheDocument();
  });
});
