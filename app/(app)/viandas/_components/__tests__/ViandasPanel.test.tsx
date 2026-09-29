import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

const { mockMarcar, mockDesmarcar, mockPush, mockRefresh, mockToastError } = vi.hoisted(() => ({
  mockMarcar: vi.fn(),
  mockDesmarcar: vi.fn(),
  mockPush: vi.fn(),
  mockRefresh: vi.fn(),
  mockToastError: vi.fn(),
}));

vi.mock('@/lib/actions/viandas', () => ({
  marcarRetiro: mockMarcar,
  desmarcarRetiro: mockDesmarcar,
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
  usePathname: () => '/viandas',
  useSearchParams: () => new URLSearchParams('disciplina=disc-1&categoria=cat-1'),
}));

vi.mock('sonner', () => ({
  toast: { error: mockToastError, success: vi.fn() },
}));

import ViandasPanel from '../ViandasPanel';
import type { DeportistaVianda } from '@/lib/types/viandas';

const HOY = '2026-03-14';

const DISCIPLINAS = [
  { id: 'disc-1', nombre: 'Fútbol', categorias: [{ id: 'cat-1', nombre: 'Sub 17' }] },
];

function deportista(over: Partial<DeportistaVianda> = {}): DeportistaVianda {
  return {
    id: 'd1',
    apellido: 'Pérez',
    nombre: 'Juan',
    estado: 'ACTIVO',
    recibeAlmuerzo: true,
    recibeCena: true,
    entregas: {},
    ...over,
  } as DeportistaVianda;
}

function renderPanel(over: Partial<React.ComponentProps<typeof ViandasPanel>> = {}) {
  return render(
    <ViandasPanel
      fechaHoy={HOY}
      isAdmin={false}
      lugarActivo="SEDE"
      sinLugarAsignado={false}
      disciplinas={DISCIPLINAS}
      disciplinaId="disc-1"
      categoriaId="cat-1"
      plantel={[deportista()]}
      entregadores={{}}
      {...over}
    />,
  );
}


/**
 * El panel renderiza dos veces (cards en mobile, tabla en desktop), así que toda
 * query de switch tiene que acotarse a una de las dos vistas o encuentra duplicados.
 */
function sw(name: RegExp) {
  return within(screen.getByRole('table')).getByRole('switch', { name });
}

function swQuery(name: RegExp) {
  return within(screen.getByRole('table')).queryByRole('switch', { name });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockMarcar.mockResolvedValue({
    success: true,
    fecha: HOY,
    entrega: { lugar: 'SEDE', entregadoPor: 'user_1', createdAt: '2026-03-14T15:00:00.000Z' },
  });
  mockDesmarcar.mockResolvedValue({ success: true, fecha: HOY });
});

describe('estados bloqueantes', () => {
  test('un responsable sin lugar asignado ve el aviso y no puede marcar', () => {
    renderPanel({ sinLugarAsignado: true, lugarActivo: null });

    expect(screen.getByRole('alert')).toHaveTextContent(/no tiene un lugar de retiro/i);
    for (const celda of screen.getAllByRole('switch')) {
      expect(celda).toBeDisabled();
    }
  });

  test('el admin sin lugar elegido ve el aviso y no puede marcar', () => {
    renderPanel({ isAdmin: true, lugarActivo: null });

    expect(screen.getByRole('alert')).toHaveTextContent(/elegí el lugar de retiro/i);
    for (const celda of screen.getAllByRole('switch')) {
      expect(celda).toBeDisabled();
    }
  });

  test('el admin con lugar elegido sí puede marcar', () => {
    renderPanel({ isAdmin: true, lugarActivo: 'BOSQUESITO' });

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(sw(/desayuno de pérez, juan/i)).toBeEnabled();
  });

  test('sin disciplina y categoría no se lista nada', () => {
    renderPanel({ disciplinaId: '', categoriaId: '', plantel: [] });
    expect(screen.getByText(/seleccioná disciplina y categoría/i)).toBeInTheDocument();
    expect(screen.queryByRole('switch')).not.toBeInTheDocument();
  });
});

describe('tags de elegibilidad — los cuatro casos', () => {
  test.each([
    [{ recibeAlmuerzo: false, recibeCena: false }, 'No recibe vianda'],
    [{ recibeAlmuerzo: true, recibeCena: false }, 'Recibe solo almuerzo'],
    [{ recibeAlmuerzo: false, recibeCena: true }, 'Recibe solo cena'],
    [{ recibeAlmuerzo: true, recibeCena: true }, 'Recibe almuerzo y cena'],
  ])('%o muestra "%s"', (flags, label) => {
    renderPanel({ plantel: [deportista(flags)] });
    expect(screen.getAllByText(label).length).toBeGreaterThan(0);
  });
});

describe('badge de estado', () => {
  test('un lesionado lo muestra', () => {
    renderPanel({ plantel: [deportista({ estado: 'LESIONADO' })] });
    expect(screen.getAllByText('Lesionado').length).toBeGreaterThan(0);
  });

  test('un activo no, para no meter ruido en la fila normal', () => {
    renderPanel({ plantel: [deportista({ estado: 'ACTIVO' })] });
    expect(screen.queryByText('Activo')).not.toBeInTheDocument();
  });
});

describe('la ficha no restringe qué se puede entregar', () => {
  // El tag de la fila es informativo. Si el administrador se olvidó de cargar
  // que este chico recibe cena, el responsable igual tiene que poder dársela.
  test('las cuatro celdas quedan habilitadas aunque no reciba ninguna vianda', () => {
    renderPanel({ plantel: [deportista({ recibeAlmuerzo: false, recibeCena: false })] });

    expect(sw(/desayuno de pérez, juan/i)).toBeEnabled();
    expect(sw(/almuerzo de pérez, juan/i)).toBeEnabled();
    expect(sw(/merienda de pérez, juan/i)).toBeEnabled();
    expect(sw(/cena de pérez, juan/i)).toBeEnabled();
  });

  test('marcar una comida fuera de la ficha llega a la action como cualquier otra', async () => {
    const user = userEvent.setup();
    renderPanel({ plantel: [deportista({ recibeAlmuerzo: false, recibeCena: false })] });

    await user.click(sw(/almuerzo de pérez, juan/i));

    expect(mockMarcar).toHaveBeenCalledWith({ deportistaId: 'd1', comida: 'ALMUERZO' });
    expect(sw(/almuerzo de pérez, juan/i)).toHaveAttribute('aria-checked', 'true');
  });

  test('la celda fuera de ficha se distingue por el nombre accesible, no por estar cerrada', () => {
    renderPanel({ plantel: [deportista({ recibeAlmuerzo: false, recibeCena: true })] });

    expect(
      screen.getAllByRole('switch', { name: /almuerzo de pérez, juan \(fuera de su ficha\)/i }),
    ).not.toHaveLength(0);
    expect(
      screen.getAllByRole('switch', { name: /^cena de pérez, juan$/i }),
    ).not.toHaveLength(0);
  });
});

describe('marcado', () => {
  test('marcar llama a la action y deja la celda en checked', async () => {
    const user = userEvent.setup();
    renderPanel();

    const celda = sw(/desayuno de pérez, juan/i);
    expect(celda).toHaveAttribute('aria-checked', 'false');

    await user.click(celda);

    expect(mockMarcar).toHaveBeenCalledWith({ deportistaId: 'd1', comida: 'DESAYUNO' });
    expect(sw(/desayuno de pérez, juan/i)).toHaveAttribute('aria-checked', 'true');
  });

  test('el responsable no manda lugar: lo pone el servidor', async () => {
    const user = userEvent.setup();
    renderPanel({ isAdmin: false, lugarActivo: 'SEDE' });

    await user.click(sw(/desayuno de pérez, juan/i));

    expect(mockMarcar).toHaveBeenCalledWith(
      expect.not.objectContaining({ lugar: expect.anything() }),
    );
  });

  test('el admin sí manda el lugar que eligió', async () => {
    const user = userEvent.setup();
    renderPanel({ isAdmin: true, lugarActivo: 'ESTANCIA_CHICA' });

    await user.click(sw(/desayuno de pérez, juan/i));

    expect(mockMarcar).toHaveBeenCalledWith(
      expect.objectContaining({ lugar: 'ESTANCIA_CHICA' }),
    );
  });

  test('ante error revierte el optimismo y avisa', async () => {
    const user = userEvent.setup();
    mockMarcar.mockResolvedValue({ success: false, fecha: HOY, error: 'Explotó' });
    renderPanel();

    await user.click(sw(/desayuno de pérez, juan/i));

    expect(mockToastError).toHaveBeenCalledWith('Explotó');
    expect(
      sw(/desayuno de pérez, juan/i),
    ).toHaveAttribute('aria-checked', 'false');
  });

  // El caso central: ya retiró en otro puesto. No se revierte, se ADOPTA el dato
  // del servidor, porque es la verdad y es lo que el empleado necesita ver.
  test('si ya retiró en otro lugar adopta la entrega existente', async () => {
    const user = userEvent.setup();
    mockMarcar.mockResolvedValue({
      success: false,
      fecha: HOY,
      error: 'Ya retiró almuerzo en Sede a las 12:40.',
      entrega: {
        lugar: 'SEDE',
        entregadoPor: 'user_otro',
        createdAt: '2026-03-14T15:40:00.000Z',
      },
    });
    renderPanel({ isAdmin: true, lugarActivo: 'BOSQUESITO' });

    await user.click(sw(/almuerzo de pérez, juan/i));

    expect(mockToastError).toHaveBeenCalledWith('Ya retiró almuerzo en Sede a las 12:40.');
    expect(
      sw(/almuerzo de pérez, juan/i),
    ).toHaveAttribute('aria-checked', 'true');
    expect(screen.getAllByText(/Sede/).length).toBeGreaterThan(0);
  });

  test('desmarcar una entrega existente llama a desmarcarRetiro', async () => {
    const user = userEvent.setup();
    renderPanel({
      plantel: [
        deportista({
          entregas: {
            DESAYUNO: {
              lugar: 'SEDE',
              entregadoPor: 'user_1',
              createdAt: '2026-03-14T11:00:00.000Z',
            },
          },
        }),
      ],
    });

    await user.click(sw(/desayuno de pérez, juan/i));

    expect(mockDesmarcar).toHaveBeenCalledWith({ deportistaId: 'd1', comida: 'DESAYUNO' });
    expect(mockMarcar).not.toHaveBeenCalled();
  });
});

/**
 * El subtexto de la celda marcada es LA razón de ser del módulo: sin "quién
 * entregó" no hay supervisión del empleado, solo un contador de viandas.
 */
describe('rastro de supervisión de la celda marcada', () => {
  const MARCADA = deportista({
    entregas: {
      ALMUERZO: {
        lugar: 'SEDE',
        entregadoPor: 'user_emp',
        createdAt: '2026-03-14T15:40:00.000Z', // 12:40 ART
      },
    },
  });

  test('muestra lugar, hora en la zona del club y quién entregó', () => {
    renderPanel({ plantel: [MARCADA], entregadores: { user_emp: 'Ana López' } });

    const celda = sw(/almuerzo de pérez, juan/i);
    expect(celda).toHaveAttribute('aria-checked', 'true');
    // La hora es la local, no la UTC del createdAt: 15:40Z son las 12:40 ART.
    expect(celda).toHaveTextContent('Sede · 12:40 · Ana López');
  });

  test('sin nombre resuelto no inventa ni deja un id colgado', () => {
    renderPanel({ plantel: [MARCADA], entregadores: {} });

    const celda = sw(/almuerzo de pérez, juan/i);
    expect(celda).toHaveTextContent('Sede · 12:40');
    expect(celda).not.toHaveTextContent('user_emp');
  });
});

describe('estados vacíos', () => {
  test('una categoría sin deportistas lo dice en vez de mostrar una tabla vacía', () => {
    renderPanel({ plantel: [] });

    expect(screen.getByText(/no hay deportistas en esta disciplina/i)).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  test('una búsqueda sin coincidencias lo avisa', async () => {
    const user = userEvent.setup();
    renderPanel();

    await user.type(screen.getByRole('textbox', { name: /buscar deportista/i }), 'zzz');

    expect(screen.getByText(/sin resultados para la búsqueda/i)).toBeInTheDocument();
  });
});

describe('cruce de medianoche', () => {
  test('si el servidor devuelve otra fecha, avisa y refresca', async () => {
    const user = userEvent.setup();
    mockMarcar.mockResolvedValue({ success: true, fecha: '2026-03-15', entrega: null });
    renderPanel();

    await user.click(sw(/desayuno de pérez, juan/i));

    expect(mockToastError).toHaveBeenCalledWith(expect.stringMatching(/cambió el día/i));
    expect(mockRefresh).toHaveBeenCalled();
  });
});

describe('contadores', () => {
  const chipDe = (comida: string) =>
    within(
      within(screen.getByRole('group', { name: /resumen por comida/i }))
        .getByText(comida)
        .closest('div') as HTMLElement,
    );

  test('"esperadas" sale de la ficha y es de esta categoría, no del club', () => {
    renderPanel({
      plantel: [
        deportista({ id: 'd1', recibeAlmuerzo: true, recibeCena: false }),
        deportista({ id: 'd2', apellido: 'Gómez', recibeAlmuerzo: false, recibeCena: false }),
      ],
    });

    // Desayuno: los 2 lo tienen previsto. Almuerzo: solo d1. Cena: ninguno.
    expect(chipDe('Desayuno').getByText(/2 esperadas/)).toBeInTheDocument();
    expect(chipDe('Almuerzo').getByText(/1 esperadas/)).toBeInTheDocument();
    expect(chipDe('Cena').getByText(/0 esperadas/)).toBeInTheDocument();
  });

  test('una entrega fuera de ficha suma a "retiradas" y se muestra aparte', () => {
    renderPanel({
      plantel: [
        deportista({
          id: 'd1',
          recibeAlmuerzo: false,
          recibeCena: false,
          entregas: {
            CENA: { lugar: 'SEDE', entregadoPor: 'u1', createdAt: '2026-03-14T23:00:00.000Z' },
          },
        }),
      ],
    });

    // Sin esto, la cena entregada desaparecería del resumen justo por no estar
    // prevista — que es el caso que hay que poder ver.
    const cena = chipDe('Cena');
    expect(cena.getByText(/1 retiradas/)).toBeInTheDocument();
    expect(cena.getByText(/0 esperadas/)).toBeInTheDocument();
    expect(cena.getByText(/1 fuera de ficha/)).toBeInTheDocument();
    expect(cena.queryByText(/pendientes/)).not.toBeInTheDocument();
  });

  test('"pendientes" nunca queda negativo si se entregó más de lo previsto', () => {
    renderPanel({
      plantel: [
        deportista({
          id: 'd1',
          recibeAlmuerzo: false,
          recibeCena: false,
          entregas: {
            ALMUERZO: { lugar: 'SEDE', entregadoPor: 'u1', createdAt: '2026-03-14T15:00:00.000Z' },
          },
        }),
      ],
    });

    expect(chipDe('Almuerzo').queryByText(/-1 pendientes/)).not.toBeInTheDocument();
    expect(chipDe('Almuerzo').queryByText(/pendientes/)).not.toBeInTheDocument();
  });

  test('aclara que el alcance es la categoría, no el club', () => {
    renderPanel();
    expect(screen.getByText(/no del club entero/i)).toBeInTheDocument();
  });
});

describe('filtros en la URL', () => {
  // `CustomSelect` es un <button> sin role="combobox", así que se lo busca por su
  // texto visible (el placeholder, cuando todavía no hay selección).
  test('elegir disciplina la escribe en la URL y resetea la categoría', async () => {
    const user = userEvent.setup();
    renderPanel({ disciplinaId: '', categoriaId: '', plantel: [] });

    await user.click(screen.getByText('Seleccioná una disciplina'));
    await user.click(screen.getByText('Fútbol'));

    expect(mockPush).toHaveBeenCalledTimes(1);
    const url = mockPush.mock.calls[0][0] as string;
    expect(url).toContain('disciplina=disc-1');
    // El reset es lo que importa: una categoría de otra disciplina no existe.
    expect(url).not.toContain('categoria=');
  });

  test('la categoría queda deshabilitada mientras no haya disciplina', () => {
    renderPanel({ disciplinaId: '', categoriaId: '', plantel: [] });
    expect(screen.getByText('Seleccioná una categoría').closest('button')).toBeDisabled();
  });
});

describe('búsqueda', () => {
  test('filtra por apellido', async () => {
    const user = userEvent.setup();
    renderPanel({
      plantel: [
        deportista({ id: 'd1', apellido: 'Pérez', nombre: 'Juan' }),
        deportista({ id: 'd2', apellido: 'Gómez', nombre: 'Ana' }),
      ],
    });

    await user.type(screen.getByRole('textbox', { name: /buscar deportista/i }), 'góm');

    expect(swQuery(/desayuno de pérez, juan/i)).not.toBeInTheDocument();
    expect(sw(/desayuno de gómez, ana/i)).toBeInTheDocument();
  });
});
