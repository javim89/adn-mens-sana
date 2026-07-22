import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CalendarioFiltro from '../_components/CalendarioFiltro';
import type { CalendarioCategoria } from '@/lib/queries/calendario';

const categorias: CalendarioCategoria[] = [
  { id: 'cat-4', nombre: '4ta', grupo: 'CUARTA_QUINTA_SEXTA' },
  { id: 'cat-5', nombre: '5ta', grupo: 'CUARTA_QUINTA_SEXTA' },
  { id: 'cat-7', nombre: '7ma', grupo: 'SEPTIMA_OCTAVA_NOVENA' },
];

describe('CalendarioFiltro', () => {
  beforeEach(() => vi.clearAllMocks());

  test('muestra la opción "Todas las categorías" además de cada categoría', async () => {
    const user = userEvent.setup();
    render(<CalendarioFiltro categorias={categorias} value="" onChange={() => {}} />);
    await user.click(screen.getByRole('button', { name: 'Categoría' }));
    expect(screen.getByRole('button', { name: 'Todas las categorías' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '4ta' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '5ta' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '7ma' })).toBeInTheDocument();
  });

  test('llama onChange con el categoriaId seleccionado', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<CalendarioFiltro categorias={categorias} value="" onChange={onChange} />);
    await user.click(screen.getByRole('button', { name: 'Categoría' }));
    await user.click(screen.getByRole('button', { name: '7ma' }));
    expect(onChange).toHaveBeenCalledWith('cat-7');
  });

  test('llama onChange con "" al elegir "Todas las categorías"', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<CalendarioFiltro categorias={categorias} value="cat-4" onChange={onChange} />);
    await user.click(screen.getByRole('button', { name: 'Categoría' }));
    await user.click(screen.getByRole('button', { name: 'Todas las categorías' }));
    expect(onChange).toHaveBeenCalledWith('');
  });
});
