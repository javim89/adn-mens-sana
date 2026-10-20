import { useEffect, useState } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import FotoPerfilInput from '../_components/FotoPerfilInput';
import { getCroppedImage } from '@/lib/crop-image';

// jsdom no tiene layout: el Cropper real nunca calcula el área. El mock emite un área fija al montar.
vi.mock('react-easy-crop', () => ({
  default: function CropperMock({
    image,
    onCropComplete,
  }: {
    image: string;
    onCropComplete: (a: unknown, p: unknown) => void;
  }) {
    useEffect(() => {
      onCropComplete({ x: 0, y: 0, width: 100, height: 100 }, { x: 0, y: 0, width: 50, height: 50 });
      // eslint-disable-next-line react-hooks/exhaustive-deps -- como el Cropper real, emite al montar
    }, []);
    return <div data-testid="cropper" data-image={image} />;
  },
}));

vi.mock('@/lib/crop-image', () => ({
  getCroppedImage: vi.fn(),
}));

function Harness({
  currentUrl = null,
  disabled = false,
  onChange = vi.fn(),
}: {
  currentUrl?: string | null;
  disabled?: boolean;
  onChange?: (value: File | null | undefined) => void;
}) {
  const [value, setValue] = useState<File | null | undefined>(undefined);
  return (
    <FotoPerfilInput
      value={value}
      currentUrl={currentUrl}
      iniciales="JG"
      disabled={disabled}
      onChange={(v) => {
        setValue(v);
        onChange(v);
      }}
    />
  );
}

function pickFile(file: File) {
  fireEvent.change(screen.getByLabelText('Seleccionar foto de perfil'), {
    target: { files: [file] },
  });
}

async function aplicar() {
  fireEvent.click(await screen.findByRole('button', { name: 'Aplicar' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
}

/** Elegir archivo + "Aplicar" en el editor: el flujo completo de una foto nueva. */
async function pickAndApply(file: File) {
  pickFile(file);
  await aplicar();
}

const jpg = () => new File(['x'], 'foto.jpg', { type: 'image/jpeg' });
const recorte = new File(['r'], 'recorte.jpg', { type: 'image/jpeg' });
const avatar = () => screen.getByRole('img', { name: 'Foto de perfil' });

describe('FotoPerfilInput', () => {
  beforeEach(() => {
    URL.createObjectURL = vi.fn((f: Blob) => `blob:${(f as File).name}`);
    URL.revokeObjectURL = vi.fn();
    vi.mocked(getCroppedImage).mockReset().mockResolvedValue(recorte);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  test('sin foto muestra las iniciales y el botón "Subir foto"', () => {
    render(<Harness />);
    expect(screen.getByText('JG')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /subir foto/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /quitar/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /ajustar/i })).not.toBeInTheDocument();
    expect(screen.getByText('JPG, PNG o WebP. Máx. 20 MB.')).toBeInTheDocument();
  });

  test('con foto actual la muestra con "Cambiar", "Ajustar" y "Quitar"', () => {
    render(<Harness currentUrl="https://s3.example/foto.jpg" />);
    expect(avatar()).toHaveAttribute('src', 'https://s3.example/foto.jpg');
    expect(screen.getByRole('button', { name: /cambiar/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /ajustar/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /quitar/i })).toBeInTheDocument();
  });

  test('al elegir un archivo abre el editor y no emite hasta "Aplicar"', async () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    const file = jpg();
    pickFile(file);

    expect(screen.getByRole('dialog', { name: 'Ajustar foto' })).toBeInTheDocument();
    expect(screen.getByTestId('cropper')).toHaveAttribute('data-image', 'blob:foto.jpg');
    expect(onChange).not.toHaveBeenCalled();

    await aplicar();

    expect(getCroppedImage).toHaveBeenCalledWith('blob:foto.jpg', expect.any(Object), 0);
    expect(onChange).toHaveBeenCalledWith(recorte);
    expect(avatar()).toHaveAttribute('src', 'blob:recorte.jpg');
    expect(screen.getByRole('button', { name: /cambiar/i })).toBeInTheDocument();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:foto.jpg');
  });

  test('"Cancelar" en el editor no cambia nada', () => {
    const onChange = vi.fn();
    render(<Harness currentUrl="https://s3.example/foto.jpg" onChange={onChange} />);
    pickFile(jpg());
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
    expect(avatar()).toHaveAttribute('src', 'https://s3.example/foto.jpg');
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:foto.jpg');
  });

  test('revoca la URL de la preview al desmontar', async () => {
    const { unmount } = render(<Harness />);
    await pickAndApply(jpg());
    unmount();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:recorte.jpg');
  });

  test('un tipo no permitido muestra error, no abre el editor ni emite cambios', () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    pickFile(new File(['x'], 'doc.pdf', { type: 'application/pdf' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Formato no permitido. Usá JPG, PNG o WebP.');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });

  test('un original de entre 5 y 20 MB se acepta y abre el editor', () => {
    render(<Harness />);
    pickFile(new File([new Uint8Array(8 * 1024 * 1024)], 'celular.jpg', { type: 'image/jpeg' }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Ajustar foto' })).toBeInTheDocument();
  });

  test('un archivo de más de 20 MB muestra error y no emite cambios', () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    const grande = new File([new Uint8Array(20 * 1024 * 1024 + 1)], 'grande.png', { type: 'image/png' });
    pickFile(grande);

    expect(screen.getByRole('alert')).toHaveTextContent('La imagen supera los 20 MB.');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });

  test('un recorte de más de 5 MB muestra error y no emite cambios', async () => {
    vi.mocked(getCroppedImage).mockResolvedValue(
      new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'recorte.jpg', { type: 'image/jpeg' }),
    );
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    await pickAndApply(jpg());

    expect(screen.getByRole('alert')).toHaveTextContent('La imagen recortada supera los 5 MB.');
    expect(onChange).not.toHaveBeenCalled();
  });

  test('"Ajustar" sobre una foto pendiente reabre el editor con el original', async () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    await pickAndApply(jpg());

    fireEvent.click(screen.getByRole('button', { name: /ajustar/i }));
    expect(screen.getByTestId('cropper')).toHaveAttribute('data-image', 'blob:foto.jpg');

    const recorte2 = new File(['r2'], 'recorte2.jpg', { type: 'image/jpeg' });
    vi.mocked(getCroppedImage).mockResolvedValue(recorte2);
    await aplicar();
    expect(onChange).toHaveBeenLastCalledWith(recorte2);

    // El original se conserva a través de reajustes sucesivos.
    fireEvent.click(screen.getByRole('button', { name: /ajustar/i }));
    expect(screen.getByTestId('cropper')).toHaveAttribute('data-image', 'blob:foto.jpg');
  });

  test('"Ajustar" sobre la foto guardada la baja sin caché y abre el editor', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(new Blob(['s3'], { type: 'image/jpeg' })),
    });
    vi.stubGlobal('fetch', fetchMock);
    const onChange = vi.fn();
    render(<Harness currentUrl="https://s3.example/foto.jpg" onChange={onChange} />);

    fireEvent.click(screen.getByRole('button', { name: /ajustar/i }));

    expect(await screen.findByRole('dialog', { name: 'Ajustar foto' })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith('https://s3.example/foto.jpg', {
      mode: 'cors',
      cache: 'no-store',
    });
    expect(screen.getByTestId('cropper')).toHaveAttribute('data-image', 'blob:foto');

    await aplicar();
    expect(onChange).toHaveBeenCalledWith(recorte);
  });

  test('si la foto guardada no se puede bajar muestra error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 403 }));
    render(<Harness currentUrl="https://s3.example/foto.jpg" />);
    fireEvent.click(screen.getByRole('button', { name: /ajustar/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No se pudo cargar la foto actual para ajustarla.',
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  test('"Quitar" con foto actual emite null y vuelve a las iniciales', () => {
    const onChange = vi.fn();
    render(<Harness currentUrl="https://s3.example/foto.jpg" onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: /quitar/i }));

    expect(onChange).toHaveBeenCalledWith(null);
    expect(screen.getByText('JG')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /subir foto/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /restaurar foto/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /ajustar/i })).not.toBeInTheDocument();
  });

  test('"Descartar" sin foto original vuelve a las iniciales (undefined)', async () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    await pickAndApply(jpg());
    expect(screen.queryByRole('button', { name: /quitar/i })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /descartar/i }));

    expect(onChange).toHaveBeenLastCalledWith(undefined);
    expect(screen.getByText('JG')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /subir foto/i })).toBeInTheDocument();
  });

  test('"Descartar" con foto original pendiente de reemplazo vuelve a la foto original', async () => {
    const onChange = vi.fn();
    render(<Harness currentUrl="https://s3.example/foto.jpg" onChange={onChange} />);
    await pickAndApply(jpg());
    expect(avatar()).toHaveAttribute('src', 'blob:recorte.jpg');

    fireEvent.click(screen.getByRole('button', { name: /descartar/i }));

    expect(onChange).toHaveBeenLastCalledWith(undefined);
    expect(onChange).not.toHaveBeenCalledWith(null);
    expect(avatar()).toHaveAttribute('src', 'https://s3.example/foto.jpg');
    expect(screen.getByRole('button', { name: /quitar/i })).toBeInTheDocument();
  });

  test('"Restaurar foto" tras quitar la original emite undefined y la vuelve a mostrar', () => {
    const onChange = vi.fn();
    render(<Harness currentUrl="https://s3.example/foto.jpg" onChange={onChange} />);
    expect(screen.queryByRole('button', { name: /restaurar foto/i })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /quitar/i }));
    fireEvent.click(screen.getByRole('button', { name: /restaurar foto/i }));

    expect(onChange).toHaveBeenLastCalledWith(undefined);
    expect(avatar()).toHaveAttribute('src', 'https://s3.example/foto.jpg');
    expect(screen.queryByRole('button', { name: /restaurar foto/i })).not.toBeInTheDocument();
  });

  test('elegir una foto nueva después de quitar la original emite el recorte', async () => {
    const onChange = vi.fn();
    render(<Harness currentUrl="https://s3.example/foto.jpg" onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: /quitar/i }));
    await pickAndApply(jpg());

    expect(onChange).toHaveBeenLastCalledWith(recorte);
    expect(screen.getByRole('button', { name: /descartar/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /restaurar foto/i })).not.toBeInTheDocument();
  });

  test('disabled deshabilita botones e input', () => {
    render(<Harness currentUrl="https://s3.example/foto.jpg" disabled />);
    expect(screen.getByRole('button', { name: /cambiar/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /ajustar/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /quitar/i })).toBeDisabled();
    expect(screen.getByLabelText('Seleccionar foto de perfil')).toBeDisabled();
  });

  test('el input oculto queda fuera del orden de tab (el botón es el control)', () => {
    render(<Harness />);
    expect(screen.getByLabelText('Seleccionar foto de perfil')).toHaveAttribute('tabindex', '-1');
  });

  test('al quitar y restaurar, el foco pasa al botón principal en vez de perderse', () => {
    render(<Harness currentUrl="https://s3.example/foto.jpg" />);
    fireEvent.click(screen.getByRole('button', { name: /quitar/i }));
    expect(screen.getByRole('button', { name: /subir foto/i })).toHaveFocus();

    fireEvent.click(screen.getByRole('button', { name: /restaurar foto/i }));
    expect(screen.getByRole('button', { name: /cambiar/i })).toHaveFocus();
  });

  // Regresión: sin DialogTrigger, Radix mandaba el foco a <body> al cerrar el editor.
  test('al cerrar el editor abierto desde "Subir foto" el foco vuelve a ese botón', async () => {
    render(<Harness />);
    screen.getByRole('button', { name: /subir foto/i }).focus();
    pickFile(jpg());
    fireEvent.click(await screen.findByRole('button', { name: 'Cancelar' }));

    await waitFor(() => expect(screen.getByRole('button', { name: /subir foto/i })).toHaveFocus());
  });

  test('al aplicar desde "Ajustar" el foco vuelve a "Ajustar"', async () => {
    render(<Harness />);
    await pickAndApply(jpg());
    fireEvent.click(screen.getByRole('button', { name: /ajustar/i }));
    await aplicar();

    await waitFor(() => expect(screen.getByRole('button', { name: /ajustar/i })).toHaveFocus());
  });
});
