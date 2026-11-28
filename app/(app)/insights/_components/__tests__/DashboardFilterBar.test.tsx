import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import DashboardFilterBar from '../DashboardFilterBar';
import type { DashboardFilter } from '@/lib/actions/insights';

beforeAll(() => {
  // cmdk y Radix (FiltroChip) usan APIs que jsdom no trae.
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
  Element.prototype.scrollIntoView ??= function () {};
  Element.prototype.hasPointerCapture ??= () => false;
});

const filtro = (over: Partial<DashboardFilter>): DashboardFilter => ({
  id: 'f1',
  label: 'Categoría',
  dataset: 'presentismo',
  dimension: 'categoria',
  operator: 'eq',
  valorDefault: null,
  orden: 0,
  widgetIds: ['w1'],
  ...over,
});

const categorias = [
  { id: 'c4', nombre: '4ta' },
  { id: 'c5', nombre: '5ta' },
  { id: 'c6', nombre: '6ta' },
];

function Controlado({ filtros, onChange }: { filtros: DashboardFilter[]; onChange: (id: string, v: unknown) => void }) {
  const [valores, setValores] = useState<Record<string, unknown>>({});
  return (
    <DashboardFilterBar
      filtros={filtros}
      valores={valores}
      categorias={categorias}
      onChange={(id, v) => {
        setValores((prev) => ({ ...prev, [id]: v }));
        onChange(id, v);
      }}
    />
  );
}

describe('DashboardFilterBar', () => {
  it('sin filtros no renderiza nada', () => {
    const { container } = render(<DashboardFilterBar filtros={[]} valores={{}} onChange={() => {}} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('categoría con "in": chip múltiple con el catálogo del club', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Controlado filtros={[filtro({ operator: 'in' })]} onChange={onChange} />);

    await user.click(screen.getByRole('button', { name: 'Categoría' }));
    await user.click(screen.getByRole('option', { name: '4ta' }));
    expect(onChange).toHaveBeenLastCalledWith('f1', ['4ta']);
    await user.click(screen.getByRole('option', { name: '6ta' }));
    expect(onChange).toHaveBeenLastCalledWith('f1', ['4ta', '6ta']);
    expect(screen.getByRole('button', { name: 'Categoría: 2' })).toBeInTheDocument();
  });

  it('categoría con "eq": chip simple', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Controlado filtros={[filtro({ operator: 'eq' })]} onChange={onChange} />);
    await user.click(screen.getByRole('button', { name: 'Categoría' }));
    await user.click(screen.getByRole('option', { name: '5ta' }));
    expect(onChange).toHaveBeenLastCalledWith('f1', '5ta');
    expect(screen.getByRole('button', { name: 'Categoría: 5ta' })).toBeInTheDocument();
  });

  it('un valor "in" guardado como texto separado por comas se muestra como selección', () => {
    render(
      <DashboardFilterBar
        filtros={[filtro({ operator: 'in', valorDefault: '4ta, 5ta' })]}
        valores={{}}
        categorias={categorias}
        onChange={() => {}}
      />,
    );
    expect(screen.getByRole('button', { name: 'Categoría: 2' })).toBeInTheDocument();
  });

  it('fecha con "últimos N días": chip de rango, el valor por defecto y "Todo el período"', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <Controlado
        filtros={[filtro({ id: 'f2', label: 'Período', dimension: 'fecha', operator: 'last_n_days', valorDefault: 84 })]}
        onChange={onChange}
      />,
    );
    const chip = screen.getByRole('button', { name: 'Período: Últimas 12 semanas' });
    await user.click(chip);
    await user.click(screen.getByRole('option', { name: 'Últimos 30 días' }));
    expect(onChange).toHaveBeenLastCalledWith('f2', 30);

    await user.click(screen.getByRole('button', { name: 'Período: Últimos 30 días' }));
    await user.click(screen.getByRole('option', { name: 'Todo el período' }));
    expect(onChange).toHaveBeenLastCalledWith('f2', null);
  });

  it('un rango no estándar se agrega como opción', () => {
    render(
      <DashboardFilterBar
        filtros={[filtro({ id: 'f3', label: 'Período', dimension: 'fecha', operator: 'last_n_days', valorDefault: 14 })]}
        valores={{}}
        onChange={() => {}}
      />,
    );
    expect(screen.getByRole('button', { name: 'Período: Últimos 14 días' })).toBeInTheDocument();
  });

  it('enum: chip con las etiquetas en español', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <Controlado
        filtros={[filtro({ id: 'f4', label: 'Estado', dataset: 'deportistas', dimension: 'estado', operator: 'eq' })]}
        onChange={onChange}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Estado' }));
    await user.click(screen.getByRole('option', { name: 'Activo' }));
    expect(onChange).toHaveBeenLastCalledWith('f4', 'ACTIVO');
  });

  it('operador sin valor: píldora fija; editable muestra editar/eliminar', async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    const f = filtro({ id: 'f5', label: 'Fecha', dimension: 'fecha', operator: 'this_month' });
    render(
      <DashboardFilterBar filtros={[f]} valores={{}} onChange={() => {}} editable onEdit={onEdit} onDelete={onDelete} />,
    );
    expect(screen.getByText('Fecha: este mes')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Editar filtro Fecha' }));
    await user.click(screen.getByRole('button', { name: 'Eliminar filtro Fecha' }));
    expect(onEdit).toHaveBeenCalledWith(f);
    expect(onDelete).toHaveBeenCalledWith(f);
  });
});
