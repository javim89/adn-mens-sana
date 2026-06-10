import { render, screen, fireEvent } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import DeleteDeportistaModal from '../_components/DeleteDeportistaModal';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

// Mock the server action
vi.mock('@/lib/actions/deportistas', () => ({
  deleteDeportista: vi.fn().mockResolvedValue({ success: true }),
}));

describe('DeleteDeportistaModal', () => {
  const defaultProps = {
    deportistaId: 'test-id-123',
    deportistaNombre: 'García, Juan',
  };

  test('el botón "Eliminar" está visible en el DOM', () => {
    render(<DeleteDeportistaModal {...defaultProps} />);
    expect(screen.getByText('Eliminar')).toBeInTheDocument();
  });

  test('el modal no está visible inicialmente', () => {
    render(<DeleteDeportistaModal {...defaultProps} />);
    const dialog = screen.getByTestId('delete-modal');
    expect(dialog).toHaveStyle({ display: 'none' });
  });

  test('clicar "Eliminar" abre el modal', () => {
    render(<DeleteDeportistaModal {...defaultProps} />);
    fireEvent.click(screen.getByText('Eliminar'));
    const dialog = screen.getByTestId('delete-modal');
    expect(dialog).toHaveStyle({ display: 'flex' });
  });

  test('el modal muestra el nombre del deportista', () => {
    render(<DeleteDeportistaModal {...defaultProps} />);
    fireEvent.click(screen.getByText('Eliminar'));
    expect(screen.getByText('García, Juan')).toBeInTheDocument();
  });

  test('"Cancelar" cierra el modal', () => {
    render(<DeleteDeportistaModal {...defaultProps} />);
    fireEvent.click(screen.getByText('Eliminar'));
    fireEvent.click(screen.getByText('Cancelar'));
    const dialog = screen.getByTestId('delete-modal');
    expect(dialog).toHaveStyle({ display: 'none' });
  });

  test('"Confirmar eliminación" llama deleteDeportista con el id correcto', async () => {
    const { deleteDeportista } = await import('@/lib/actions/deportistas');
    render(<DeleteDeportistaModal {...defaultProps} />);
    fireEvent.click(screen.getByText('Eliminar'));
    // Use role='button' to distinguish the button from the heading
    fireEvent.click(screen.getByRole('button', { name: /confirmar eliminación/i }));
    expect(deleteDeportista).toHaveBeenCalledWith('test-id-123');
  });
});
