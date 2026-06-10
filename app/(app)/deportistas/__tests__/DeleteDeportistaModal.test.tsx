import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import DeleteDeportistaModal from '../_components/DeleteDeportistaModal';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

// Mock the API helper
vi.mock('@/lib/api/deportistas', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/lib/api/deportistas')>();
  return {
    ...original,
    deleteDeportista: vi.fn().mockResolvedValue(undefined),
  };
});

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('DeleteDeportistaModal', () => {
  const defaultProps = {
    deportistaId: 'test-id-123',
    deportistaNombre: 'García, Juan',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('el botón "Eliminar" está visible en el DOM', () => {
    render(<DeleteDeportistaModal {...defaultProps} />, { wrapper });
    expect(screen.getByText('Eliminar')).toBeInTheDocument();
  });

  test('el modal no está visible inicialmente', () => {
    render(<DeleteDeportistaModal {...defaultProps} />, { wrapper });
    const dialog = screen.getByTestId('delete-modal');
    expect(dialog).toHaveStyle({ display: 'none' });
  });

  test('clicar "Eliminar" abre el modal', () => {
    render(<DeleteDeportistaModal {...defaultProps} />, { wrapper });
    fireEvent.click(screen.getByText('Eliminar'));
    const dialog = screen.getByTestId('delete-modal');
    expect(dialog).toHaveStyle({ display: 'flex' });
  });

  test('el modal muestra el nombre del deportista', () => {
    render(<DeleteDeportistaModal {...defaultProps} />, { wrapper });
    fireEvent.click(screen.getByText('Eliminar'));
    expect(screen.getByText('García, Juan')).toBeInTheDocument();
  });

  test('"Cancelar" cierra el modal', () => {
    render(<DeleteDeportistaModal {...defaultProps} />, { wrapper });
    fireEvent.click(screen.getByText('Eliminar'));
    fireEvent.click(screen.getByText('Cancelar'));
    const dialog = screen.getByTestId('delete-modal');
    expect(dialog).toHaveStyle({ display: 'none' });
  });

  test('"Confirmar eliminación" llama deleteDeportista con el id correcto', async () => {
    const { deleteDeportista } = await import('@/lib/api/deportistas');
    render(<DeleteDeportistaModal {...defaultProps} />, { wrapper });
    fireEvent.click(screen.getByText('Eliminar'));
    fireEvent.click(screen.getByRole('button', { name: /confirmar eliminación/i }));
    await waitFor(() => {
      expect(deleteDeportista).toHaveBeenCalledWith('test-id-123');
    });
  });
});
