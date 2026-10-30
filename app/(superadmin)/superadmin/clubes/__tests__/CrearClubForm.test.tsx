import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const { mockCrear, mockEntrar, mockSetActivo, mockRefresh, mockToast } = vi.hoisted(() => ({
  mockCrear: vi.fn(),
  mockEntrar: vi.fn(),
  mockSetActivo: vi.fn(),
  mockRefresh: vi.fn(),
  mockToast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('@/lib/actions/superadmin', () => ({
  crearClub: mockCrear,
  entrarAClub: mockEntrar,
  setClubActivo: mockSetActivo,
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: mockRefresh }) }));
vi.mock('sonner', () => ({ toast: mockToast }));

import CrearClubForm from '../_components/CrearClubForm';
import ClubesTable from '../_components/ClubesTable';

beforeEach(() => {
  vi.clearAllMocks();
  mockCrear.mockResolvedValue({ ok: true, clubId: 'club_nuevo', admin: 'invitado' });
});

async function completar() {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText('Nombre del club'), 'Club Atlético Ñandú');
  await user.type(screen.getByLabelText('Nombre'), 'Ana');
  await user.type(screen.getByLabelText('Apellido'), 'Paz');
  await user.type(screen.getByLabelText('Email'), 'ana@nandu.com');
  return user;
}

describe('CrearClubForm', () => {
  it('sugiere el slug a partir del nombre', async () => {
    render(<CrearClubForm />);
    await userEvent.type(screen.getByLabelText('Nombre del club'), 'Club Atlético Ñandú');
    expect(screen.getByLabelText('Slug')).toHaveValue('club-atletico-nandu');
  });

  it('un slug editado a mano no se pisa al seguir escribiendo el nombre', async () => {
    const user = userEvent.setup();
    render(<CrearClubForm />);
    await user.type(screen.getByLabelText('Nombre del club'), 'Club');
    await user.clear(screen.getByLabelText('Slug'));
    await user.type(screen.getByLabelText('Slug'), 'mi-slug');
    await user.type(screen.getByLabelText('Nombre del club'), ' Nuevo');
    expect(screen.getByLabelText('Slug')).toHaveValue('mi-slug');
  });

  it('envía los datos con "copiar catálogos" marcado por default', async () => {
    render(<CrearClubForm />);
    const user = await completar();
    await user.click(screen.getByRole('button', { name: 'Crear club' }));

    await waitFor(() =>
      expect(mockCrear).toHaveBeenCalledWith({
        nombre: 'Club Atlético Ñandú',
        slug: 'club-atletico-nandu',
        adminNombre: 'Ana',
        adminApellido: 'Paz',
        adminEmail: 'ana@nandu.com',
        copiarCatalogos: true,
      }),
    );
    expect(mockToast.success).toHaveBeenCalledWith('Club creado. Se invitó a ana@nandu.com como admin.');
    expect(mockRefresh).toHaveBeenCalled();
    expect(screen.getByLabelText('Nombre del club')).toHaveValue('');
  });

  it('se puede desmarcar "copiar catálogos"', async () => {
    render(<CrearClubForm />);
    const user = await completar();
    await user.click(screen.getByRole('checkbox', { name: /copiar catálogos default/i }));
    await user.click(screen.getByRole('button', { name: 'Crear club' }));

    await waitFor(() => expect(mockCrear).toHaveBeenCalledWith(expect.objectContaining({ copiarCatalogos: false })));
  });

  it('muestra el error por campo que devuelve la action (slug duplicado)', async () => {
    mockCrear.mockResolvedValue({
      ok: false,
      error: 'Ya existe un club con ese slug',
      campos: { slug: 'Ya existe un club con ese slug' },
    });
    render(<CrearClubForm />);
    const user = await completar();
    await user.click(screen.getByRole('button', { name: 'Crear club' }));

    const slug = screen.getByLabelText('Slug');
    await waitFor(() => expect(slug).toHaveAttribute('aria-invalid', 'true'));
    expect(screen.getByText('Ya existe un club con ese slug')).toBeInTheDocument();
    expect(mockToast.error).toHaveBeenCalledWith('Ya existe un club con ese slug');
    // Con error no se limpia el form.
    expect(screen.getByLabelText('Nombre del club')).toHaveValue('Club Atlético Ñandú');
  });
});

describe('ClubesTable', () => {
  const clubes = [
    { id: 'club_a', nombre: 'Club A', slug: 'club-a', activo: true, miembros: 3, deportistas: 120, createdAt: new Date() },
    { id: 'club_b', nombre: 'Club B', slug: 'club-b', activo: false, miembros: 0, deportistas: 0, createdAt: new Date() },
  ];

  it('lista nombre, slug, estado y conteos', () => {
    render(<ClubesTable clubes={clubes} />);
    expect(screen.getByText('Club A')).toBeInTheDocument();
    expect(screen.getByText('club-a')).toBeInTheDocument();
    expect(screen.getByText('120')).toBeInTheDocument();
    expect(screen.getByText('Activo')).toBeInTheDocument();
    expect(screen.getByText('Inactivo')).toBeInTheDocument();
  });

  it('"Entrar" llama a entrarAClub; en un club inactivo está deshabilitado', async () => {
    render(<ClubesTable clubes={clubes} />);
    expect(screen.getByRole('button', { name: 'Entrar a Club B' })).toBeDisabled();

    await userEvent.click(screen.getByRole('button', { name: 'Entrar a Club A' }));
    await waitFor(() => expect(mockEntrar).toHaveBeenCalledWith('club_a'));
  });

  it('desactivar pide confirmación y después llama a setClubActivo', async () => {
    mockSetActivo.mockResolvedValue({ ok: true });
    render(<ClubesTable clubes={clubes} />);

    await userEvent.click(screen.getByRole('button', { name: 'Desactivar Club A' }));
    expect(mockSetActivo).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toHaveTextContent('Desactivar club');

    await userEvent.click(screen.getByRole('button', { name: /^desactivar$/i }));
    await waitFor(() => expect(mockSetActivo).toHaveBeenCalledWith('club_a', false));
    expect(mockRefresh).toHaveBeenCalled();
  });

  it('activar un club inactivo no pide confirmación', async () => {
    mockSetActivo.mockResolvedValue({ ok: true });
    render(<ClubesTable clubes={clubes} />);

    await userEvent.click(screen.getByRole('button', { name: 'Activar Club B' }));
    await waitFor(() => expect(mockSetActivo).toHaveBeenCalledWith('club_b', true));
  });
});
