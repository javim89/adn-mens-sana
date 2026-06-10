import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import DeportistaForm from '../_components/DeportistaForm';
import type { DeportistaWithRelations } from '@/lib/types/deportistas';

// Mock next/navigation
const mockRouterPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockRouterPush }),
}));

// Mock API helpers — must not reference top-level variables in the factory
vi.mock('@/lib/api/deportistas', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/lib/api/deportistas')>();
  return {
    ...original,
    createDeportista: vi.fn(),
    updateDeportista: vi.fn(),
  };
});

// Get mocked references after hoisting
import * as deportistasApi from '@/lib/api/deportistas';

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

// ---------------------------------------------------------------------------
// Tests — mode=create
// ---------------------------------------------------------------------------

describe('DeportistaForm — mode=create', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('renderiza las 4 pestañas', () => {
    render(<DeportistaForm mode="create" />, { wrapper });
    expect(screen.getByText('Datos Personales')).toBeInTheDocument();
    expect(screen.getByText('Datos Deportivos')).toBeInTheDocument();
    expect(screen.getByText('Datos Escolares')).toBeInTheDocument();
    expect(screen.getByText('Datos Sociales')).toBeInTheDocument();
  });

  test('la pestaña activa por defecto es Personal (muestra el campo Apellido)', () => {
    render(<DeportistaForm mode="create" />, { wrapper });
    expect(screen.getByLabelText(/apellido/i)).toBeInTheDocument();
  });

  test('clicar en "Deportivo" cambia la pestaña activa', () => {
    render(<DeportistaForm mode="create" />, { wrapper });
    fireEvent.click(screen.getByText('Datos Deportivos'));
    expect(screen.getByLabelText(/disciplina/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/apellido \*/i)).not.toBeInTheDocument();
  });

  test('cambiar de pestaña y volver no borra los valores', () => {
    render(<DeportistaForm mode="create" />, { wrapper });
    // Write in apellido
    fireEvent.change(screen.getByLabelText(/apellido \*/i), {
      target: { value: 'TestApellido' },
    });
    // Switch to Deportivo and back
    fireEvent.click(screen.getByText('Datos Deportivos'));
    fireEvent.click(screen.getByText('Datos Personales'));
    // Value must persist
    expect(screen.getByDisplayValue('TestApellido')).toBeInTheDocument();
  });

  test('submit sin nombre muestra error en el campo nombre', async () => {
    render(<DeportistaForm mode="create" />, { wrapper });
    fireEvent.change(screen.getByLabelText(/apellido \*/i), { target: { value: 'García' } });
    fireEvent.change(screen.getByLabelText(/dni \*/i), { target: { value: '12345678' } });
    fireEvent.change(screen.getByLabelText(/fecha de nacimiento/i), {
      target: { value: '2000-01-01' },
    });
    fireEvent.click(screen.getByText('Guardar'));
    await waitFor(() => {
      expect(screen.getByText('El nombre es requerido')).toBeInTheDocument();
    });
  });

  test('submit sin apellido muestra error en el campo apellido', async () => {
    render(<DeportistaForm mode="create" />, { wrapper });
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
    render(<DeportistaForm mode="create" />, { wrapper });
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
    render(<DeportistaForm mode="create" />, { wrapper });
    fireEvent.click(screen.getByText('Guardar'));
    await waitFor(() => {
      expect(screen.getAllByText('!').length).toBeGreaterThan(0);
    });
  });

  test('submit con datos válidos llama a createDeportista de lib/api/deportistas', async () => {
    vi.mocked(deportistasApi.createDeportista).mockResolvedValue({
      data: { id: 'new-id-123', type: 'deportistas', attributes: {} as never },
    });

    render(<DeportistaForm mode="create" />, { wrapper });
    fireEvent.change(screen.getByLabelText(/apellido \*/i), { target: { value: 'García' } });
    fireEvent.change(screen.getByLabelText(/nombre \*/i), { target: { value: 'Juan' } });
    fireEvent.change(screen.getByLabelText(/dni \*/i), { target: { value: '12345678' } });
    fireEvent.change(screen.getByLabelText(/fecha de nacimiento/i), {
      target: { value: '2000-01-01' },
    });
    fireEvent.click(screen.getByText('Guardar'));

    await waitFor(() => {
      expect(deportistasApi.createDeportista).toHaveBeenCalledTimes(1);
    });
    expect(mockRouterPush).toHaveBeenCalledWith('/deportistas/new-id-123');
  });

  test('error de la API muestra mensaje global de error', async () => {
    vi.mocked(deportistasApi.createDeportista).mockRejectedValue(new Error('Error de red'));

    render(<DeportistaForm mode="create" />, { wrapper });
    fireEvent.change(screen.getByLabelText(/apellido \*/i), { target: { value: 'García' } });
    fireEvent.change(screen.getByLabelText(/nombre \*/i), { target: { value: 'Juan' } });
    fireEvent.change(screen.getByLabelText(/dni \*/i), { target: { value: '12345678' } });
    fireEvent.change(screen.getByLabelText(/fecha de nacimiento/i), {
      target: { value: '2000-01-01' },
    });
    fireEvent.click(screen.getByText('Guardar'));

    await waitFor(() => {
      expect(screen.getByText('Error de red')).toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// Tests — mode=edit
// ---------------------------------------------------------------------------

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
    render(<DeportistaForm mode="edit" initialData={mockDeportista} />, { wrapper });
    expect(screen.getByDisplayValue('González')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Pedro')).toBeInTheDocument();
    expect(screen.getByDisplayValue('98765432')).toBeInTheDocument();
  });

  test('precarga los valores de DatosEscolares en la pestaña Escolar', () => {
    render(<DeportistaForm mode="edit" initialData={mockDeportista} />, { wrapper });
    fireEvent.click(screen.getByText('Datos Escolares'));
    expect(screen.getByDisplayValue('Colegio Nacional')).toBeInTheDocument();
  });

  test('submit con datos válidos llama a updateDeportista de lib/api/deportistas', async () => {
    vi.mocked(deportistasApi.updateDeportista).mockResolvedValue({
      data: { id: 'edit-id-123', type: 'deportistas', attributes: {} as never },
    });

    render(<DeportistaForm mode="edit" initialData={mockDeportista} />, { wrapper });
    fireEvent.click(screen.getByText('Guardar'));

    await waitFor(() => {
      expect(deportistasApi.updateDeportista).toHaveBeenCalledWith('edit-id-123', expect.any(Object));
    });
    expect(mockRouterPush).toHaveBeenCalledWith('/deportistas/edit-id-123');
  });
});
