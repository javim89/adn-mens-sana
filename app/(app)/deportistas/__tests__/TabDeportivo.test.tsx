import { render, screen, fireEvent } from '@testing-library/react';
import { describe, test, expect, vi } from 'vitest';
import TabDeportivo from '../_components/tabs/TabDeportivo';
import type { DeportistaFormData } from '@/lib/types/deportistas';

// CustomSelect only renders options once opened (via portal-less dropdown).
// Mock it to render the trigger plus all options inline so tests can assert on labels
// and click options directly. The trigger button reflects `disabled` so tests can
// verify the categoría select is disabled until a disciplina is chosen.
vi.mock('@/app/components/ui/custom-select', () => ({
  CustomSelect: ({
    id,
    value,
    onChange,
    options,
    placeholder,
    disabled,
  }: {
    id?: string;
    value: string;
    onChange: (v: string) => void;
    options: Array<{ value: string; label: string }>;
    placeholder?: string;
    disabled?: boolean;
  }) => (
    <div data-testid="custom-select" data-value={value}>
      <button id={id} role="combobox" disabled={disabled}>
        {placeholder}
      </button>
      {options.map((o) => (
        <div key={o.value} role="option" data-value={o.value} onClick={() => onChange(o.value)}>
          {o.label}
        </div>
      ))}
    </div>
  ),
}));

const emptyData: DeportistaFormData = {
  apellido: '',
  nombre: '',
  dni: '',
  fechaNacimiento: '',
  vivePensionClub: false,
  vivePensionExterna: false,
  estado: 'ACTIVO',
  esRepresentante: false,
  clubesAnteriores: [],
};

// Fixture: dos disciplinas — Fútbol con categorías propias, Básquet sin categorías.
const disciplinas = [
  {
    id: 'disc-futbol',
    nombre: 'Fútbol',
    categorias: [
      { id: 'cat-4ta', nombre: '4ta' },
      { id: 'cat-primera', nombre: 'Primera' },
    ],
  },
  {
    id: 'disc-basquet',
    nombre: 'Básquet',
    categorias: [],
  },
];

describe('TabDeportivo', () => {
  test('renderiza select de Disciplina', () => {
    render(<TabDeportivo data={emptyData} onChange={vi.fn()} disciplinas={disciplinas} />);
    expect(screen.getByLabelText(/disciplina/i)).toBeInTheDocument();
  });

  test('renderiza las opciones de Disciplina desde la prop', () => {
    render(<TabDeportivo data={emptyData} onChange={vi.fn()} disciplinas={disciplinas} />);
    expect(screen.getByText('Fútbol')).toBeInTheDocument();
    expect(screen.getByText('Básquet')).toBeInTheDocument();
  });

  test('el select de Categoría está deshabilitado si no hay disciplina seleccionada', () => {
    render(<TabDeportivo data={emptyData} onChange={vi.fn()} disciplinas={disciplinas} />);
    const categoriaTrigger = screen.getByLabelText(/categoría/i);
    expect(categoriaTrigger).toBeDisabled();
  });

  test('sin disciplina el select de Categoría no ofrece opciones', () => {
    render(<TabDeportivo data={emptyData} onChange={vi.fn()} disciplinas={disciplinas} />);
    // Ninguna categoría del catálogo debe estar presente todavía.
    expect(screen.queryByText('4ta')).not.toBeInTheDocument();
    expect(screen.queryByText('Primera')).not.toBeInTheDocument();
  });

  test('al elegir una disciplina el select de Categoría muestra SOLO sus categorías', () => {
    const dataConDisciplina: DeportistaFormData = { ...emptyData, disciplinaId: 'disc-futbol' };
    render(<TabDeportivo data={dataConDisciplina} onChange={vi.fn()} disciplinas={disciplinas} />);

    const categoriaTrigger = screen.getByLabelText(/categoría/i);
    expect(categoriaTrigger).not.toBeDisabled();

    // Solo las categorías de Fútbol aparecen.
    expect(screen.getByText('4ta')).toBeInTheDocument();
    expect(screen.getByText('Primera')).toBeInTheDocument();
  });

  test('una disciplina sin categorías deja el select de Categoría sin opciones', () => {
    const dataConBasquet: DeportistaFormData = { ...emptyData, disciplinaId: 'disc-basquet' };
    render(<TabDeportivo data={dataConBasquet} onChange={vi.fn()} disciplinas={disciplinas} />);

    // Básquet no tiene categorías en el fixture.
    expect(screen.queryByText('4ta')).not.toBeInTheDocument();
    expect(screen.queryByText('Primera')).not.toBeInTheDocument();
  });

  test('seleccionar una categoría setea categoriaId con el id del catálogo', () => {
    const onChange = vi.fn();
    const dataConDisciplina: DeportistaFormData = { ...emptyData, disciplinaId: 'disc-futbol' };
    render(<TabDeportivo data={dataConDisciplina} onChange={onChange} disciplinas={disciplinas} />);
    fireEvent.click(screen.getByText('Primera'));
    expect(onChange).toHaveBeenCalledWith({ categoriaId: 'cat-primera' });
  });

  test('elegir una disciplina setea disciplinaId', () => {
    const onChange = vi.fn();
    render(<TabDeportivo data={emptyData} onChange={onChange} disciplinas={disciplinas} />);
    fireEvent.click(screen.getByText('Básquet'));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ disciplinaId: 'disc-basquet' }),
    );
  });

  test('cambiar a otra disciplina limpia una categoriaId previa que no le pertenece', () => {
    const onChange = vi.fn();
    // Deportista en Fútbol con categoría "Primera" (cat-primera), que NO existe en Básquet.
    const dataConCategoria: DeportistaFormData = {
      ...emptyData,
      disciplinaId: 'disc-futbol',
      categoriaId: 'cat-primera',
    };
    render(<TabDeportivo data={dataConCategoria} onChange={onChange} disciplinas={disciplinas} />);

    // Cambiar de disciplina a Básquet (sin esa categoría).
    fireEvent.click(screen.getByText('Básquet'));

    expect(onChange).toHaveBeenCalledWith({
      disciplinaId: 'disc-basquet',
      categoriaId: undefined,
    });
  });

  test('cambiar de disciplina conserva la categoriaId si sigue siendo válida', () => {
    const onChange = vi.fn();
    // Disciplina que comparte la categoría con Fútbol.
    const disciplinasCompartidas = [
      {
        id: 'disc-futbol',
        nombre: 'Fútbol',
        categorias: [{ id: 'cat-primera', nombre: 'Primera' }],
      },
      {
        id: 'disc-futsal',
        nombre: 'Futsal',
        categorias: [{ id: 'cat-primera', nombre: 'Primera' }],
      },
    ];
    const dataConCategoria: DeportistaFormData = {
      ...emptyData,
      disciplinaId: 'disc-futbol',
      categoriaId: 'cat-primera',
    };
    render(
      <TabDeportivo data={dataConCategoria} onChange={onChange} disciplinas={disciplinasCompartidas} />,
    );

    fireEvent.click(screen.getByText('Futsal'));

    expect(onChange).toHaveBeenCalledWith({
      disciplinaId: 'disc-futsal',
      categoriaId: 'cat-primera',
    });
  });

  test('renderiza select de Estado con opciones', () => {
    render(<TabDeportivo data={emptyData} onChange={vi.fn()} disciplinas={disciplinas} />);
    expect(screen.getByLabelText(/estado/i)).toBeInTheDocument();
    expect(screen.getByText('Activo')).toBeInTheDocument();
    expect(screen.getByText('Inactivo')).toBeInTheDocument();
  });

  test('checkbox "Es representante" funciona', () => {
    const onChange = vi.fn();
    render(<TabDeportivo data={emptyData} onChange={onChange} disciplinas={disciplinas} />);
    const checkbox = screen.getByLabelText(/es representante/i);
    expect(checkbox).toBeInTheDocument();
    fireEvent.click(checkbox);
    expect(onChange).toHaveBeenCalledWith({ esRepresentante: true });
  });

  test('renderiza el componente ClubAnteriorList', () => {
    render(<TabDeportivo data={emptyData} onChange={vi.fn()} disciplinas={disciplinas} />);
    expect(screen.getByText('Clubes anteriores')).toBeInTheDocument();
    expect(screen.getByText('Agregar club')).toBeInTheDocument();
  });
});
