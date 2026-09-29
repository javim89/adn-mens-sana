import { describe, test, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ComidaToggle from '../ComidaToggle';
import type { EntregaView } from '@/lib/types/viandas';

/**
 * El panel ya cubre el toggle dentro de la grilla; acá se prueba la celda sola,
 * que es donde viven las cosas que el panel no puede ver: el `title` que le
 * explica al empleado POR QUÉ una celda está cerrada, el aviso de "fuera de
 * ficha" (que avisa pero no cierra) y el estado en vuelo.
 */
const ENTREGA: EntregaView = {
  lugar: 'ESTANCIA_CHICA',
  entregadoPor: 'user_emp',
  createdAt: '2026-03-14T15:40:00.000Z', // 12:40 ART
};

function renderToggle(over: Partial<React.ComponentProps<typeof ComidaToggle>> = {}) {
  const onToggle = vi.fn();
  render(
    <ComidaToggle
      comida="ALMUERZO"
      deportistaNombre="Pérez, Juan"
      previstaEnFicha
      bloqueado={false}
      pendiente={false}
      onToggle={onToggle}
      {...over}
    />,
  );
  return { onToggle };
}

describe('semántica accesible', () => {
  test('es un switch con nombre de deportista y comida, no un checkbox anónimo', () => {
    renderToggle();
    const celda = screen.getByRole('switch', { name: 'Almuerzo de Pérez, Juan' });
    expect(celda).toHaveAttribute('aria-checked', 'false');
  });

  test('una entrega existente lo deja en aria-checked true', () => {
    renderToggle({ entrega: ENTREGA });
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true');
  });
});

describe('la ficha informa, no bloquea', () => {
  // El bug que originó esto: el responsable no podía entregar una cena porque
  // el administrador se había olvidado de cargarla en la ficha.
  test('una comida que no está en la ficha se puede registrar igual', async () => {
    const user = userEvent.setup();
    const { onToggle } = renderToggle({ previstaEnFicha: false });

    const celda = screen.getByRole('switch');
    expect(celda).toBeEnabled();
    await user.click(celda);
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  test('avisa por title que se aparta de la ficha, sin cerrar la celda', () => {
    renderToggle({ previstaEnFicha: false });
    expect(screen.getByRole('switch')).toHaveAttribute(
      'title',
      'Pérez, Juan no tiene almuerzo en su ficha. Se puede registrar igual.',
    );
  });

  test('el lector de pantalla también recibe el aviso en el nombre accesible', () => {
    renderToggle({ previstaEnFicha: false });
    expect(
      screen.getByRole('switch', { name: 'Almuerzo de Pérez, Juan (fuera de su ficha)' }),
    ).toBeInTheDocument();
  });
});

describe('por qué una celda está cerrada', () => {
  // Sin el title, una celda deshabilitada es indistinguible de un bug. Ya solo
  // queda un motivo real de cierre: no hay lugar de retiro resuelto.
  test('el bloqueo por falta de lugar muestra su propio motivo', () => {
    renderToggle({ bloqueado: true, motivoBloqueo: 'Elegí el lugar de retiro para poder marcar.' });
    const celda = screen.getByRole('switch');
    expect(celda).toBeDisabled();
    expect(celda).toHaveAttribute('title', 'Elegí el lugar de retiro para poder marcar.');
  });

  test('bloqueada no dispara la action ni con un click forzado', async () => {
    const user = userEvent.setup();
    const { onToggle } = renderToggle({ bloqueado: true });

    await user.click(screen.getByRole('switch'));
    expect(onToggle).not.toHaveBeenCalled();
  });

  test('habilitada sí la dispara', async () => {
    const user = userEvent.setup();
    const { onToggle } = renderToggle();

    await user.click(screen.getByRole('switch'));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });
});

describe('estado en vuelo', () => {
  // Evita el doble registro por doble tap mientras la request viaja.
  test('mientras hay una operación en vuelo no se puede volver a tocar', async () => {
    const user = userEvent.setup();
    const { onToggle } = renderToggle({ pendiente: true });

    const celda = screen.getByRole('switch');
    expect(celda).toBeDisabled();
    await user.click(celda);
    expect(onToggle).not.toHaveBeenCalled();
  });
});

describe('rastro de supervisión', () => {
  test('muestra lugar, hora en la zona del club y quién entregó', () => {
    renderToggle({ entrega: ENTREGA, entregadoPorNombre: 'Ana López' });
    expect(screen.getByRole('switch')).toHaveTextContent('Estancia Chica · 12:40 · Ana López');
  });

  test('una celda sin marcar no muestra rastro', () => {
    renderToggle();
    expect(screen.getByRole('switch')).not.toHaveTextContent('·');
  });
});
