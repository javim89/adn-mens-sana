import { describe, test, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import SeguimientosTimeline, {
  type SeguimientoTimelineItem,
} from '../_components/SeguimientosTimeline';

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode; [key: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

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

describe('SeguimientosTimeline', () => {
  test('muestra el estado vacío cuando no hay seguimientos', () => {
    render(<SeguimientosTimeline seguimientos={[]} />);
    expect(screen.getByText(/no tiene seguimientos registrados/i)).toBeDefined();
  });

  test('renderiza los items con el label de tipo correcto', () => {
    render(
      <SeguimientosTimeline
        seguimientos={[
          makeSeguimiento({ id: 'a', titulo: 'Rodilla', tipoSeguimiento: 'TRAUMATOLOGIA' }),
          makeSeguimiento({ id: 'b', titulo: 'Mente', tipoSeguimiento: 'EVALUACION_PSICOLOGICA' }),
        ]}
      />,
    );

    expect(screen.getByText('Rodilla')).toBeDefined();
    expect(screen.getByText('Traumatología')).toBeDefined();
    expect(screen.getByText('Evaluación Psicológica')).toBeDefined();
  });

  test('aplica el color de tipo (dot) correcto por item', () => {
    const { container } = render(
      <SeguimientosTimeline
        seguimientos={[makeSeguimiento({ tipoSeguimiento: 'EVALUACION_CARDIOLOGICA' })]}
      />,
    );
    // El dot rojo debe estar presente
    expect(container.querySelector('.bg-red-500')).not.toBeNull();
  });

  test('un tipo null se trata como Genérico (azul)', () => {
    const { container } = render(
      <SeguimientosTimeline seguimientos={[makeSeguimiento({ tipoSeguimiento: null })]} />,
    );
    expect(screen.getByText('Genérico')).toBeDefined();
    expect(container.querySelector('.bg-blue-500')).not.toBeNull();
  });

  test('cada item enlaza al detalle del seguimiento', () => {
    render(<SeguimientosTimeline seguimientos={[makeSeguimiento({ id: 'seg-42' })]} />);
    const link = screen.getByRole('link');
    expect((link as HTMLAnchorElement).href).toContain('/seguimientos/seg-42');
  });

  test('ordena los items por fecha descendente', () => {
    render(
      <SeguimientosTimeline
        seguimientos={[
          makeSeguimiento({ id: 'old', titulo: 'Viejo', fecha: '2026-01-01' }),
          makeSeguimiento({ id: 'new', titulo: 'Nuevo', fecha: '2026-08-01' }),
        ]}
      />,
    );
    const titles = screen.getAllByText(/Viejo|Nuevo/).map((el) => el.textContent);
    expect(titles[0]).toBe('Nuevo');
    expect(titles[1]).toBe('Viejo');
  });
});
