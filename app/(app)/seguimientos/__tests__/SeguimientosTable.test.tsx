import { describe, test, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SeguimientosTable from '../_components/SeguimientosTable';
import type { SeguimientoListItem } from '@/lib/types/seguimientos';

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode; [key: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

// Mock DeleteSeguimientoModal to simplify tests
vi.mock('../_components/DeleteSeguimientoModal', () => ({
  default: ({ seguimientoTitulo }: { seguimientoTitulo: string }) => (
    <button data-testid="delete-btn" aria-label={`Eliminar ${seguimientoTitulo}`}>
      Eliminar
    </button>
  ),
}));

const makeSeguimiento = (overrides: Partial<SeguimientoListItem> = {}): SeguimientoListItem => ({
  id: 'seg-1',
  fecha: '2026-07-01',
  titulo: 'Evaluación de rodilla',
  descripcion: null,
  recomendaciones: null,
  resultadosEvaluacion: null,
  prioridad: 'MEDIA',
  proximaCita: null,
  alertaSeguimiento: null,
  profesionalId: 'prof-medico-123',
  profesionalNombre: 'Dr. García',
  deportistaId: 'dep-1',
  deportistaNombre: 'Pérez, Juan',
  ...overrides,
});

describe('SeguimientosTable', () => {
  test('renderiza "No hay seguimientos" cuando el array está vacío', () => {
    render(
      <SeguimientosTable
        initialSeguimientos={[]}
        isAdmin={false}
        canWrite={false}
        currentUserId="user-x"
      />,
    );
    expect(screen.getAllByText(/No hay seguimientos/i).length).toBeGreaterThan(0);
  });

  test('renderiza filas con datos de seguimientos de prueba', () => {
    const data = [
      makeSeguimiento({ id: 'seg-1', titulo: 'Seguimiento rodilla' }),
      makeSeguimiento({ id: 'seg-2', titulo: 'Control nutricional', prioridad: 'ALTA' }),
    ];
    render(
      <SeguimientosTable
        initialSeguimientos={data}
        isAdmin={false}
        canWrite={false}
        currentUserId="user-x"
      />,
    );
    expect(screen.getAllByText('Seguimiento rodilla').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Control nutricional').length).toBeGreaterThan(0);
  });

  test('el botón "Nuevo seguimiento" se muestra cuando canWrite=true', () => {
    render(
      <SeguimientosTable
        initialSeguimientos={[]}
        isAdmin={false}
        canWrite={true}
        currentUserId="user-x"
      />,
    );
    expect(screen.getByText('Nuevo seguimiento')).toBeDefined();
  });

  test('el botón "Nuevo seguimiento" NO se muestra cuando canWrite=false', () => {
    render(
      <SeguimientosTable
        initialSeguimientos={[]}
        isAdmin={false}
        canWrite={false}
        currentUserId="user-x"
      />,
    );
    expect(screen.queryByText('Nuevo seguimiento')).toBeNull();
  });

  test('el filtro de prioridad filtra correctamente la lista', async () => {
    const user = userEvent.setup();
    const data = [
      makeSeguimiento({ id: 'seg-1', titulo: 'Urgente primero', prioridad: 'URGENTE' }),
      makeSeguimiento({ id: 'seg-2', titulo: 'Media despues', prioridad: 'MEDIA' }),
    ];
    render(
      <SeguimientosTable
        initialSeguimientos={data}
        isAdmin={false}
        canWrite={true}
        currentUserId="user-x"
      />,
    );

    // Initially both visible
    expect(screen.getAllByText('Urgente primero').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Media despues').length).toBeGreaterThan(0);

    // Filter by URGENTE
    const select = screen.getByRole('combobox');
    await user.selectOptions(select, 'URGENTE');

    expect(screen.getAllByText('Urgente primero').length).toBeGreaterThan(0);
    expect(screen.queryByText('Media despues')).toBeNull();
  });

  test('la columna "Área responsable" aparece solo cuando isAdmin=true', () => {
    const data = [makeSeguimiento()];

    const { rerender } = render(
      <SeguimientosTable
        initialSeguimientos={data}
        isAdmin={false}
        canWrite={false}
        currentUserId="user-x"
      />,
    );
    expect(screen.queryByText('Área responsable')).toBeNull();

    rerender(
      <SeguimientosTable
        initialSeguimientos={data}
        isAdmin={true}
        canWrite={true}
        currentUserId="user-x"
      />,
    );
    expect(screen.getByText('Área responsable')).toBeDefined();
  });

  test('botones Editar/Eliminar visibles si isAdmin=true (independientemente del profesionalId)', () => {
    const data = [makeSeguimiento({ profesionalId: 'otro-prof-999' })];
    render(
      <SeguimientosTable
        initialSeguimientos={data}
        isAdmin={true}
        canWrite={true}
        currentUserId="user-admin-123" // distinto del profesionalId
      />,
    );
    // Should have edit link and delete button
    const editLinks = screen.getAllByTitle('Editar seguimiento');
    expect(editLinks.length).toBeGreaterThan(0);
    const deleteBtn = screen.getAllByTestId('delete-btn');
    expect(deleteBtn.length).toBeGreaterThan(0);
  });

  test('botones Editar/Eliminar visibles si currentUserId === profesionalId aunque no sea admin', () => {
    const data = [makeSeguimiento({ profesionalId: 'prof-medico-123' })];
    render(
      <SeguimientosTable
        initialSeguimientos={data}
        isAdmin={false}
        canWrite={true}
        currentUserId="prof-medico-123" // dueño del registro
      />,
    );
    const editLinks = screen.getAllByTitle('Editar seguimiento');
    expect(editLinks.length).toBeGreaterThan(0);
    const deleteBtn = screen.getAllByTestId('delete-btn');
    expect(deleteBtn.length).toBeGreaterThan(0);
  });

  test('botones Editar/Eliminar NO visibles si no es admin y no es dueño', () => {
    const data = [makeSeguimiento({ profesionalId: 'prof-medico-123' })];
    render(
      <SeguimientosTable
        initialSeguimientos={data}
        isAdmin={false}
        canWrite={true}
        currentUserId="otro-usuario-distinto" // no es dueño
      />,
    );
    expect(screen.queryByTitle('Editar seguimiento')).toBeNull();
    expect(screen.queryByTestId('delete-btn')).toBeNull();
  });
});
