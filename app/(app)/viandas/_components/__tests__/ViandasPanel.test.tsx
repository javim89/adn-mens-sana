import { describe, test, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

const { mockMarcar, mockDesmarcar, mockPush, mockRefresh, mockToastError, urlActual } = vi.hoisted(() => ({
  urlActual: { qs: '' },
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
  useSearchParams: () => new URLSearchParams(urlActual.qs),
}));

vi.mock('sonner', () => ({
  toast: { error: mockToastError, success: vi.fn() },
}));

import ViandasPanel from '../ViandasPanel';
import type { DeportistaVianda } from '@/lib/types/viandas';

const HOY = '2026-03-14';
const AYER = '2026-03-13';

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

type PanelProps = React.ComponentProps<typeof ViandasPanel>;

function panel(over: Partial<PanelProps> = {}) {
  return (
    <ViandasPanel
      fechaHoy={HOY}
      fechaActiva={HOY}
      isAdmin={false}
      lugarActivo="SEDE"
      sinLugarAsignado={false}
      disciplinas={DISCIPLINAS}
      disciplinaId="disc-1"
      categoriaId="cat-1"
      filtroComida={null}
      plantel={[deportista()]}
      entregadores={{}}
      {...over}
    />
  );
}

function renderPanel(over: Partial<PanelProps> = {}) {
  const { rerender, ...resto } = render(panel(over));
  return {
    ...resto,
    rerender,
    /** Re-renderiza con los mismos defaults, para probar cambios de props del RSC. */
    rerenderPanel: (siguiente: Partial<PanelProps> = {}) =>
      rerender(panel({ ...over, ...siguiente })),
  };
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

/** La otra mitad del render duplicado: las cards que ve el empleado en el teléfono. */
function swMobile(name: RegExp) {
  return within(screen.getByRole('list')).getByRole('switch', { name });
}

beforeEach(() => {
  vi.clearAllMocks();
  urlActual.qs = 'disciplina=disc-1&categoria=cat-1';
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

  // La comida no depende de la disciplina: cambiar de plantel no la resetea.
  test('elegir disciplina conserva el filtro de comida y resetea la categoría', async () => {
    const user = userEvent.setup();
    urlActual.qs = 'categoria=cat-1&comida=CENA';
    renderPanel({ disciplinaId: '', categoriaId: '', plantel: [], filtroComida: 'CENA' });

    await user.click(screen.getByText('Seleccioná una disciplina'));
    await user.click(screen.getByText('Fútbol'));

    expect(mockPush).toHaveBeenCalledTimes(1);
    const url = mockPush.mock.calls[0][0] as string;
    expect(url).toContain('disciplina=disc-1');
    expect(url).toContain('comida=CENA');
    expect(url).not.toContain('categoria=');
  });

  test('la categoría queda deshabilitada mientras no haya disciplina', () => {
    renderPanel({ disciplinaId: '', categoriaId: '', plantel: [] });
    expect(screen.getByText('Seleccioná una categoría').closest('button')).toBeDisabled();
  });

  // El trigger toma su nombre del <label> ("Comida"). Las opciones son <button> y
  // los toggles de la grilla role="switch", así que `name: 'Cena'` no choca.
  test('elegir una comida la escribe en la URL y conserva disciplina y categoría', async () => {
    const user = userEvent.setup();
    renderPanel();

    const trigger = screen.getByRole('button', { name: 'Comida' });
    expect(trigger).toHaveTextContent('Todas las comidas');
    await user.click(trigger);
    await user.click(screen.getByRole('button', { name: 'Cena' }));

    expect(mockPush).toHaveBeenCalledTimes(1);
    const url = mockPush.mock.calls[0][0] as string;
    expect(url).toContain('comida=CENA');
    expect(url).toContain('disciplina=disc-1');
    expect(url).toContain('categoria=cat-1');
  });

  test('elegir "Todas las comidas" borra el param', async () => {
    const user = userEvent.setup();
    urlActual.qs = 'disciplina=disc-1&categoria=cat-1&comida=CENA';
    renderPanel({ filtroComida: 'CENA' });

    const trigger = screen.getByRole('button', { name: 'Comida' });
    expect(trigger).toHaveTextContent('Cena');
    await user.click(trigger);
    await user.click(screen.getByRole('button', { name: 'Todas las comidas' }));

    expect(mockPush).toHaveBeenCalledTimes(1);
    const url = mockPush.mock.calls[0][0] as string;
    expect(url).not.toContain('comida=');
    expect(url).toContain('disciplina=disc-1');
    expect(url).toContain('categoria=cat-1');
  });
});

/**
 * Histórico: el admin puede mirar un día pasado, pero el día pasado es INTOCABLE.
 * Las actions siempre escriben el día del servidor, así que si la grilla de ayer
 * dejara marcar, el retiro se registraría en hoy sobre un deportista elegido
 * mirando otra fecha. De ahí que el bloqueo sea total y no por celda.
 *
 * `fireEvent.change` y no `user.type`: jsdom no maneja bien el tipeo parcial en un
 * `input[type=date]`.
 */
describe('histórico por fecha', () => {
  const ADMIN_AYER = { isAdmin: true, lugarActivo: 'SEDE' as const, fechaActiva: AYER };

  test('todas las celdas quedan deshabilitadas', () => {
    renderPanel(ADMIN_AYER);

    const switches = screen.getAllByRole('switch');
    expect(switches.length).toBeGreaterThan(0);
    for (const celda of switches) {
      expect(celda).toBeDisabled();
    }
  });

  test('avisa que es solo lectura, con la fecha que se está mirando', () => {
    renderPanel(ADMIN_AYER);

    const aviso = screen.getByRole('status');
    expect(aviso).toHaveTextContent(/histórico del 13\/03\/2026/i);
    expect(aviso).toHaveTextContent(/solo lectura/i);
  });

  // LA regla de negocio del histórico: ni un click sintético escribe nada.
  test('un click no llega a ninguna action', () => {
    renderPanel(ADMIN_AYER);

    fireEvent.click(sw(/desayuno de pérez, juan/i));

    expect(mockMarcar).not.toHaveBeenCalled();
    expect(mockDesmarcar).not.toHaveBeenCalled();
  });

  test('desmarcar una entrega de un día pasado tampoco llama a la action', () => {
    renderPanel({
      ...ADMIN_AYER,
      plantel: [
        deportista({
          entregas: {
            DESAYUNO: {
              lugar: 'SEDE',
              entregadoPor: 'user_1',
              createdAt: '2026-03-13T11:00:00.000Z',
            },
          },
        }),
      ],
    });

    const celda = sw(/desayuno de pérez, juan/i);
    expect(celda).toHaveAttribute('aria-checked', 'true');
    fireEvent.click(celda);

    expect(mockDesmarcar).not.toHaveBeenCalled();
    expect(mockMarcar).not.toHaveBeenCalled();
  });

  test('el toggle explica por qué no responde', () => {
    renderPanel(ADMIN_AYER);
    expect(sw(/desayuno de pérez, juan/i)).toHaveAttribute(
      'title',
      expect.stringContaining('13/03/2026'),
    );
  });

  test('el responsable de viandas no ve el selector de fecha', () => {
    renderPanel({ isAdmin: false });
    expect(screen.queryByLabelText('Fecha')).not.toBeInTheDocument();
  });

  test('el admin sí, y no puede elegir una fecha futura', () => {
    renderPanel({ isAdmin: true, lugarActivo: 'SEDE' });

    const input = screen.getByLabelText('Fecha');
    expect(input).toHaveValue(HOY);
    expect(input).toHaveAttribute('max', HOY);
  });

  test('elegir un día pasado lo escribe en la URL sin perder los filtros', () => {
    renderPanel({ isAdmin: true, lugarActivo: 'SEDE' });

    fireEvent.change(screen.getByLabelText('Fecha'), { target: { value: AYER } });

    expect(mockPush).toHaveBeenCalledTimes(1);
    const url = mockPush.mock.calls[0][0] as string;
    expect(url).toContain(`fecha=${AYER}`);
    expect(url).toContain('disciplina=disc-1');
    expect(url).toContain('categoria=cat-1');
  });

  // La URL canónica de hoy no lleva `fecha`: un link compartido no congela un día.
  test('volver a hoy desde el input borra el param en vez de fijarlo', () => {
    renderPanel(ADMIN_AYER);

    fireEvent.change(screen.getByLabelText('Fecha'), { target: { value: HOY } });

    expect(mockPush).toHaveBeenCalledTimes(1);
    expect(mockPush.mock.calls[0][0]).not.toContain('fecha=');
  });

  test('el botón "Hoy" solo existe en histórico y borra el param', () => {
    const { unmount } = renderPanel({ isAdmin: true, lugarActivo: 'SEDE' });
    expect(screen.queryByRole('button', { name: 'Hoy' })).not.toBeInTheDocument();
    unmount();

    renderPanel(ADMIN_AYER);
    fireEvent.click(screen.getByRole('button', { name: 'Hoy' }));

    expect(mockPush).toHaveBeenCalledTimes(1);
    expect(mockPush.mock.calls[0][0]).not.toContain('fecha=');
  });

  test('una fecha futura no navega a ninguna parte', () => {
    renderPanel({ isAdmin: true, lugarActivo: 'SEDE' });

    fireEvent.change(screen.getByLabelText('Fecha'), { target: { value: '2026-03-15' } });

    expect(mockPush).not.toHaveBeenCalled();
  });

  test('el contador dice "sin retirar" y no "pendientes"', () => {
    renderPanel(ADMIN_AYER);

    const resumen = screen.getByRole('group', { name: /resumen por comida/i });
    expect(within(resumen).getAllByText(/sin retirar/).length).toBeGreaterThan(0);
    expect(within(resumen).queryByText(/pendientes/)).not.toBeInTheDocument();
  });

  // En un día cerrado, "elegí el lugar de retiro" es ruido: no se va a marcar nada.
  test('el aviso de elegir lugar se suprime', () => {
    renderPanel({ isAdmin: true, lugarActivo: null, fechaActiva: AYER });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  // El bloqueo vive en `puedeMarcar`, que comparten los dos renders, pero los otros
  // tests de click usan `sw()` — acotado a la tabla. Sin este caso, el camino que
  // realmente usa el empleado (el teléfono) no estaría probado en histórico.
  test('tampoco se puede marcar desde las cards de mobile', () => {
    renderPanel(ADMIN_AYER);

    const celda = swMobile(/desayuno de pérez, juan/i);
    expect(celda).toBeDisabled();
    fireEvent.click(celda);

    expect(mockMarcar).not.toHaveBeenCalled();
    expect(mockDesmarcar).not.toHaveBeenCalled();
  });

  test('el aviso nombra el límite de las esperadas, que se calculan con la ficha de hoy', () => {
    renderPanel(ADMIN_AYER);
    expect(screen.getByRole('status')).toHaveTextContent(/ficha actual/i);
  });

  // Regresión: mirar hoy no deja rastro del modo histórico.
  test('en el día de hoy no hay aviso y las celdas responden', () => {
    renderPanel({ isAdmin: true, lugarActivo: 'SEDE', fechaActiva: HOY });

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(sw(/desayuno de pérez, juan/i)).toBeEnabled();
  });
});

/**
 * El input de fecha no puede mostrar un día distinto al de la grilla. Es fácil que
 * pase: cuando el valor tipeado no se navega, `fechaActiva` no cambia, y entonces
 * el derived-state que resincroniza nunca se dispara.
 */
describe('el input de fecha nunca miente', () => {
  test('una fecha futura completa no se queda en el campo', () => {
    renderPanel({ isAdmin: true, lugarActivo: 'SEDE' });

    const input = screen.getByLabelText('Fecha');
    fireEvent.change(input, { target: { value: '2099-12-31' } });

    expect(mockPush).not.toHaveBeenCalled();
    // La grilla sigue en hoy, así que el campo también.
    expect(input).toHaveValue(HOY);
  });

  test('vaciar el campo en histórico lo devuelve al día que se está viendo', () => {
    renderPanel({ isAdmin: true, lugarActivo: 'SEDE', fechaActiva: AYER });

    const input = screen.getByLabelText('Fecha');
    fireEvent.change(input, { target: { value: '' } });

    expect(mockPush).not.toHaveBeenCalled();
    expect(input).toHaveValue(AYER);
  });

  // Documenta por qué `onCambioFecha` no necesita un caso especial de "a medio
  // tipear": el elemento sanea todo lo que no sea una fecha completa, así que un
  // valor parcial llega como '' y no como '2026-03-0'. Si alguien vuelve a agregar
  // una rama para valores parciales, este test explica que no se usa nunca.
  test('un valor incompleto ni siquiera llega: el input lo sanea a vacío', () => {
    renderPanel({ isAdmin: true, lugarActivo: 'SEDE' });

    const input = screen.getByLabelText('Fecha');
    fireEvent.change(input, { target: { value: '2026-03-0' } });

    expect(mockPush).not.toHaveBeenCalled();
    expect(input).toHaveValue(HOY);
  });

  // Sin este test, el mecanismo `fechaRef` se podría borrar entero sin que falle
  // nada: es lo que hace que el campo siga a la fecha que el servidor confirmó.
  test('si el servidor devuelve otra fecha, el campo la adopta', () => {
    const { rerenderPanel } = renderPanel({ isAdmin: true, lugarActivo: 'SEDE' });
    expect(screen.getByLabelText('Fecha')).toHaveValue(HOY);

    rerenderPanel({ fechaActiva: AYER });

    expect(screen.getByLabelText('Fecha')).toHaveValue(AYER);
    expect(screen.getByRole('status')).toBeInTheDocument();
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

/**
 * Filtro por comida: achica el plantel según la ficha. ALMUERZO y CENA incluyen a
 * los que reciben las dos, porque el viandero que reparte una comida tiene que
 * ver a todos los que la comen.
 */
describe('filtro por comida', () => {
  const PLANTEL = [
    deportista({ id: 'd1', apellido: 'Nadie', nombre: 'Uno', recibeAlmuerzo: false, recibeCena: false }),
    deportista({ id: 'd2', apellido: 'Mediodía', nombre: 'Dos', recibeAlmuerzo: true, recibeCena: false }),
    deportista({ id: 'd3', apellido: 'Noche', nombre: 'Tres', recibeAlmuerzo: false, recibeCena: true }),
    deportista({ id: 'd4', apellido: 'Ambos', nombre: 'Cuatro', recibeAlmuerzo: true, recibeCena: true }),
  ];

  /** Apellidos visibles en la tabla, en orden. */
  function apellidosEnTabla() {
    return within(screen.getByRole('table'))
      .getAllByRole('switch', { name: /^desayuno de/i })
      .map((s) => s.getAttribute('aria-label')!.replace(/^desayuno de /i, '').split(',')[0]);
  }

  test.each([
    [null, ['Nadie', 'Mediodía', 'Noche', 'Ambos']],
    ['ALMUERZO', ['Mediodía', 'Ambos']],
    ['CENA', ['Noche', 'Ambos']],
    ['AMBAS', ['Ambos']],
  ] as const)('%s muestra %o', (filtroComida, esperados) => {
    renderPanel({ plantel: PLANTEL, filtroComida });
    expect(apellidosEnTabla()).toEqual(esperados);
    // Las cards de mobile filtran igual que la tabla.
    expect(within(screen.getByRole('list')).getAllByRole('listitem')).toHaveLength(
      esperados.length,
    );
  });

  test('se combina con la búsqueda', async () => {
    const user = userEvent.setup();
    renderPanel({ plantel: PLANTEL, filtroComida: 'CENA' });

    await user.type(screen.getByRole('textbox', { name: /buscar deportista/i }), 'noch');

    expect(apellidosEnTabla()).toEqual(['Noche']);
  });

  test('la búsqueda no trae a alguien que el filtro dejó afuera', async () => {
    const user = userEvent.setup();
    renderPanel({ plantel: PLANTEL, filtroComida: 'CENA' });

    await user.type(screen.getByRole('textbox', { name: /buscar deportista/i }), 'mediod');

    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.getByText(/sin resultados para la búsqueda/i)).toBeInTheDocument();
  });

  test('los contadores siguen siendo de la categoría entera', () => {
    renderPanel({ plantel: PLANTEL, filtroComida: 'AMBAS' });

    const resumen = screen.getByRole('group', { name: /resumen por comida/i });
    const chip = (comida: string) =>
      within(within(resumen).getByText(comida).closest('div') as HTMLElement);
    expect(chip('Desayuno').getByText(/4 esperadas/)).toBeInTheDocument();
    expect(chip('Almuerzo').getByText(/2 esperadas/)).toBeInTheDocument();
    expect(chip('Cena').getByText(/2 esperadas/)).toBeInTheDocument();
  });

  test.each([
    ['ALMUERZO', 'almuerzo'],
    ['CENA', 'cena'],
    ['AMBAS', 'almuerzo y cena'],
  ] as const)('si %s no deja a nadie, lo dice con un mensaje propio', (filtroComida, texto) => {
    renderPanel({
      plantel: [deportista({ recibeAlmuerzo: false, recibeCena: false })],
      filtroComida,
    });

    expect(
      screen.getByText(`Nadie de esta categoría recibe ${texto} según su ficha.`),
    ).toBeInTheDocument();
    expect(screen.queryByText(/sin resultados para la búsqueda/i)).not.toBeInTheDocument();
  });
});
