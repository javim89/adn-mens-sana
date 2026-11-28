import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, test, expect, vi, beforeAll } from 'vitest';
import { useState } from 'react';
import { FiltroChip } from '../filtro-chip';

beforeAll(() => {
  // cmdk y Radix usan APIs que jsdom no trae.
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
  Element.prototype.scrollIntoView ??= function () {};
  Element.prototype.hasPointerCapture ??= () => false;
});

const PRIORIDADES = [
  { value: 'BAJA', label: 'Baja' },
  { value: 'ALTA', label: 'Alta' },
  { value: 'URGENTE', label: 'Urgente' },
];

function Simple({ inicial = null, onChange }: { inicial?: string | null; onChange?: (v: string | null) => void }) {
  const [valor, setValor] = useState<string | null>(inicial);
  return (
    <FiltroChip
      label="Prioridad"
      opciones={PRIORIDADES}
      valor={valor}
      onChange={(v) => {
        setValor(v);
        onChange?.(v);
      }}
    />
  );
}

function Multiple({ inicial = [], onChange }: { inicial?: string[]; onChange?: (v: string[]) => void }) {
  const [valor, setValor] = useState<string[]>(inicial);
  return (
    <FiltroChip
      label="Prioridad"
      modo="multiple"
      opciones={PRIORIDADES}
      valor={valor}
      onChange={(v) => {
        setValor(v);
        onChange?.(v);
      }}
    />
  );
}

describe('FiltroChip', () => {
  test('trigger accesible y estilo neutro sin valor', async () => {
    const user = userEvent.setup();
    render(<Simple />);
    const trigger = screen.getByRole('button', { name: 'Prioridad' });
    expect(trigger).toHaveAttribute('aria-haspopup');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).not.toHaveClass('bg-primario-suave');
    await user.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('option', { name: 'Todos' })).toHaveAttribute('aria-checked', 'true');
  });

  test('simple: elegir una opción llama onChange, cierra y resalta', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Simple onChange={onChange} />);
    await user.click(screen.getByRole('button', { name: 'Prioridad' }));
    await user.click(screen.getByRole('option', { name: 'Alta' }));
    expect(onChange).toHaveBeenCalledWith('ALTA');
    const trigger = screen.getByRole('button', { name: 'Prioridad: Alta' });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).toHaveClass('bg-primario-suave', 'text-primario');
  });

  test('simple: se navega con teclado', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Simple onChange={onChange} />);
    await user.click(screen.getByRole('button', { name: 'Prioridad' }));
    // Primer ítem resaltado = "Todos"; dos flechas abajo = "Alta".
    await user.keyboard('{ArrowDown}{ArrowDown}{Enter}');
    expect(onChange).toHaveBeenCalledWith('ALTA');
  });

  test('múltiple: tilda y destilda sin cerrar, y muestra la cantidad', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Multiple onChange={onChange} />);
    await user.click(screen.getByRole('button', { name: 'Prioridad' }));
    await user.click(screen.getByRole('option', { name: 'Alta' }));
    expect(onChange).toHaveBeenLastCalledWith(['ALTA']);
    expect(screen.getByRole('button', { name: 'Prioridad: Alta' })).toHaveAttribute('aria-expanded', 'true');

    await user.click(screen.getByRole('option', { name: 'Urgente' }));
    expect(onChange).toHaveBeenLastCalledWith(['ALTA', 'URGENTE']);
    expect(screen.getByRole('button', { name: 'Prioridad: 2' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Urgente' })).toHaveAttribute('aria-checked', 'true');

    await user.click(screen.getByRole('option', { name: 'Alta' }));
    expect(onChange).toHaveBeenLastCalledWith(['URGENTE']);
    expect(screen.getByRole('button', { name: 'Prioridad: Urgente' })).toBeInTheDocument();
  });

  test('"Todos" limpia (simple → null, múltiple → [])', async () => {
    const user = userEvent.setup();
    const onSimple = vi.fn();
    const { unmount } = render(<Simple inicial="BAJA" onChange={onSimple} />);
    await user.click(screen.getByRole('button', { name: 'Prioridad: Baja' }));
    await user.click(screen.getByRole('option', { name: 'Todos' }));
    expect(onSimple).toHaveBeenCalledWith(null);
    expect(screen.getByRole('button', { name: 'Prioridad' })).not.toHaveClass('bg-primario-suave');
    unmount();

    const onMultiple = vi.fn();
    render(<Multiple inicial={['ALTA', 'URGENTE']} onChange={onMultiple} />);
    await user.click(screen.getByRole('button', { name: 'Prioridad: 2' }));
    await user.click(screen.getByRole('option', { name: 'Todos' }));
    expect(onMultiple).toHaveBeenCalledWith([]);
    expect(screen.getByRole('button', { name: 'Prioridad' })).toBeInTheDocument();
  });

  test('todosLabel personaliza la opción que limpia', async () => {
    const user = userEvent.setup();
    render(<FiltroChip label="Área" opciones={PRIORIDADES} valor={null} onChange={() => {}} todosLabel="Todas las áreas" />);
    await user.click(screen.getByRole('button', { name: 'Área' }));
    expect(screen.getByRole('option', { name: 'Todas las áreas' })).toBeInTheDocument();
  });

  test('buscar filtra por el texto visible, sin acentos', async () => {
    const user = userEvent.setup();
    render(
      <FiltroChip
        label="Disciplina"
        buscar
        opciones={[
          { value: 'd1', label: 'Fútbol' },
          { value: 'd2', label: 'Básquet' },
        ]}
        valor={null}
        onChange={() => {}}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Disciplina' }));
    await user.type(screen.getByPlaceholderText('Buscar disciplina…'), 'futbol');
    expect(screen.getByRole('option', { name: 'Fútbol' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Básquet' })).toBeNull();
  });
});
