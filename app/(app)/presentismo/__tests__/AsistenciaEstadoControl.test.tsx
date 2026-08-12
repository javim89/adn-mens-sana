import { describe, test, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AsistenciaEstadoControl from '../_components/AsistenciaEstadoControl';
import type { EstadoAsistencia } from '@/lib/types/presentismo';

describe('AsistenciaEstadoControl', () => {
  test('renderiza las 4 opciones dentro de un radiogroup', () => {
    render(<AsistenciaEstadoControl value="PRESENTE" onChange={() => {}} />);

    const group = screen.getByRole('radiogroup', { name: /estado de asistencia/i });
    expect(group).toBeInTheDocument();

    const radios = screen.getAllByRole('radio');
    expect(radios).toHaveLength(4);
    // Cada opción expone su label completo via aria-label
    expect(screen.getByRole('radio', { name: 'Presente' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Ausente' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Llegó tarde' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Se retiró antes' })).toBeInTheDocument();
  });

  test('la opción activa tiene aria-checked=true y las demás false', () => {
    render(<AsistenciaEstadoControl value="AUSENTE" onChange={() => {}} />);

    expect(screen.getByRole('radio', { name: 'Ausente' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    expect(screen.getByRole('radio', { name: 'Presente' })).toHaveAttribute(
      'aria-checked',
      'false',
    );
    // Solo la activa es tabbable (roving tabindex)
    expect(screen.getByRole('radio', { name: 'Ausente' })).toHaveAttribute('tabindex', '0');
    expect(screen.getByRole('radio', { name: 'Presente' })).toHaveAttribute('tabindex', '-1');
  });

  test('al clickear una pill llama onChange con el EstadoAsistencia correcto', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<AsistenciaEstadoControl value="PRESENTE" onChange={onChange} />);

    await user.click(screen.getByRole('radio', { name: 'Llegó tarde' }));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith<[EstadoAsistencia]>('LLEGO_TARDE');
  });

  test('ArrowRight avanza a la siguiente opción y llama onChange', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<AsistenciaEstadoControl value="PRESENTE" onChange={onChange} />);

    screen.getByRole('radio', { name: 'Presente' }).focus();
    await user.keyboard('{ArrowRight}');
    expect(onChange).toHaveBeenCalledWith<[EstadoAsistencia]>('AUSENTE');
  });

  test('ArrowLeft desde la primera opción envuelve al final (SE_RETIRO_ANTES)', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<AsistenciaEstadoControl value="PRESENTE" onChange={onChange} />);

    screen.getByRole('radio', { name: 'Presente' }).focus();
    await user.keyboard('{ArrowLeft}');
    expect(onChange).toHaveBeenCalledWith<[EstadoAsistencia]>('SE_RETIRO_ANTES');
  });

  test('ArrowDown/ArrowUp también navegan (accesibilidad de teclado)', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<AsistenciaEstadoControl value="AUSENTE" onChange={onChange} />);

    screen.getByRole('radio', { name: 'Ausente' }).focus();
    await user.keyboard('{ArrowDown}');
    expect(onChange).toHaveBeenLastCalledWith<[EstadoAsistencia]>('LLEGO_TARDE');

    onChange.mockClear();
    // El value prop no cambió (componente controlado); Ausente sigue enfocado
    screen.getByRole('radio', { name: 'Ausente' }).focus();
    await user.keyboard('{ArrowUp}');
    expect(onChange).toHaveBeenLastCalledWith<[EstadoAsistencia]>('PRESENTE');
  });

  test('la pill activa refleja el color del estado (clase de estilo activa)', () => {
    render(<AsistenciaEstadoControl value="AUSENTE" onChange={() => {}} />);
    const ausente = screen.getByRole('radio', { name: 'Ausente' });
    expect(ausente.className).toContain('bg-red-600');
  });
});
