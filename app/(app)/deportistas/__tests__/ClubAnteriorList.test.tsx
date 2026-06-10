import { render, screen, fireEvent } from '@testing-library/react';
import { describe, test, expect, vi } from 'vitest';
import ClubAnteriorList from '../_components/ClubAnteriorList';

describe('ClubAnteriorList', () => {
  test('renderiza la lista de clubes pasados como props', () => {
    const clubs = [
      { nombre: 'Club A', periodo: '2018-2020' },
      { nombre: 'Club B', periodo: '2020-2022' },
    ];
    render(<ClubAnteriorList clubs={clubs} onChange={vi.fn()} />);
    expect(screen.getByDisplayValue('Club A')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Club B')).toBeInTheDocument();
  });

  test('muestra texto de lista vacía cuando no hay clubes', () => {
    render(<ClubAnteriorList clubs={[]} onChange={vi.fn()} />);
    expect(screen.getByText(/sin clubes anteriores/i)).toBeInTheDocument();
  });

  test('clicar "Agregar club" llama onChange con un item vacío agregado', () => {
    const onChange = vi.fn();
    render(<ClubAnteriorList clubs={[]} onChange={onChange} />);
    fireEvent.click(screen.getByText('Agregar club'));
    expect(onChange).toHaveBeenCalledWith([{ nombre: '', periodo: '' }]);
  });

  test('clicar el botón de eliminar en una fila llama onChange sin ese item', () => {
    const clubs = [
      { nombre: 'Club A', periodo: '2018-2020' },
      { nombre: 'Club B', periodo: '2020-2022' },
    ];
    const onChange = vi.fn();
    render(<ClubAnteriorList clubs={clubs} onChange={onChange} />);
    const deleteButtons = screen.getAllByLabelText('Eliminar club');
    fireEvent.click(deleteButtons[0]);
    expect(onChange).toHaveBeenCalledWith([{ nombre: 'Club B', periodo: '2020-2022' }]);
  });

  test('cambiar el nombre en un input actualiza el valor', () => {
    const clubs = [{ nombre: 'Club A', periodo: '2018-2020' }];
    const onChange = vi.fn();
    render(<ClubAnteriorList clubs={clubs} onChange={onChange} />);
    const input = screen.getByDisplayValue('Club A');
    fireEvent.change(input, { target: { value: 'Club Modificado' } });
    expect(onChange).toHaveBeenCalledWith([{ nombre: 'Club Modificado', periodo: '2018-2020' }]);
  });
});
