import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import DeportistaSelect from '../_components/DeportistaSelect';

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockResolvedValue({
    ok: true,
    json: async () => ({ data: [] }),
  });
  vi.stubGlobal('fetch', fetchMock);
});

describe('DeportistaSelect', () => {
  test('sin filtros, el fetch NO incluye filter[disciplina] ni filter[categoriaId]', async () => {
    const user = userEvent.setup();
    render(<DeportistaSelect value={[]} onChange={() => {}} />, { wrapper });

    // Abrir el dropdown dispara la query
    await user.click(screen.getByRole('button', { name: /Buscar deportista/i }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).not.toContain('filter%5Bdisciplina%5D');
    expect(url).not.toContain('filter%5BcategoriaId%5D');
  });

  test('con disciplinaId y categoriaId, el fetch incluye ambos filtros', async () => {
    const user = userEvent.setup();
    render(
      <DeportistaSelect
        value={[]}
        onChange={() => {}}
        disciplinaId="disc-1"
        categoriaId="cat-1"
      />,
      { wrapper },
    );

    await user.click(screen.getByRole('button', { name: /Buscar deportista/i }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain('filter%5Bdisciplina%5D=disc-1');
    expect(url).toContain('filter%5BcategoriaId%5D=cat-1');
  });
});
