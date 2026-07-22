import { describe, test, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DeportistaDetailTabs from '../_components/DeportistaDetailTabs';
import type { DeportistaWithRelations } from '@/lib/types/deportistas';
import type { SeguimientoTimelineItem } from '../_components/SeguimientosTimeline';

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode; [key: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

const makeDeportista = (
  overrides: Partial<DeportistaWithRelations> = {},
): DeportistaWithRelations =>
  ({
    id: 'dep-1',
    nombre: 'Juan',
    apellido: 'Pérez',
    dni: '12345678',
    fechaNacimiento: new Date('2000-01-01'),
    genero: null,
    telefono: null,
    email: null,
    domicilioActual: null,
    provincia: null,
    ciudad: null,
    nacionalidad: null,
    contactoEmergencia: null,
    vivePensionClub: false,
    vivePensionExterna: false,
    observaciones: null,
    disciplina: null,
    categoria: null,
    posicion: null,
    estado: 'ACTIVO',
    actividadComplementaria: null,
    fechaIngreso: null,
    esRepresentante: false,
    clubesAnteriores: [],
    historiaDeportiva: [],
    datosEscolares: null,
    datosSociales: null,
    viviendaFamiliar: null,
    datosFamiliares: null,
    necesidadesApoyo: null,
    datosSalud: null,
    ...overrides,
  }) as unknown as DeportistaWithRelations;

const makeSeguimiento = (
  overrides: Partial<SeguimientoTimelineItem> = {},
): SeguimientoTimelineItem => ({
  id: 'seg-1',
  fecha: '2026-07-01',
  titulo: 'Control',
  descripcion: null,
  prioridad: 'MEDIA',
  proximaCita: null,
  tipoSeguimiento: null,
  ...overrides,
});

describe('DeportistaDetailTabs', () => {
  test('renderiza las 7 tabs incluidas Seguimiento y Triage', () => {
    render(<DeportistaDetailTabs deportista={makeDeportista()} seguimientos={[]} />);

    for (const label of [
      'Datos Personales',
      'Datos Deportivos',
      'Datos Escolares',
      'Datos Sociales',
      'Salud',
      'Seguimiento',
      'Triage',
    ]) {
      expect(screen.getByRole('tab', { name: label })).toBeDefined();
    }
  });

  test('la tab por defecto es Personal (muestra Datos Personales)', () => {
    render(<DeportistaDetailTabs deportista={makeDeportista()} seguimientos={[]} />);
    // El DNI del deportista de prueba solo aparece en la sección personal
    expect(screen.getByText('12345678')).toBeDefined();
  });

  test('al hacer click en Triage muestra el placeholder', async () => {
    const user = userEvent.setup();
    render(<DeportistaDetailTabs deportista={makeDeportista()} seguimientos={[]} />);

    await user.click(screen.getByRole('tab', { name: 'Triage' }));
    expect(screen.getByText(/Próximamente/i)).toBeDefined();
  });

  test('al hacer click en Seguimiento muestra el timeline con los items', async () => {
    const user = userEvent.setup();
    render(
      <DeportistaDetailTabs
        deportista={makeDeportista()}
        seguimientos={[makeSeguimiento({ titulo: 'Evaluación de rodilla' })]}
      />,
    );

    await user.click(screen.getByRole('tab', { name: 'Seguimiento' }));
    expect(screen.getByText('Evaluación de rodilla')).toBeDefined();
  });

  test('el estado vacío de una tab de datos se muestra cuando no hay relación', async () => {
    const user = userEvent.setup();
    render(<DeportistaDetailTabs deportista={makeDeportista()} seguimientos={[]} />);

    await user.click(screen.getByRole('tab', { name: 'Datos Escolares' }));
    expect(screen.getByText(/Sin datos cargados/i)).toBeDefined();
  });
});
