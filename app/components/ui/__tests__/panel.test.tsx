import { render, screen } from '@testing-library/react';
import { describe, test, expect } from 'vitest';
import { Panel, Rotulo } from '../panel';
import { LayoutConLateral } from '../layout-con-lateral';

describe('Rotulo', () => {
  test('es un párrafo en mayúsculas por defecto', () => {
    render(<Rotulo>Próximos turnos</Rotulo>);
    const r = screen.getByText('Próximos turnos');
    expect(r.tagName).toBe('P');
    expect(r).toHaveClass('uppercase', 'text-muted-foreground');
  });

  test('acepta otra etiqueta', () => {
    render(<Rotulo como="h3">Por tipo</Rotulo>);
    expect(screen.getByRole('heading', { level: 3, name: 'Por tipo' })).toBeInTheDocument();
  });
});

describe('Panel', () => {
  test('sin título es un div con padding', () => {
    const { container } = render(<Panel>contenido</Panel>);
    const panel = container.firstElementChild!;
    expect(panel.tagName).toBe('DIV');
    expect(panel).toHaveClass('rounded-xl', 'border', 'p-4');
    expect(screen.getByText('contenido')).toBeInTheDocument();
  });

  test('con título es un section con h2 y acción', () => {
    const { container } = render(
      <Panel titulo="Abiertos por tipo" accion={<a href="/x">Ver todos</a>}>
        lista
      </Panel>,
    );
    expect(container.firstElementChild!.tagName).toBe('SECTION');
    expect(screen.getByRole('heading', { level: 2, name: 'Abiertos por tipo' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver todos' })).toBeInTheDocument();
  });

  test('relleno={false} quita el padding', () => {
    const { container } = render(<Panel relleno={false}>tabla</Panel>);
    expect(container.firstElementChild).not.toHaveClass('p-4');
  });
});

describe('LayoutConLateral', () => {
  test('renderiza el contenido y la columna lateral en un aside', () => {
    render(
      <LayoutConLateral lateral={<p>Resumen</p>} lateralLabel="Resumen de seguimientos">
        <p>Tabla</p>
      </LayoutConLateral>,
    );
    expect(screen.getByText('Tabla')).toBeInTheDocument();
    const aside = screen.getByRole('complementary', { name: 'Resumen de seguimientos' });
    expect(aside).toHaveTextContent('Resumen');
  });
});
