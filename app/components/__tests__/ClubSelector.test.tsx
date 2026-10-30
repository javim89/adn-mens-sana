import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const { mockCambiar, mockToastError } = vi.hoisted(() => ({
  mockCambiar: vi.fn(),
  mockToastError: vi.fn(),
}));

vi.mock('@/lib/actions/club-activo', () => ({ cambiarClubActivo: mockCambiar }));
vi.mock('sonner', () => ({ toast: { error: mockToastError, success: vi.fn() } }));

import ClubSelector from '../ClubSelector';

const A = { id: 'club_a', nombre: 'Club A' };
const B = { id: 'club_b', nombre: 'Club B' };

beforeEach(() => {
  vi.clearAllMocks();
  mockCambiar.mockResolvedValue(undefined);
});

describe('ClubSelector', () => {
  it('con una sola membresía no se muestra', () => {
    const { container } = render(<ClubSelector clubes={[A]} clubActual={A} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('sin membresías no se muestra', () => {
    const { container } = render(<ClubSelector clubes={[]} clubActual={A} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('con más de un club muestra un select etiquetado con el club actual elegido', () => {
    render(<ClubSelector clubes={[A, B]} clubActual={A} />);

    const select = screen.getByLabelText('Club') as HTMLSelectElement;
    expect(select.value).toBe('club_a');
    expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual(['Club A', 'Club B']);
  });

  it('elegir otro club llama a cambiarClubActivo con su id', async () => {
    render(<ClubSelector clubes={[A, B]} clubActual={A} />);

    await userEvent.selectOptions(screen.getByLabelText('Club'), 'club_b');

    await waitFor(() => expect(mockCambiar).toHaveBeenCalledWith('club_b'));
  });

  it('si la action devuelve error, lo muestra en un toast', async () => {
    mockCambiar.mockResolvedValue({ ok: false, error: 'No tenés acceso a ese club' });
    render(<ClubSelector clubes={[A, B]} clubActual={A} />);

    await userEvent.selectOptions(screen.getByLabelText('Club'), 'club_b');

    await waitFor(() => expect(mockToastError).toHaveBeenCalledWith('No tenés acceso a ese club'));
  });

  it('un superadmin dentro de un club ajeno lo ve como opción deshabilitada', () => {
    const C = { id: 'club_c', nombre: 'Club C' };
    render(<ClubSelector clubes={[A, B]} clubActual={C} />);

    const opcionC = screen.getByRole('option', { name: 'Club C' }) as HTMLOptionElement;
    expect(opcionC.disabled).toBe(true);
    expect((screen.getByLabelText('Club') as HTMLSelectElement).value).toBe('club_c');
  });
});
