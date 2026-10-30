import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const { mockRefresh, mockToast, mockGuardar, mockSubir, mockProcesar, mockDescartar } = vi.hoisted(() => ({
  mockDescartar: vi.fn(),
  mockRefresh: vi.fn(),
  mockToast: { success: vi.fn(), error: vi.fn() },
  mockGuardar: vi.fn(),
  mockSubir: vi.fn(),
  mockProcesar: vi.fn(),
}));

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: mockRefresh }) }));
vi.mock('sonner', () => ({ toast: mockToast }));
vi.mock('@/lib/actions/configuracion', () => ({ guardarConfiguracionClub: mockGuardar }));
vi.mock('@/lib/api/club', () => ({ subirLogoClub: mockSubir, descartarLogoSubido: mockDescartar }));
vi.mock('@/lib/branding/imagen-logo', async () => ({
  ...(await vi.importActual<typeof import('@/lib/branding/imagen-logo')>('@/lib/branding/imagen-logo')),
  procesarLogo: mockProcesar,
}));

import ConfiguracionClubForm, { type ClubConfigurable } from '../_components/ConfiguracionClubForm';
import { contraste } from '@/lib/branding/colores';
import { TEMA_BIOTEAM } from '@/lib/branding/tokens';

const CLUB: ClubConfigurable = {
  nombre: 'Club de prueba',
  logoSrc: null,
  colorPrimario: '#0d1b5e',
  colorSecundario: null,
  colorAcento: null,
};
const URL_LOGIN = 'https://app.test/c/club-de-prueba/sign-in';

const PALETA = {
  primario: '#060d5a',
  secundario: '#008945',
  acento: '#c8c56a',
  candidatos: ['#060d5a', '#02a153', '#c8c56a'],
  ajustados: ['secundario' as const],
};

function renderForm(club: Partial<ClubConfigurable> = {}) {
  const user = userEvent.setup();
  const utils = render(<ConfiguracionClubForm club={{ ...CLUB, ...club }} urlLogin={URL_LOGIN} />);
  return { user, ...utils };
}

const campo = (nombre: 'Primario' | 'Secundario' | 'Acento') => screen.getByRole('textbox', { name: nombre });
const varRaiz = (v: string) => document.documentElement.style.getPropertyValue(v);
const guardar = () => screen.getByRole('button', { name: 'Guardar' });

beforeEach(() => {
  vi.clearAllMocks();
  document.documentElement.removeAttribute('style');
  mockGuardar.mockResolvedValue({ ok: true });
  vi.stubGlobal('URL', { ...URL, createObjectURL: vi.fn(() => 'blob:logo'), revokeObjectURL: vi.fn() });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('ConfiguracionClubForm', () => {
  it('muestra los valores guardados y no hay nada para guardar', () => {
    renderForm();
    expect(screen.getByRole('textbox', { name: 'Nombre del club' })).toHaveValue('Club de prueba');
    expect(screen.getByRole('textbox', { name: 'Link de ingreso del club' })).toHaveValue(URL_LOGIN);
    expect(campo('Primario')).toHaveValue('#0d1b5e');
    expect(campo('Secundario')).toHaveValue('');
    expect(campo('Acento')).toHaveValue('');
    expect(screen.getByText('No hay cambios.')).toBeInTheDocument();
    expect(guardar()).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Descartar' })).toBeDisabled();
    // Sin cambios no se pisa el tema del layout.
    expect(varRaiz('--club-primario')).toBe('');
  });

  it('el campo vacío muestra el color predeterminado y el badge de contraste', () => {
    renderForm({ colorPrimario: null });
    expect(campo('Primario')).toHaveAttribute('placeholder', `Predeterminado (${TEMA_BIOTEAM.primario})`);
    const fila = campo('Primario').closest('[data-selector-color]') as HTMLElement;
    expect(within(fila).getByText(/:1 · AAA/)).toBeInTheDocument();
  });

  it('escribir un hex actualiza la vista previa en vivo y Descartar la revierte', async () => {
    const { user } = renderForm();
    await user.clear(campo('Primario'));
    await user.type(campo('Primario'), '#2B1055');
    expect(varRaiz('--club-primario')).toBe('#2b1055');
    expect(varRaiz('--club-primario-foreground')).toBe('#ffffff');
    expect(screen.getByText('Tenés cambios sin guardar.')).toBeInTheDocument();
    expect(guardar()).toBeEnabled();

    await user.click(screen.getByRole('button', { name: 'Descartar' }));
    expect(campo('Primario')).toHaveValue('#0d1b5e');
    expect(varRaiz('--club-primario')).toBe('');
  });

  it('al desmontar se saca la vista previa', async () => {
    const { user, unmount } = renderForm();
    await user.clear(campo('Acento'));
    await user.type(campo('Acento'), '#ff8800');
    expect(varRaiz('--club-acento')).toBe('#ff8800');
    unmount();
    expect(varRaiz('--club-acento')).toBe('');
  });

  it('con cambios avisa antes de cerrar la pestaña', async () => {
    const { user } = renderForm();
    const sinCambios = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(sinCambios);
    expect(sinCambios.defaultPrevented).toBe(false);

    await user.type(screen.getByRole('textbox', { name: 'Nombre del club' }), ' FC');
    const conCambios = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(conCambios);
    expect(conCambios.defaultPrevented).toBe(true);
  });

  it('un hex inválido muestra el error y bloquea Guardar', async () => {
    const { user } = renderForm();
    await user.clear(campo('Secundario'));
    await user.type(campo('Secundario'), '#12zz');
    expect(campo('Secundario')).toHaveAttribute('aria-invalid', 'true');
    expect(campo('Secundario')).toHaveAccessibleDescription(/Ingresá un color en formato #rrggbb/);
    expect(guardar()).toBeDisabled();
  });

  it('un nombre muy corto muestra el error y bloquea Guardar', async () => {
    const { user } = renderForm();
    const nombre = screen.getByRole('textbox', { name: 'Nombre del club' });
    await user.clear(nombre);
    await user.type(nombre, 'a');
    expect(nombre).toHaveAccessibleDescription(/al menos 2 caracteres/);
    expect(guardar()).toBeDisabled();
  });

  it('contraste bajo: avisa, bloquea Guardar y "Ajustar automáticamente" lo arregla', async () => {
    const { user } = renderForm();
    await user.clear(campo('Primario'));
    await user.type(campo('Primario'), '#7fb3ff');
    expect(campo('Primario')).toHaveAccessibleDescription(/Poco contraste con el texto blanco/);
    expect(guardar()).toBeDisabled();

    await user.click(screen.getByRole('button', { name: /Ajustar automáticamente/ }));
    const ajustado = (campo('Primario') as HTMLInputElement).value;
    expect(ajustado).not.toBe('#7fb3ff');
    expect(contraste(ajustado, '#ffffff')).toBeGreaterThanOrEqual(4.5);
    expect(screen.queryByText(/Poco contraste/)).not.toBeInTheDocument();
    expect(guardar()).toBeEnabled();
  });

  it('el acento claro no exige contraste con blanco', async () => {
    const { user } = renderForm();
    await user.type(campo('Acento'), '#ffee88');
    expect(screen.queryByText(/Poco contraste/)).not.toBeInTheDocument();
    expect(guardar()).toBeEnabled();
  });

  it('al elegir un logo aplica los colores detectados, muestra el banner y Deshacer los revierte', async () => {
    mockProcesar.mockResolvedValue({
      archivo: new File(['png'], 'escudo.png', { type: 'image/png' }),
      ancho: 225,
      alto: 225,
      paleta: PALETA,
    });
    const { user } = renderForm();
    const original = new File(['<svg/>'], 'escudo.svg', { type: 'image/svg+xml' });
    await user.upload(screen.getByTestId('logo-input'), original);

    expect(mockProcesar).toHaveBeenCalledWith(original);
    expect(await screen.findByText('Tomamos los colores del logo. Podés cambiarlos.')).toBeInTheDocument();
    expect(screen.getByText(/Oscurecimos el secundario/)).toBeInTheDocument();
    expect(campo('Primario')).toHaveValue('#060d5a');
    expect(campo('Secundario')).toHaveValue('#008945');
    expect(campo('Acento')).toHaveValue('#c8c56a');
    expect(varRaiz('--club-secundario')).toBe('#008945');

    // Los candidatos se pueden elegir por teclado en cada fila.
    const swatches = within(screen.getByRole('group', { name: 'Colores del logo para Acento' })).getAllByRole('button');
    expect(swatches).toHaveLength(3);
    swatches[1].focus();
    await user.keyboard('{Enter}');
    expect(campo('Acento')).toHaveValue('#02a153');
    expect(swatches[1]).toHaveAttribute('aria-pressed', 'true');

    await user.click(screen.getByRole('button', { name: 'Deshacer' }));
    expect(campo('Primario')).toHaveValue('#0d1b5e');
    expect(campo('Secundario')).toHaveValue('');
    expect(campo('Acento')).toHaveValue('');
    expect(screen.queryByText(/Tomamos los colores/)).not.toBeInTheDocument();
    // El logo nuevo sigue pendiente.
    expect(screen.getByRole('button', { name: 'Cambiar logo' })).toBeInTheDocument();
  });

  it('un logo monocromo deja los colores como estaban', async () => {
    mockProcesar.mockResolvedValue({ archivo: new File(['png'], 'l.png', { type: 'image/png' }), ancho: 1, alto: 1, paleta: null });
    const { user } = renderForm();
    await user.upload(screen.getByTestId('logo-input'), new File(['x'], 'l.png', { type: 'image/png' }));
    expect(await screen.findByText(/No encontramos colores en el logo/)).toBeInTheDocument();
    expect(campo('Primario')).toHaveValue('#0d1b5e');
  });

  it('si el logo no se puede procesar muestra el error', async () => {
    mockProcesar.mockRejectedValue(new Error('El logo no puede superar los 5 MB.'));
    const { user } = renderForm();
    await user.upload(screen.getByTestId('logo-input'), new File(['x'], 'l.png', { type: 'image/png' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('El logo no puede superar los 5 MB.');
    expect(guardar()).toBeDisabled();
  });

  it('Restablecer pide confirmación y vacía los colores', async () => {
    const { user } = renderForm({ colorSecundario: '#3a0ca3', colorAcento: '#ffcc00' });
    const trigger = screen.getByRole('button', { name: /Restablecer colores predeterminados/ });
    await user.click(trigger);
    const dialogo = screen.getByRole('dialog', { name: '¿Restablecer los colores?' });

    await user.click(within(dialogo).getByRole('button', { name: 'Cancelar' }));
    expect(campo('Acento')).toHaveValue('#ffcc00');
    await waitFor(() => expect(trigger).toHaveFocus());

    await user.click(trigger);
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Restablecer' }));
    expect(campo('Primario')).toHaveValue('');
    expect(campo('Secundario')).toHaveValue('');
    expect(campo('Acento')).toHaveValue('');
    expect(varRaiz('--club-primario')).toBe(TEMA_BIOTEAM.primario);
  });

  it('Guardar sube el logo nuevo y manda el payload normalizado', async () => {
    mockProcesar.mockResolvedValue({
      archivo: new File(['png'], 'escudo.png', { type: 'image/png' }),
      ancho: 225,
      alto: 225,
      paleta: PALETA,
    });
    mockSubir.mockResolvedValue('clubes/club_test/logo/abc.png');
    const { user } = renderForm();

    const nombre = screen.getByRole('textbox', { name: 'Nombre del club' });
    await user.clear(nombre);
    await user.type(nombre, '  Club Nuevo ');
    await user.upload(screen.getByTestId('logo-input'), new File(['x'], 'escudo.png', { type: 'image/png' }));
    await screen.findByText(/Tomamos los colores/);
    await user.clear(campo('Acento'));
    await user.type(campo('Acento'), '#FFCC00');

    await user.click(guardar());
    await waitFor(() => expect(mockGuardar).toHaveBeenCalled());
    expect(mockSubir).toHaveBeenCalledWith(expect.objectContaining({ name: 'escudo.png', type: 'image/png' }));
    expect(mockGuardar).toHaveBeenCalledWith({
      nombre: 'Club Nuevo',
      logoKey: 'clubes/club_test/logo/abc.png',
      colorPrimario: '#060d5a',
      colorSecundario: '#008945',
      colorAcento: '#ffcc00',
    });
    expect(mockToast.success).toHaveBeenCalledWith('Configuración guardada');
    expect(mockRefresh).toHaveBeenCalled();
    expect(mockDescartar).not.toHaveBeenCalled();
  });

  it('si el guardado falla después de subir el logo, borra el logo subido', async () => {
    mockProcesar.mockResolvedValue({
      archivo: new File(['png'], 'escudo.png', { type: 'image/png' }),
      ancho: 225,
      alto: 225,
      paleta: PALETA,
    });
    mockSubir.mockResolvedValue('clubes/club_test/logo/abc.png');
    mockGuardar.mockResolvedValue({ ok: false, error: 'No se pudo guardar la configuración' });
    const { user } = renderForm();

    await user.upload(screen.getByTestId('logo-input'), new File(['x'], 'escudo.png', { type: 'image/png' }));
    await screen.findByText(/Tomamos los colores/);
    await user.click(guardar());
    await waitFor(() => expect(mockDescartar).toHaveBeenCalledWith('clubes/club_test/logo/abc.png'));
    expect(await screen.findByText('No se pudo guardar la configuración')).toBeInTheDocument();
  });

  it('sin cambios de logo no sube nada ni manda logoKey; quitar manda null', async () => {
    const { user } = renderForm({ logoSrc: '/api/clubes/club-de-prueba/logo?v=1' });
    await user.click(screen.getByRole('button', { name: 'Quitar logo' }));
    expect(screen.getByText('El logo se va a quitar cuando guardes.')).toBeInTheDocument();
    await user.click(guardar());
    await waitFor(() => expect(mockGuardar).toHaveBeenCalled());
    expect(mockSubir).not.toHaveBeenCalled();
    expect(mockGuardar.mock.calls[0][0]).toMatchObject({ logoKey: null });

    mockGuardar.mockClear();
    await user.click(screen.getByRole('button', { name: 'Volver al logo guardado' }));
    await user.type(campo('Acento'), '#ffcc00');
    await user.click(guardar());
    await waitFor(() => expect(mockGuardar).toHaveBeenCalled());
    expect(mockGuardar.mock.calls[0][0]).not.toHaveProperty('logoKey');
  });

  it('un error del servidor se muestra y no refresca', async () => {
    mockGuardar.mockResolvedValue({ ok: false, error: 'Acceso denegado' });
    const { user } = renderForm();
    await user.type(campo('Acento'), '#ffcc00');
    await user.click(guardar());
    expect(await screen.findByRole('alert')).toHaveTextContent('Acceso denegado');
    expect(mockRefresh).not.toHaveBeenCalled();
  });
});
