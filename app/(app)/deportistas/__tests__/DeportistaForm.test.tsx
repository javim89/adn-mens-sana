import { useEffect } from 'react';
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
    uploadFotoDeportista: vi.fn(),
    descartarFotoSubida: vi.fn(),
  };
});

// El editor de recorte necesita layout (jsdom no tiene): el Cropper mock emite un área fija al montar
// y el recorte devuelve siempre el mismo File.
vi.mock('react-easy-crop', () => ({
  default: function CropperMock({ onCropComplete }: { onCropComplete: (a: unknown, p: unknown) => void }) {
    useEffect(() => {
      onCropComplete({ x: 0, y: 0, width: 100, height: 100 }, { x: 0, y: 0, width: 50, height: 50 });
      // eslint-disable-next-line react-hooks/exhaustive-deps -- como el Cropper real, emite al montar
    }, []);
    return null;
  },
}));

const recorte = vi.hoisted(() => new File(['r'], 'foto.jpg', { type: 'image/jpeg' }));
vi.mock('@/lib/crop-image', () => ({
  getCroppedImage: vi.fn().mockResolvedValue(recorte),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

// Get mocked references after hoisting
import * as deportistasApi from '@/lib/api/deportistas';
import { toast } from 'sonner';

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

function completarCamposRequeridos() {
  fireEvent.change(screen.getByLabelText(/apellido \*/i), { target: { value: 'García' } });
  fireEvent.change(screen.getByLabelText(/nombre \*/i), { target: { value: 'Juan' } });
  fireEvent.change(screen.getByLabelText(/dni \*/i), { target: { value: '12345678' } });
  fireEvent.change(screen.getByLabelText(/fecha de nacimiento/i), {
    target: { value: '2000-01-01' },
  });
}

/** Elige un archivo y lo aplica en el editor de recorte; devuelve el File recortado que sube el form. */
async function elegirFoto() {
  const file = new File(['x'], 'original.jpg', { type: 'image/jpeg' });
  fireEvent.change(screen.getByLabelText('Seleccionar foto de perfil'), {
    target: { files: [file] },
  });
  fireEvent.click(await screen.findByRole('button', { name: 'Aplicar' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  return recorte;
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
    disciplinaId: 'disc-futbol',
    disciplina: { id: 'disc-futbol', nombre: 'Fútbol' },
    categoriaId: 'cat-primera',
    categoria: { id: 'cat-primera', nombre: 'Primera' },
    posicion: 'Delantero',
    estado: 'ACTIVO',
    actividadComplementaria: 'GIMNASIO',
    fechaIngreso: new Date('2020-01-01'),
    tieneRepresentante: false,
    fotoKey: null,
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

// ---------------------------------------------------------------------------
// Tests — foto de perfil
// ---------------------------------------------------------------------------

const fotoDeportista = {
  id: 'edit-id-123',
  apellido: 'González',
  nombre: 'Pedro',
  dni: '98765432',
  fechaNacimiento: new Date('1995-05-15'),
  provincia: null,
  ciudad: null,
  genero: null,
  telefono: null,
  email: null,
  domicilioActual: null,
  nacionalidad: null,
  contactoEmergencia: null,
  vivePensionClub: false,
  vivePensionExterna: false,
  observaciones: null,
  disciplinaId: null,
  disciplina: null,
  categoriaId: null,
  categoria: null,
  posicion: null,
  estado: 'ACTIVO',
  actividadComplementaria: null,
  fechaIngreso: null,
  tieneRepresentante: false,
  fotoKey: 'deportistas/vieja.jpg',
  createdAt: new Date(),
  updatedAt: new Date(),
  clubesAnteriores: [],
  historiaDeportiva: [],
  datosEscolares: null,
  datosSociales: null,
  viviendaFamiliar: null,
  datosFamiliares: null,
  necesidadesApoyo: null,
} as unknown as DeportistaWithRelations;

describe('DeportistaForm — foto de perfil', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    URL.createObjectURL = vi.fn(() => 'blob:preview');
    URL.revokeObjectURL = vi.fn();
  });

  test('al guardar con archivo sube la foto y manda el fotoKey', async () => {
    vi.mocked(deportistasApi.uploadFotoDeportista).mockResolvedValue('deportistas/abc.jpg');
    vi.mocked(deportistasApi.createDeportista).mockResolvedValue({
      data: { id: 'new-id-123', type: 'deportistas', attributes: {} as never },
    });

    render(<DeportistaForm mode="create" />, { wrapper });
    completarCamposRequeridos();
    const file = await elegirFoto();
    fireEvent.click(screen.getByText('Guardar'));

    await waitFor(() => {
      expect(deportistasApi.createDeportista).toHaveBeenCalledWith(
        expect.objectContaining({ fotoKey: 'deportistas/abc.jpg' }),
      );
    });
    expect(deportistasApi.uploadFotoDeportista).toHaveBeenCalledWith(file);
  });

  test('sin cambios de foto no sube nada ni manda fotoKey', async () => {
    vi.mocked(deportistasApi.createDeportista).mockResolvedValue({
      data: { id: 'new-id-123', type: 'deportistas', attributes: {} as never },
    });

    render(<DeportistaForm mode="create" />, { wrapper });
    completarCamposRequeridos();
    fireEvent.click(screen.getByText('Guardar'));

    await waitFor(() => {
      expect(deportistasApi.createDeportista).toHaveBeenCalledTimes(1);
    });
    expect(deportistasApi.uploadFotoDeportista).not.toHaveBeenCalled();
    expect(vi.mocked(deportistasApi.createDeportista).mock.calls[0][0].fotoKey).toBeUndefined();
  });

  test('quitar la foto actual manda fotoKey null', async () => {
    vi.mocked(deportistasApi.updateDeportista).mockResolvedValue({
      data: { id: 'edit-id-123', type: 'deportistas', attributes: {} as never },
    });

    render(
      <DeportistaForm
        mode="edit"
        initialData={fotoDeportista}
        fotoUrl="https://s3.example/foto.jpg"
      />,
      { wrapper },
    );
    fireEvent.click(screen.getByRole('button', { name: /quitar/i }));
    fireEvent.click(screen.getByText('Guardar'));

    await waitFor(() => {
      expect(deportistasApi.updateDeportista).toHaveBeenCalledWith(
        'edit-id-123',
        expect.objectContaining({ fotoKey: null }),
      );
    });
    expect(deportistasApi.uploadFotoDeportista).not.toHaveBeenCalled();
  });

  test('cambiar de pestaña conserva la foto pendiente', async () => {
    vi.mocked(deportistasApi.uploadFotoDeportista).mockResolvedValue('deportistas/abc.jpg');
    vi.mocked(deportistasApi.createDeportista).mockResolvedValue({
      data: { id: 'new-id-123', type: 'deportistas', attributes: {} as never },
    });

    render(<DeportistaForm mode="create" />, { wrapper });
    completarCamposRequeridos();
    const file = await elegirFoto();
    fireEvent.click(screen.getByRole('tab', { name: 'Datos Deportivos' }));
    fireEvent.click(screen.getByRole('tab', { name: 'Datos Personales' }));

    expect(screen.getByRole('button', { name: /cambiar/i })).toBeInTheDocument();
    fireEvent.click(screen.getByText('Guardar'));

    await waitFor(() => {
      expect(deportistasApi.uploadFotoDeportista).toHaveBeenCalledWith(file);
    });
  });

  test('descartar una foto nueva no borra la original (no sube ni manda fotoKey)', async () => {
    vi.mocked(deportistasApi.updateDeportista).mockResolvedValue({
      data: { id: 'edit-id-123', type: 'deportistas', attributes: {} as never },
    });

    render(
      <DeportistaForm
        mode="edit"
        initialData={fotoDeportista}
        fotoUrl="https://s3.example/foto.jpg"
      />,
      { wrapper },
    );
    await elegirFoto();
    fireEvent.click(screen.getByRole('button', { name: /descartar/i }));
    fireEvent.click(screen.getByText('Guardar'));

    await waitFor(() => {
      expect(deportistasApi.updateDeportista).toHaveBeenCalledTimes(1);
    });
    expect(deportistasApi.uploadFotoDeportista).not.toHaveBeenCalled();
    expect(vi.mocked(deportistasApi.updateDeportista).mock.calls[0][1].fotoKey).toBeUndefined();
  });

  test('si falla el upload muestra un toast y no guarda', async () => {
    vi.mocked(deportistasApi.uploadFotoDeportista).mockRejectedValue(
      new Error('No se pudo subir la foto. Intentá de nuevo'),
    );

    render(<DeportistaForm mode="create" />, { wrapper });
    completarCamposRequeridos();
    await elegirFoto();
    fireEvent.click(screen.getByText('Guardar'));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('No se pudo subir la foto. Intentá de nuevo');
    });
    expect(deportistasApi.createDeportista).not.toHaveBeenCalled();
    expect(mockRouterPush).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Tests — limpieza de fotos huérfanas
// ---------------------------------------------------------------------------

describe('DeportistaForm — limpieza de la foto subida si falla el guardado', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    URL.createObjectURL = vi.fn(() => 'blob:preview');
    URL.revokeObjectURL = vi.fn();
  });

  function renderEdit() {
    render(
      <DeportistaForm
        mode="edit"
        initialData={fotoDeportista}
        fotoUrl="https://s3.example/foto.jpg"
      />,
      { wrapper },
    );
  }

  test('si falla el create descarta la foto recién subida', async () => {
    vi.mocked(deportistasApi.uploadFotoDeportista).mockResolvedValue('deportistas/nueva.jpg');
    vi.mocked(deportistasApi.createDeportista).mockRejectedValue(
      new deportistasApi.ApiError('La foto ya está asignada a otro deportista', 409),
    );

    render(<DeportistaForm mode="create" />, { wrapper });
    completarCamposRequeridos();
    await elegirFoto();
    fireEvent.click(screen.getByText('Guardar'));

    await waitFor(() => {
      expect(screen.getByText('La foto ya está asignada a otro deportista')).toBeInTheDocument();
    });
    expect(deportistasApi.descartarFotoSubida).toHaveBeenCalledTimes(1);
    expect(deportistasApi.descartarFotoSubida).toHaveBeenCalledWith('deportistas/nueva.jpg');
    expect(mockRouterPush).not.toHaveBeenCalled();
  });

  test('si falla el update con archivo nuevo descarta la foto recién subida, no la guardada', async () => {
    vi.mocked(deportistasApi.uploadFotoDeportista).mockResolvedValue('deportistas/nueva.jpg');
    vi.mocked(deportistasApi.updateDeportista).mockRejectedValue(
      new deportistasApi.ApiError('La foto no se subió correctamente. Volvé a elegirla e intentá de nuevo', 422),
    );

    renderEdit();
    await elegirFoto();
    fireEvent.click(screen.getByText('Guardar'));

    await waitFor(() => {
      expect(
        screen.getByText('La foto no se subió correctamente. Volvé a elegirla e intentá de nuevo'),
      ).toBeInTheDocument();
    });
    expect(deportistasApi.descartarFotoSubida).toHaveBeenCalledTimes(1);
    expect(deportistasApi.descartarFotoSubida).toHaveBeenCalledWith('deportistas/nueva.jpg');
    expect(deportistasApi.descartarFotoSubida).not.toHaveBeenCalledWith('deportistas/vieja.jpg');
  });

  test('si falla el update sin cambios de foto no descarta nada', async () => {
    vi.mocked(deportistasApi.updateDeportista).mockRejectedValue(
      new deportistasApi.ApiError('Error al guardar el deportista', 500),
    );

    renderEdit();
    fireEvent.click(screen.getByText('Guardar'));

    await waitFor(() => {
      expect(screen.getByText('Error al guardar el deportista')).toBeInTheDocument();
    });
    expect(deportistasApi.descartarFotoSubida).not.toHaveBeenCalled();
  });

  test('si falla el update al quitar la foto no descarta nada', async () => {
    vi.mocked(deportistasApi.updateDeportista).mockRejectedValue(
      new deportistasApi.ApiError('Error al guardar el deportista', 500),
    );

    renderEdit();
    fireEvent.click(screen.getByRole('button', { name: /quitar/i }));
    fireEvent.click(screen.getByText('Guardar'));

    await waitFor(() => {
      expect(screen.getByText('Error al guardar el deportista')).toBeInTheDocument();
    });
    expect(deportistasApi.descartarFotoSubida).not.toHaveBeenCalled();
  });

  test('si el create falla por red (fetch lanza) no descarta la foto: el servidor pudo haberla guardado', async () => {
    vi.mocked(deportistasApi.uploadFotoDeportista).mockResolvedValue('deportistas/nueva.jpg');
    vi.mocked(deportistasApi.createDeportista).mockRejectedValue(new TypeError('Failed to fetch'));

    render(<DeportistaForm mode="create" />, { wrapper });
    completarCamposRequeridos();
    await elegirFoto();
    fireEvent.click(screen.getByText('Guardar'));

    await waitFor(() => {
      expect(screen.getByText('Failed to fetch')).toBeInTheDocument();
    });
    expect(deportistasApi.descartarFotoSubida).not.toHaveBeenCalled();
    expect(mockRouterPush).not.toHaveBeenCalled();
  });

  test('si el guardado sale bien no descarta la foto subida', async () => {
    vi.mocked(deportistasApi.uploadFotoDeportista).mockResolvedValue('deportistas/nueva.jpg');
    vi.mocked(deportistasApi.updateDeportista).mockResolvedValue({
      data: { id: 'edit-id-123', type: 'deportistas', attributes: {} as never },
    });

    renderEdit();
    await elegirFoto();
    fireEvent.click(screen.getByText('Guardar'));

    await waitFor(() => {
      expect(mockRouterPush).toHaveBeenCalledWith('/deportistas/edit-id-123');
    });
    expect(deportistasApi.descartarFotoSubida).not.toHaveBeenCalled();
  });
});
