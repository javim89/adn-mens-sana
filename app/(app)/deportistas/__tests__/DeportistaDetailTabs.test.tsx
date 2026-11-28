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

// Mock next/navigation (usado por GestionDivisionesModal dentro de la tab Trayectoria)
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));

// Mock server actions de trayectoria (evita importar lib/db en el test)
vi.mock('@/lib/actions/trayectoria', () => ({
  crearTransicionDivision: vi.fn(),
  updatePasoPorDivision: vi.fn(),
  deletePasoPorDivision: vi.fn(),
}));

vi.mock('@/lib/actions/triage', () => ({
  recomputeTriageAction: vi.fn(),
}));

const trayectoriaProps = {
  periodos: [],
  eventos: [],
  disciplinas: [],
  categorias: [],
  triage: null,
};

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
    categoriaId: null,
    categoria: null,
    posicion: null,
    estado: 'ACTIVO',
    actividadComplementaria: null,
    fechaIngreso: null,
    tieneRepresentante: false,
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
  test('renderiza las pestañas con nombres cortos', () => {
    render(
      <DeportistaDetailTabs
        deportista={makeDeportista()}
        seguimientos={[]}
        {...trayectoriaProps}
      />,
    );

    for (const label of [
      'Personal',
      'Deportivo',
      'Escolar',
      'Social',
      'Salud',
      'Seguimientos',
      'Trayectoria',
      'Triage',
    ]) {
      expect(screen.getByRole('tab', { name: label })).toBeDefined();
    }
  });

  test('la tab por defecto es Personal (muestra Datos Personales)', () => {
    render(
      <DeportistaDetailTabs
        deportista={makeDeportista()}
        seguimientos={[]}
        {...trayectoriaProps}
      />,
    );
    // El DNI del deportista de prueba solo aparece en la sección personal
    expect(screen.getByText('12345678')).toBeDefined();
  });

  test('al hacer click en Triage muestra el panel de triage', async () => {
    const user = userEvent.setup();
    render(
      <DeportistaDetailTabs
        deportista={makeDeportista()}
        seguimientos={[]}
        {...trayectoriaProps}
      />,
    );

    await user.click(screen.getByRole('tab', { name: 'Triage' }));
    expect(screen.getByText(/Sin triage calculado aún/i)).toBeDefined();
  });

  test('al hacer click en Seguimiento muestra el timeline con los items', async () => {
    const user = userEvent.setup();
    render(
      <DeportistaDetailTabs
        deportista={makeDeportista()}
        seguimientos={[makeSeguimiento({ titulo: 'Evaluación de rodilla' })]}
        {...trayectoriaProps}
      />,
    );

    await user.click(screen.getByRole('tab', { name: 'Seguimientos' }));
    expect(screen.getByText('Evaluación de rodilla')).toBeDefined();
  });

  test('la tab Datos Deportivos muestra el nombre de la categoría desde la relación', async () => {
    const user = userEvent.setup();
    render(
      <DeportistaDetailTabs
        deportista={makeDeportista({ categoria: { id: 'cat-primera', nombre: 'Primera' } })}
        seguimientos={[]}
        {...trayectoriaProps}
      />,
    );

    await user.click(screen.getByRole('tab', { name: 'Deportivo' }));
    expect(screen.getByText('Primera')).toBeDefined();
  });

  test('el estado vacío de una tab de datos se muestra cuando no hay relación', async () => {
    const user = userEvent.setup();
    render(
      <DeportistaDetailTabs
        deportista={makeDeportista()}
        seguimientos={[]}
        {...trayectoriaProps}
      />,
    );

    await user.click(screen.getByRole('tab', { name: 'Escolar' }));
    expect(screen.getByText(/Sin datos cargados/i)).toBeDefined();
  });

  test('la columna derecha muestra el nivel de triage con sus motivos principales', () => {
    render(
      <DeportistaDetailTabs
        deportista={makeDeportista()}
        seguimientos={[]}
        {...trayectoriaProps}
        seguimientosTotal={4}
        triage={{
          nivel: 'NARANJA',
          puntajeTotal: 9,
          calculatedAt: '2026-11-23T11:00:00.000Z',
          desglose: [
            { area: 'MEDICA', regla: 'Lesión activa', puntos: 2 },
            { area: 'PSICOLOGICA', regla: 'Evaluación psicológica alta', puntos: 5 },
            { area: 'DEPORTIVA', regla: 'Ausencias reiteradas', puntos: 3 },
          ],
        }}
      />,
    );

    const lateral = screen.getByRole('complementary', { name: 'Resumen del deportista' });
    expect(lateral).toHaveTextContent('Nivel de triage');
    expect(lateral).toHaveTextContent('Naranja');
    expect(lateral).toHaveTextContent('Evaluación psicológica alta · Ausencias reiteradas.');
    expect(lateral).not.toHaveTextContent('Lesión activa');
    expect(lateral).toHaveTextContent('4');
    expect(lateral).toHaveTextContent('seguimientos registrados');
  });

  test('"Ver seguimientos" de la columna derecha abre esa pestaña', async () => {
    const user = userEvent.setup();
    render(
      <DeportistaDetailTabs
        deportista={makeDeportista()}
        seguimientos={[makeSeguimiento({ titulo: 'Evaluación de rodilla' })]}
        {...trayectoriaProps}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Ver seguimientos' }));
    expect(screen.getByRole('tab', { name: 'Seguimientos' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('Evaluación de rodilla')).toBeDefined();
  });

  test('la pestaña Salud muestra alergias y medicación habitual', async () => {
    const user = userEvent.setup();
    render(
      <DeportistaDetailTabs
        deportista={makeDeportista({
          datosSalud: {
            grupoSanguineo: '0+',
            horasSuenio: null,
            obraSocial: null,
            enfermedadesPreexistentes: [{ id: 'e1', enfermedad: 'ALERGIAS' }],
            antecedentesEnfermedadesFam: [],
            antecedenteMuerteSubitaFamiliar: null,
            antecedentesQuirurgicos: null,
            medicacionCronica: 'Salbutamol',
            historialLesiones: null,
          } as unknown as DeportistaWithRelations['datosSalud'],
        })}
        seguimientos={[]}
        {...trayectoriaProps}
      />,
    );

    await user.click(screen.getByRole('tab', { name: 'Salud' }));
    expect(screen.getByText('Alergias', { selector: 'p.uppercase' }).nextElementSibling).toHaveTextContent('Sí');
    expect(screen.getByText('Medicación habitual').nextElementSibling).toHaveTextContent('Salbutamol');
  });

  test('sin alergias ni medicación, la pestaña Salud lo dice como no registradas', async () => {
    const user = userEvent.setup();
    render(
      <DeportistaDetailTabs
        deportista={makeDeportista({
          datosSalud: {
            grupoSanguineo: null,
            horasSuenio: null,
            obraSocial: null,
            enfermedadesPreexistentes: [],
            antecedentesEnfermedadesFam: [],
            antecedenteMuerteSubitaFamiliar: null,
            antecedentesQuirurgicos: null,
            medicacionCronica: null,
            historialLesiones: null,
          } as unknown as DeportistaWithRelations['datosSalud'],
        })}
        seguimientos={[]}
        {...trayectoriaProps}
      />,
    );

    await user.click(screen.getByRole('tab', { name: 'Salud' }));
    expect(screen.getByText('Alergias', { selector: 'p.uppercase' }).nextElementSibling).toHaveTextContent('No registradas');
    expect(screen.getByText('Medicación habitual').nextElementSibling).toHaveTextContent('No registrada');
  });
});
