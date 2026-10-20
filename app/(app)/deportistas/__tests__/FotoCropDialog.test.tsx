import { useEffect } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import FotoCropDialog from '../_components/FotoCropDialog';
import { getCroppedImage } from '@/lib/crop-image';

// jsdom no tiene layout: el Cropper real nunca calcula el área. El mock expone zoom/rotación y emite un área fija.
vi.mock('react-easy-crop', () => ({
  default: function CropperMock(props: {
    zoom: number;
    rotation: number;
    crop: { x: number; y: number };
    cropShape: string;
    aspect: number;
    onCropComplete: (a: unknown, p: unknown) => void;
    cropperProps?: React.HTMLAttributes<HTMLDivElement>;
  }) {
    const { onCropComplete } = props;
    useEffect(() => {
      onCropComplete({ x: 0, y: 0, width: 100, height: 100 }, { x: 5, y: 6, width: 300, height: 300 });
      // eslint-disable-next-line react-hooks/exhaustive-deps -- como el Cropper real, emite al montar, no en cada render
    }, []);
    return (
      <div
        data-testid="cropper"
        data-zoom={props.zoom}
        data-rotation={props.rotation}
        data-shape={props.cropShape}
        data-aspect={props.aspect}
        {...props.cropperProps}
      />
    );
  },
}));

vi.mock('@/lib/crop-image', () => ({
  getCroppedImage: vi.fn(),
}));

const recorte = new File(['c'], 'foto.jpg', { type: 'image/jpeg' });

function renderDialog(overrides: Partial<React.ComponentProps<typeof FotoCropDialog>> = {}) {
  const props = { open: true, src: 'blob:original', onCancel: vi.fn(), onApply: vi.fn(), ...overrides };
  render(<FotoCropDialog {...props} />);
  return props;
}

const cropper = () => screen.getByTestId('cropper');

describe('FotoCropDialog', () => {
  beforeEach(() => {
    vi.mocked(getCroppedImage).mockReset().mockResolvedValue(recorte);
  });

  test('muestra el editor con máscara redonda 1:1', () => {
    renderDialog();
    expect(screen.getByRole('dialog', { name: 'Ajustar foto' })).toBeInTheDocument();
    expect(cropper()).toHaveAttribute('data-shape', 'round');
    expect(cropper()).toHaveAttribute('data-aspect', '1');
    expect(cropper()).toHaveAttribute('data-zoom', '1');
  });

  test('los botones −/+ cambian el zoom dentro de 1×–3×', () => {
    renderDialog();
    expect(screen.getByRole('button', { name: 'Alejar' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Acercar' }));
    expect(cropper()).toHaveAttribute('data-zoom', '1.25');
    fireEvent.click(screen.getByRole('button', { name: 'Alejar' }));
    expect(cropper()).toHaveAttribute('data-zoom', '1');
  });

  test('el slider de zoom cambia el valor', () => {
    renderDialog();
    const slider = screen.getByLabelText('Zoom');
    expect(slider).toHaveAttribute('min', '1');
    expect(slider).toHaveAttribute('max', '3');
    fireEvent.change(slider, { target: { value: '2.5' } });
    expect(cropper()).toHaveAttribute('data-zoom', '2.5');
    expect(screen.getByRole('button', { name: 'Acercar' })).toBeEnabled();
  });

  test('rotar ±90° y el slider fino', () => {
    renderDialog();
    fireEvent.click(screen.getByRole('button', { name: 'Rotar 90° a la derecha' }));
    expect(cropper()).toHaveAttribute('data-rotation', '90');
    fireEvent.click(screen.getByRole('button', { name: 'Rotar 90° a la izquierda' }));
    fireEvent.click(screen.getByRole('button', { name: 'Rotar 90° a la izquierda' }));
    expect(cropper()).toHaveAttribute('data-rotation', '-90');
    fireEvent.change(screen.getByLabelText('Rotación'), { target: { value: '12' } });
    expect(cropper()).toHaveAttribute('data-rotation', '12');
  });

  // Regresión: normalizar el valor del slider hacía saltar el control de 180 a -180.
  test('el slider de rotación llega a 180 sin saltar a -180', () => {
    renderDialog();
    fireEvent.change(screen.getByLabelText('Rotación'), { target: { value: '180' } });
    expect(cropper()).toHaveAttribute('data-rotation', '180');
    expect(screen.getByLabelText('Rotación')).toHaveValue('180');
  });

  test('el área de recorte (enfocable con teclado) tiene nombre accesible', () => {
    renderDialog();
    expect(cropper()).toHaveAccessibleName(/área de recorte/i);
  });

  test('la rotación se normaliza a [-180, 180)', () => {
    renderDialog();
    const derecha = screen.getByRole('button', { name: 'Rotar 90° a la derecha' });
    fireEvent.click(derecha);
    fireEvent.click(derecha);
    expect(cropper()).toHaveAttribute('data-rotation', '-180');
    fireEvent.click(derecha);
    expect(cropper()).toHaveAttribute('data-rotation', '-90');
  });

  test('"Restablecer" vuelve zoom y rotación a los valores iniciales', () => {
    renderDialog();
    fireEvent.click(screen.getByRole('button', { name: 'Acercar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Rotar 90° a la derecha' }));
    fireEvent.click(screen.getByRole('button', { name: 'Restablecer' }));
    expect(cropper()).toHaveAttribute('data-zoom', '1');
    expect(cropper()).toHaveAttribute('data-rotation', '0');
  });

  test('"Cancelar" llama onCancel sin recortar', () => {
    const { onCancel, onApply } = renderDialog();
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onApply).not.toHaveBeenCalled();
    expect(getCroppedImage).not.toHaveBeenCalled();
  });

  test('"Aplicar" recorta con el área y la rotación actuales y emite el File', async () => {
    const { onApply } = renderDialog();
    fireEvent.click(screen.getByRole('button', { name: 'Rotar 90° a la derecha' }));
    fireEvent.click(screen.getByRole('button', { name: 'Aplicar' }));

    await waitFor(() => expect(onApply).toHaveBeenCalledWith(recorte));
    expect(getCroppedImage).toHaveBeenCalledWith(
      'blob:original',
      { x: 5, y: 6, width: 300, height: 300 },
      90,
    );
  });

  test('mientras aplica deshabilita los botones', async () => {
    let resolve!: (f: File) => void;
    vi.mocked(getCroppedImage).mockReturnValue(new Promise((r) => (resolve = r)));
    renderDialog();
    fireEvent.click(screen.getByRole('button', { name: 'Aplicar' }));

    expect(await screen.findByRole('button', { name: /aplicando/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled();
    resolve(recorte);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Aplicar' })).toBeEnabled());
  });

  test('si falla el recorte muestra un error y no emite', async () => {
    vi.mocked(getCroppedImage).mockRejectedValue(new Error('canvas'));
    const { onApply } = renderDialog();
    fireEvent.click(screen.getByRole('button', { name: 'Aplicar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo procesar la imagen');
    expect(onApply).not.toHaveBeenCalled();
  });
});
