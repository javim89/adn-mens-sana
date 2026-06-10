import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import DeportistaForm from '../_components/DeportistaForm';
import type { DeportistaWithRelations } from '@/lib/types/deportistas';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

// Mock server actions
vi.mock('@/lib/actions/deportistas', () => ({
  createDeportista: vi.fn().mockResolvedValue({ success: true, id: 'new-id-123' }),
  updateDeportista: vi.fn().mockResolvedValue({ success: true }),
}));

describe('DeportistaForm — mode=create', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('renderiza las 4 pestañas', () => {
    render(<DeportistaForm mode="create" />);
    expect(screen.getByText('Datos Personales')).toBeInTheDocument();
    expect(screen.getByText('Datos Deportivos')).toBeInTheDocument();
    expect(screen.getByText('Datos Escolares')).toBeInTheDocument();
    expect(screen.getByText('Datos Sociales')).toBeInTheDocument();
  });

  test('la pestaña activa por defecto es Personal (muestra el campo Apellido)', () => {
    render(<DeportistaForm mode="create" />);
    expect(screen.getByLabelText(/apellido/i)).toBeInTheDocument();
  });

  test('clicar en "Deportivo" cambia la pestaña activa', () => {
    render(<DeportistaForm mode="create" />);
    fireEvent.click(screen.getByText('Datos Deportivos'));
    expect(screen.getByLabelText(/disciplina/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/apellido/i)).not.toBeInTheDocument();
  });

  test('cambiar de pestaña y volver no borra los valores', () => {
    render(<DeportistaForm mode="create" />);
    // Escribir en apellido
    fireEvent.change(screen.getByLabelText(/apellido \*/i), {
      target: { value: 'TestApellido' },
    });
    // Cambiar a Deportivo y volver
    fireEvent.click(screen.getByText('Datos Deportivos'));
    fireEvent.click(screen.getByText('Datos Personales'));
    // El valor debe seguir ahí
    expect(screen.getByDisplayValue('TestApellido')).toBeInTheDocument();
  });

  test('submit sin nombre muestra error en el campo nombre', async () => {
    render(<DeportistaForm mode="create" />);
    // Completar otros campos requeridos menos nombre
    fireEvent.change(screen.getByLabelText(/apellido \*/i), { target: { value: 'García' } });
    fireEvent.change(screen.getByLabelText(/dni \*/i), { target: { value: '12345678' } });
    fireEvent.change(screen.getByLabelText(/fecha de nacimiento/i), {
      target: { value: '2000-01-01' },
    });
    // Submit
    fireEvent.click(screen.getByText('Guardar'));
    await waitFor(() => {
      expect(screen.getByText('El nombre es requerido')).toBeInTheDocument();
    });
  });

  test('submit sin apellido muestra error en el campo apellido', async () => {
    render(<DeportistaForm mode="create" />);
    fireEvent.change(screen.getByLabelText(/nombre \*/i), { target: { value: 'Juan' } });
    fireEvent.change(screen.getByLabelText(/dni \*/i), { target: { value: '12345678' } });
    fireEvent.change(screen.getByLabelText(/fecha de nacimiento/i), {
      target: { value: '2000-01-01' },
    });
    fireEvent.click(screen.getByText('Guardar'));
    await waitFor(() => {
      expect(screen.getByText('El apellido es requerido')).toBeInTheDocument();
    });
  });

  test('submit sin DNI muestra error en el campo DNI', async () => {
    render(<DeportistaForm mode="create" />);
    fireEvent.change(screen.getByLabelText(/apellido \*/i), { target: { value: 'García' } });
    fireEvent.change(screen.getByLabelText(/nombre \*/i), { target: { value: 'Juan' } });
    fireEvent.change(screen.getByLabelText(/fecha de nacimiento/i), {
      target: { value: '2000-01-01' },
    });
    fireEvent.click(screen.getByText('Guardar'));
    await waitFor(() => {
      expect(screen.getByText('El DNI es requerido')).toBeInTheDocument();
    });
  });

  test('pestaña Personal con errores muestra indicador visual', async () => {
    render(<DeportistaForm mode="create" />);
    // Submit sin completar para generar errores en Personal
    fireEvent.click(screen.getByText('Guardar'));
    await waitFor(() => {
      const tabButton = screen.getByText('Datos Personales').closest('button');
      // El tab debe tener clase de error o el indicador "!"
      expect(screen.getAllByText('!').length).toBeGreaterThan(0);
    });
  });
});

describe('DeportistaForm — mode=edit', () => {
  const mockDeportista: DeportistaWithRelations = {
    id: 'edit-id-123',
    apellido: 'González',
    nombre: 'Pedro',
    dni: '98765432',
    fechaNacimiento: new Date('1995-05-15'),
    provincia: 'Buenos Aires',
    ciudad: 'La Plata',
    genero: 'MASCULINO',
    telefono: '221-1234567',
    email: 'pedro@example.com',
    domicilioActual: 'Calle 1 123',
    nacionalidad: 'Argentina',
    contactoEmergencia: 'María 221-7654321',
    vivePensionClub: false,
    vivePensionExterna: false,
    observaciones: null,
    disciplina: 'FUTBOL',
    categoria: 'PRIMERA',
    posicion: 'Delantero',
    estado: 'ACTIVO',
    actividadComplementaria: 'GIMNASIO',
    fechaIngreso: new Date('2020-01-01'),
    esRepresentante: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    clubesAnteriores: [],
    historiaDeportiva: [],
    datosEscolares: {
      id: 'esc-1',
      nivelEstudio: 'SECUNDARIO_COMPLETO',
      nombreColegio: 'Colegio Nacional',
      anoCursa: null,
      materiasAdeudadas: null,
    },
    datosSociales: null,
    viviendaFamiliar: null,
    datosFamiliares: null,
    necesidadesApoyo: null,
  };

  test('precarga los valores del deportista en los campos de la pestaña Personal', () => {
    render(<DeportistaForm mode="edit" initialData={mockDeportista} />);
    expect(screen.getByDisplayValue('González')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Pedro')).toBeInTheDocument();
    expect(screen.getByDisplayValue('98765432')).toBeInTheDocument();
  });

  test('precarga los valores de DatosEscolares en la pestaña Escolar', () => {
    render(<DeportistaForm mode="edit" initialData={mockDeportista} />);
    fireEvent.click(screen.getByText('Datos Escolares'));
    expect(screen.getByDisplayValue('Colegio Nacional')).toBeInTheDocument();
  });
});
