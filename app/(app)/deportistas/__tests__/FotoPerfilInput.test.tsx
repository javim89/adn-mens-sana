import { useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import FotoPerfilInput from '../_components/FotoPerfilInput';

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

const jpg = () => new File(['x'], 'foto.jpg', { type: 'image/jpeg' });

describe('FotoPerfilInput', () => {
  beforeEach(() => {
    URL.createObjectURL = vi.fn(() => 'blob:preview');
    URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('sin foto muestra las iniciales y el botón "Subir foto"', () => {
    render(<Harness />);
    expect(screen.getByText('JG')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /subir foto/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /quitar/i })).not.toBeInTheDocument();
    expect(screen.getByText('JPG, PNG o WebP. Máx. 5 MB.')).toBeInTheDocument();
  });

  test('con foto actual la muestra con "Cambiar" y "Quitar"', () => {
    render(<Harness currentUrl="https://s3.example/foto.jpg" />);
    expect(screen.getByRole('img', { name: 'Foto de perfil' })).toHaveAttribute(
      'src',
      'https://s3.example/foto.jpg',
    );
    expect(screen.getByRole('button', { name: /cambiar/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /quitar/i })).toBeInTheDocument();
  });

  test('al elegir un archivo válido emite el File y muestra la preview', () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    const file = jpg();
    pickFile(file);

    expect(onChange).toHaveBeenCalledWith(file);
    expect(URL.createObjectURL).toHaveBeenCalledWith(file);
    expect(screen.getByRole('img', { name: 'Foto de perfil' })).toHaveAttribute('src', 'blob:preview');
    expect(screen.getByRole('button', { name: /cambiar/i })).toBeInTheDocument();
  });

  test('revoca la URL de la preview al desmontar', () => {
    const { unmount } = render(<Harness />);
    pickFile(jpg());
    unmount();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:preview');
  });

  test('un tipo no permitido muestra error y no emite cambios', () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    pickFile(new File(['x'], 'doc.pdf', { type: 'application/pdf' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Formato no permitido. Usá JPG, PNG o WebP.');
    expect(onChange).not.toHaveBeenCalled();
  });

  test('un archivo de más de 5 MB muestra error y no emite cambios', () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    const grande = new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'grande.png', { type: 'image/png' });
    pickFile(grande);

    expect(screen.getByRole('alert')).toHaveTextContent('La imagen supera los 5 MB.');
    expect(onChange).not.toHaveBeenCalled();
  });

  test('"Quitar" con foto actual emite null y vuelve a las iniciales', () => {
    const onChange = vi.fn();
    render(<Harness currentUrl="https://s3.example/foto.jpg" onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: /quitar/i }));

    expect(onChange).toHaveBeenCalledWith(null);
    expect(screen.getByText('JG')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /subir foto/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /restaurar foto/i })).toBeInTheDocument();
  });

  test('"Descartar" sin foto original vuelve a las iniciales (undefined)', () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    pickFile(jpg());
    expect(screen.queryByRole('button', { name: /quitar/i })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /descartar/i }));

    expect(onChange).toHaveBeenLastCalledWith(undefined);
    expect(screen.getByText('JG')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /subir foto/i })).toBeInTheDocument();
  });

  test('"Descartar" con foto original pendiente de reemplazo vuelve a la foto original', () => {
    const onChange = vi.fn();
    render(<Harness currentUrl="https://s3.example/foto.jpg" onChange={onChange} />);
    pickFile(jpg());
    expect(screen.getByRole('img', { name: 'Foto de perfil' })).toHaveAttribute('src', 'blob:preview');

    fireEvent.click(screen.getByRole('button', { name: /descartar/i }));

    expect(onChange).toHaveBeenLastCalledWith(undefined);
    expect(onChange).not.toHaveBeenCalledWith(null);
    expect(screen.getByRole('img', { name: 'Foto de perfil' })).toHaveAttribute(
      'src',
      'https://s3.example/foto.jpg',
    );
    expect(screen.getByRole('button', { name: /quitar/i })).toBeInTheDocument();
  });

  test('"Restaurar foto" tras quitar la original emite undefined y la vuelve a mostrar', () => {
    const onChange = vi.fn();
    render(<Harness currentUrl="https://s3.example/foto.jpg" onChange={onChange} />);
    expect(screen.queryByRole('button', { name: /restaurar foto/i })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /quitar/i }));
    fireEvent.click(screen.getByRole('button', { name: /restaurar foto/i }));

    expect(onChange).toHaveBeenLastCalledWith(undefined);
    expect(screen.getByRole('img', { name: 'Foto de perfil' })).toHaveAttribute(
      'src',
      'https://s3.example/foto.jpg',
    );
    expect(screen.queryByRole('button', { name: /restaurar foto/i })).not.toBeInTheDocument();
  });

  test('elegir una foto nueva después de quitar la original emite el File', () => {
    const onChange = vi.fn();
    render(<Harness currentUrl="https://s3.example/foto.jpg" onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: /quitar/i }));
    const file = jpg();
    pickFile(file);

    expect(onChange).toHaveBeenLastCalledWith(file);
    expect(screen.getByRole('button', { name: /descartar/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /restaurar foto/i })).not.toBeInTheDocument();
  });

  test('disabled deshabilita botones e input', () => {
    render(<Harness currentUrl="https://s3.example/foto.jpg" disabled />);
    expect(screen.getByRole('button', { name: /cambiar/i })).toBeDisabled();
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
});
