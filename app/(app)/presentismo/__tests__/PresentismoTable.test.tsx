import { describe, test, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/presentismo',
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('../_components/DeleteEntrenamientoModal', () => ({ default: () => null }));

import PresentismoTable, { type EntrenamientoListItem } from '../_components/PresentismoTable';

const ITEMS: EntrenamientoListItem[] = [
  {
    id: 'e1',
    fecha: '2026-11-24',
    disciplinaNombre: 'Handball',
    categoriaNombre: 'Sub-15',
    tipoSesion: 'TECNICO',
    totalAsistencias: 10,
    presentes: 8,
  },
];

describe('PresentismoTable', () => {
  test('lista los entrenamientos en tabla y en cards, con su asistencia', () => {
    render(<PresentismoTable items={ITEMS} total={1} page={0} pageSize={25} />);

    const tabla = screen.getByRole('table');
    expect(within(tabla).getByRole('link', { name: '24/11/2026' })).toHaveAttribute('href', '/presentismo/e1');
    expect(within(tabla).getByText('8/10 presentes')).toBeInTheDocument();
    expect(within(screen.getByRole('list')).getByText('Handball · Sub-15')).toBeInTheDocument();
    expect(screen.getByText('Mostrando 1–1 de 1')).toBeInTheDocument();
  });

  test('sin entrenamientos invita a crear el primero', () => {
    render(<PresentismoTable items={[]} total={0} page={0} pageSize={25} />);
    expect(screen.getAllByRole('link', { name: 'Crear el primero' })[0]).toHaveAttribute(
      'href',
      '/presentismo/nuevo',
    );
  });
});
