'use client';

import { useMemo, useState, useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { History, Search, TriangleAlert, UtensilsCrossed } from 'lucide-react';
import { toast } from 'sonner';
import { CustomSelect } from '@/app/components/ui/custom-select';
import { marcarRetiro, desmarcarRetiro } from '@/lib/actions/viandas';
import {
  COMIDAS,
  LUGARES_RETIRO,
  coincideFiltroComida,
  comidasPrevistas,
  esFiltroComida,
  tagElegibilidad,
  type FiltroComida,
} from '@/lib/utils/viandas';
import { LUGAR_RETIRO_LABELS, TIPO_COMIDA_LABELS, ESTADO_LABELS } from '@/lib/utils/enum-labels';
import { esClaveFechaValida, formatearClaveFecha } from '@/lib/utils/fecha';
import type { DisciplinaConCategorias } from '@/lib/queries/disciplinas';
import type { DeportistaVianda, EntregaView } from '@/lib/types/viandas';
import type { LugarRetiro, TipoComida } from '@/lib/generated/prisma/enums';
import ComidaToggle from './ComidaToggle';

// Espeja DeportistasTable y ConvocatoriaForm.
const ESTADO_DEPORTISTA_BADGE: Record<string, string> = {
  ACTIVO: 'bg-green-100 text-green-700',
  INACTIVO: 'bg-gray-100 text-[#6B7280]',
  LESIONADO: 'bg-amber-100 text-amber-700',
  SUSPENDIDO: 'bg-red-100 text-red-700',
};

const TODAS = '__all__';

const FILTRO_COMIDA_OPCIONES: { value: FiltroComida; label: string }[] = [
  { value: 'ALMUERZO', label: 'Almuerzo' },
  { value: 'CENA', label: 'Cena' },
  { value: 'AMBAS', label: 'Almuerzo y cena' },
];

const FILTRO_COMIDA_VACIO: Record<FiltroComida, string> = {
  ALMUERZO: 'almuerzo',
  CENA: 'cena',
  AMBAS: 'almuerzo y cena',
};

interface Props {
  fechaHoy: string;
  /** El día que se está mirando. Distinto de `fechaHoy` = histórico en solo lectura. */
  fechaActiva: string;
  isAdmin: boolean;
  lugarActivo: LugarRetiro | null;
  sinLugarAsignado: boolean;
  disciplinas: DisciplinaConCategorias[];
  disciplinaId: string;
  categoriaId: string;
  /** Achica el plantel según la ficha; `null` = todos. */
  filtroComida: FiltroComida | null;
  plantel: DeportistaVianda[];
  entregadores: Record<string, string>;
}

/** Clave de una celda, para el set de operaciones en vuelo. */
function celda(deportistaId: string, comida: TipoComida) {
  return `${deportistaId}:${comida}`;
}

export default function ViandasPanel({
  fechaHoy,
  fechaActiva,
  isAdmin,
  lugarActivo,
  sinLugarAsignado,
  disciplinas,
  disciplinaId,
  categoriaId,
  filtroComida,
  plantel,
  entregadores,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // Copia local del plantel: es lo que permite el marcado optimista sin esperar
  // el round-trip. El servidor sigue siendo la autoridad; ante error se revierte.
  const [filas, setFilas] = useState(plantel);
  const [enVuelo, setEnVuelo] = useState<Set<string>>(new Set());
  const [busqueda, setBusqueda] = useState('');

  // El plantel llega por props del RSC; si cambian los filtros, resincronizamos.
  const [planteRef, setPlantelRef] = useState(plantel);
  if (planteRef !== plantel) {
    setPlantelRef(plantel);
    setFilas(plantel);
  }

  // La fecha activa la decide el servidor: puede degradar a hoy un `?fecha=`
  // inválido o futuro, así que el input tiene que seguirla en vez de quedarse con
  // lo que se tipeó. Mismo patrón derived-state que `filas`/`planteRef`, y hace
  // falta porque `navigate` va dentro de una transition: sin esto el input
  // mostraría el valor viejo mientras la transition está en vuelo.
  const esHistorico = fechaActiva !== fechaHoy;
  const [fechaInput, setFechaInput] = useState(fechaActiva);
  const [fechaRef, setFechaRef] = useState(fechaActiva);
  if (fechaRef !== fechaActiva) {
    setFechaRef(fechaActiva);
    setFechaInput(fechaActiva);
  }

  const categorias = useMemo(
    () => disciplinas.find((d) => d.id === disciplinaId)?.categorias ?? [],
    [disciplinas, disciplinaId],
  );

  function buildUrl(updates: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams?.toString() ?? '');
    for (const [key, value] of Object.entries(updates)) {
      if (value === null || value === '') params.delete(key);
      else params.set(key, value);
    }
    const qs = params.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  }

  function navigate(url: string) {
    startTransition(() => router.push(url));
  }

  function onCambioFecha(valor: string) {
    // Un `input[type=date]` sanea lo que no sea una fecha completa y válida: lo que
    // llega acá es siempre una clave entera o `''` (campo vaciado). No hay estados
    // intermedios que preservar mientras se tipea.
    //
    // Y un valor que NO vamos a navegar — futuro, o el campo vaciado — no puede
    // quedarse en pantalla: como no se navega, `fechaActiva` no cambia, el
    // derived-state de arriba nunca resincroniza y el campo terminaría mostrando un
    // día distinto al de la grilla. Volver a `fechaActiva` es lo único que mantiene
    // al input diciendo la verdad.
    const navegable = esClaveFechaValida(valor) && valor <= fechaHoy;
    setFechaInput(navegable ? valor : fechaActiva);
    if (!navegable) return;
    // Hoy NO se escribe en la URL: la canónica queda sin `fecha` y un link
    // compartido no congela un día.
    navigate(buildUrl({ fecha: valor === fechaHoy ? null : valor }));
  }

  function volverAHoy() {
    // Borra el param en vez de setear `fechaHoy`: si se cruzó la medianoche con la
    // pestaña abierta, `fechaHoy` está rancio y el servidor recalcula el día real.
    setFechaInput(fechaHoy);
    navigate(buildUrl({ fecha: null }));
  }

  // El histórico va PRIMERO: en una fecha pasada "elegí el lugar" es ruido.
  const puedeMarcar = !esHistorico && !sinLugarAsignado && !!lugarActivo;
  const motivoBloqueo = esHistorico
    ? `Estás viendo el ${formatearClaveFecha(fechaActiva)}. Solo se puede registrar el día de hoy.`
    : sinLugarAsignado
      ? 'Tu usuario no tiene un lugar de retiro asignado.'
      : !lugarActivo
        ? 'Elegí el lugar de retiro para poder marcar.'
        : undefined;

  function aplicar(deportistaId: string, comida: TipoComida, entrega: EntregaView | null) {
    setFilas((prev) =>
      prev.map((d) => {
        if (d.id !== deportistaId) return d;
        const entregas = { ...d.entregas };
        if (entrega) entregas[comida] = entrega;
        else delete entregas[comida];
        return { ...d, entregas };
      }),
    );
  }

  async function onToggle(fila: DeportistaVianda, comida: TipoComida) {
    // Segunda capa detrás del `disabled` del toggle: cubre también el histórico,
    // porque `puedeMarcar` ya lo incluye. Sin esto, un click sintético alcanzaría
    // para escribir en el día de hoy mirando un día pasado.
    if (!puedeMarcar) return;

    const key = celda(fila.id, comida);
    if (enVuelo.has(key)) return;

    const previa = fila.entregas[comida];
    const desmarcando = !!previa;

    setEnVuelo((s) => new Set(s).add(key));
    // Optimismo: la celda cambia ya. El `createdAt` provisorio se reemplaza por
    // el del servidor en cuanto responde.
    const provisoria: EntregaView = {
      lugar: lugarActivo!,
      entregadoPor: '',
      createdAt: new Date().toISOString(),
    };
    aplicar(fila.id, comida, desmarcando ? null : provisoria);

    // Las dos ramas se escriben por separado a propósito: cada action tiene su
    // propio tipo de resultado y mezclarlas en una sola variable pierde el
    // narrowing de `entrega`, que es justo el dato que reconcilia el duplicado.
    if (desmarcando) {
      const res = await desmarcarRetiro({ deportistaId: fila.id, comida });
      quitarDeVuelo(key);

      if (res.fecha !== fechaHoy) return avisarCambioDeDia();
      if (!res.success) {
        toast.error(res.error);
        aplicar(fila.id, comida, previa ?? null);
      }
      return;
    }

    const res = await marcarRetiro({
      deportistaId: fila.id,
      comida,
      ...(isAdmin ? { lugar: lugarActivo! } : {}),
    });
    quitarDeVuelo(key);

    if (res.fecha !== fechaHoy) return avisarCambioDeDia();

    if (res.success) {
      // Reemplaza el createdAt provisorio por el real.
      aplicar(fila.id, comida, res.entrega);
      return;
    }

    toast.error(res.error);
    // Si el rechazo trae la entrega existente (el unique violado: ya retiró en
    // otro lugar), se adopta ese estado real en lugar de revertir — el dato del
    // servidor vale más que el optimismo del cliente.
    aplicar(fila.id, comida, res.entrega ?? previa ?? null);
  }

  function quitarDeVuelo(key: string) {
    setEnVuelo((s) => {
      const next = new Set(s);
      next.delete(key);
      return next;
    });
  }

  /**
   * El día cambió con la pestaña abierta: lo que se ve en pantalla ya no es hoy.
   *
   * Los dos llamadores comparan contra `fechaHoy` y NO contra `fechaActiva`: la
   * action siempre escribe el día del servidor, así que lo que hay que detectar es
   * que ese día ya no sea el que el cliente cree que es hoy. Con `fechaActiva` en
   * histórico no se marca nada (`puedeMarcar` es false) y en hoy son lo mismo.
   */
  function avisarCambioDeDia() {
    toast.error('Cambió el día. Recargando el registro de hoy.');
    router.refresh();
  }

  const filtradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return filas.filter(
      (d) =>
        coincideFiltroComida(d, filtroComida) &&
        (!q || `${d.apellido} ${d.nombre}`.toLowerCase().includes(q)),
    );
  }, [filas, busqueda, filtroComida]);

  // Contadores de ESTA categoría, no del club: es lo que el empleado tiene enfrente.
  // Van sobre `filas` y no sobre `filtradas`: el filtro de comida achica la lista,
  // no el resumen de la categoría que dice el texto de abajo.
  //
  // `esperadas` sale de la ficha (el plan), pero `retiradas` cuenta TODO lo
  // entregado, esté en la ficha o no — si contara solo lo previsto, una entrega
  // fuera de ficha desaparecería del resumen justo cuando es lo que hay que
  // mirar. Por eso `pendientes` se calcula sobre las previstas sin entregar y no
  // como resta: así nunca queda negativo cuando hay más entregas que previstas.
  const contadores = useMemo(() => {
    return COMIDAS.map((comida) => {
      let esperadas = 0;
      let retiradas = 0;
      let pendientes = 0;
      let fueraDeFicha = 0;
      for (const d of filas) {
        const prevista = comidasPrevistas(d)[comida];
        const entregada = !!d.entregas[comida];
        if (prevista) esperadas++;
        if (entregada) retiradas++;
        if (prevista && !entregada) pendientes++;
        if (!prevista && entregada) fueraDeFicha++;
      }
      return { comida, esperadas, retiradas, pendientes, fueraDeFicha };
    });
  }, [filas]);

  const ambosFiltros = !!disciplinaId && !!categoriaId;

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
        <div>
          <h1
            className="text-2xl font-semibold text-[#121A61] flex items-center gap-2"
            style={{ fontFamily: 'Oswald, sans-serif' }}
          >
            <UtensilsCrossed size={22} aria-hidden="true" />
            Viandas
          </h1>
          <p className="text-sm text-[#6B7280] mt-1">
            {esHistorico ? 'Histórico del ' : 'Registro del '}
            <strong className="text-[#1C1C1C]">{formatearClaveFecha(fechaActiva)}</strong>
            {esHistorico ? '. Solo lectura.' : '. Solo se puede registrar el día de hoy.'}
          </p>
        </div>

        {isAdmin ? (
          <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
            {/* `input type="date"` nativo con la clase canónica de PresentismoForm:
                no hay DatePicker reutilizable en app/components/ui/. */}
            <div className="flex flex-col gap-1 sm:w-52">
              <label
                htmlFor="viandas-fecha"
                className="text-xs font-medium text-[#6B7280] uppercase tracking-wide"
              >
                Fecha
              </label>
              <div className="flex gap-2">
                <input
                  id="viandas-fecha"
                  type="date"
                  value={fechaInput}
                  max={fechaHoy}
                  onChange={(e) => onCambioFecha(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3346CC]/30"
                />
                {esHistorico && (
                  <button
                    type="button"
                    onClick={volverAHoy}
                    className="shrink-0 px-3 py-2 text-sm font-medium text-[#3346CC] border border-gray-200 rounded-lg hover:bg-[#F3F4F6] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3346CC]/30"
                  >
                    Hoy
                  </button>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-1 sm:w-64">
              <label htmlFor="lugar" className="text-xs font-medium text-[#6B7280] uppercase tracking-wide">
                Lugar de retiro
              </label>
              <CustomSelect
                id="lugar"
                value={lugarActivo ?? ''}
                onChange={(v) => navigate(buildUrl({ lugar: v || null }))}
                placeholder="Elegí el lugar..."
                options={LUGARES_RETIRO.map((l) => ({ value: l, label: LUGAR_RETIRO_LABELS[l] }))}
              />
            </div>
          </div>
        ) : (
          lugarActivo && (
            <div className="text-sm">
              <span className="text-[#6B7280]">Lugar: </span>
              <span className="font-medium text-[#1C1C1C]">
                {LUGAR_RETIRO_LABELS[lugarActivo]}
              </span>
            </div>
          )
        )}
      </div>

      {/* Solo lectura del histórico. `role="status"` y no `role="alert"`: no es un
          error, y los tests existentes buscan el `alert` en singular. Gris y no
          ámbar porque acá el ámbar ya significa "algo está mal / fuera de ficha". */}
      {esHistorico && (
        <div
          role="status"
          aria-live="polite"
          className="mb-5 flex items-start gap-2 px-4 py-3 bg-[#F3F4F6] border border-gray-200 rounded-lg text-sm text-[#1C1C1C]"
        >
          <History size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
          <span>
            Estás viendo el histórico del {formatearClaveFecha(fechaActiva)}. Los días
            pasados son solo lectura: para registrar entregas volvé a hoy.{' '}
            {/* La elegibilidad no está historizada: `comidasPrevistas` lee los flags
                de la ficha de HOY. Lo decimos acá porque un "3 esperadas" de hace un
                mes puede ser literalmente falso y el admin no tiene cómo saberlo. */}
            Tené en cuenta que las esperadas, las sin retirar y los tags de
            elegibilidad se calculan con la ficha actual de cada deportista, no con
            la que tenía ese día: de un día pasado, lo fiable es lo retirado.
          </span>
        </div>
      )}

      {/* Estados bloqueantes */}
      {sinLugarAsignado && (
        <div
          role="alert"
          className="mb-5 flex items-start gap-2 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800"
        >
          <TriangleAlert size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
          <span>
            Tu usuario no tiene un lugar de retiro asignado, así que no podés registrar
            entregas. Pedile a un administrador que lo configure en Usuarios.
          </span>
        </div>
      )}

      {/* En histórico el lugar no hace falta: no se va a marcar nada. */}
      {isAdmin && !esHistorico && !lugarActivo && (
        <div
          role="alert"
          className="mb-5 flex items-start gap-2 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800"
        >
          <TriangleAlert size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
          <span>Elegí el lugar de retiro para poder registrar entregas.</span>
        </div>
      )}

      {/* Filtros */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label
              htmlFor="viandas-disciplina"
              className="block text-xs font-medium text-[#6B7280] uppercase tracking-wide mb-1.5"
            >
              Disciplina
            </label>
            <CustomSelect
              id="viandas-disciplina"
              value={disciplinaId || TODAS}
              onChange={(v) =>
                navigate(
                  buildUrl({ disciplina: v === TODAS ? null : v, categoria: null }),
                )
              }
              searchable
              options={[
                { value: TODAS, label: 'Seleccioná una disciplina' },
                ...disciplinas.map((d) => ({ value: d.id, label: d.nombre })),
              ]}
            />
          </div>
          <div>
            <label
              htmlFor="viandas-categoria"
              className="block text-xs font-medium text-[#6B7280] uppercase tracking-wide mb-1.5"
            >
              Categoría
            </label>
            <CustomSelect
              id="viandas-categoria"
              value={categoriaId || TODAS}
              onChange={(v) => navigate(buildUrl({ categoria: v === TODAS ? null : v }))}
              searchable
              disabled={!disciplinaId}
              options={[
                { value: TODAS, label: 'Seleccioná una categoría' },
                ...categorias.map((c) => ({ value: c.id, label: c.nombre })),
              ]}
            />
          </div>
          <div>
            <label
              htmlFor="viandas-comida"
              className="block text-xs font-medium text-[#6B7280] uppercase tracking-wide mb-1.5"
            >
              Comida
            </label>
            {/* No toca disciplina/categoría ni ellas lo resetean: no depende del plantel. */}
            <CustomSelect
              id="viandas-comida"
              value={filtroComida ?? TODAS}
              onChange={(v) => navigate(buildUrl({ comida: esFiltroComida(v) ? v : null }))}
              options={[{ value: TODAS, label: 'Todas las comidas' }, ...FILTRO_COMIDA_OPCIONES]}
            />
          </div>
        </div>
      </div>

      {!ambosFiltros ? (
        <div className="px-4 py-12 text-center text-sm text-[#6B7280] bg-[#F9FAFB] border border-dashed border-gray-200 rounded-lg">
          Seleccioná disciplina y categoría para ver el plantel del día.
        </div>
      ) : filas.length === 0 ? (
        <div className="px-4 py-12 text-center text-sm text-[#6B7280] bg-[#F9FAFB] border border-dashed border-gray-200 rounded-lg">
          No hay deportistas en esta disciplina y categoría.
        </div>
      ) : (
        <div className={isPending ? 'opacity-60' : ''}>
          {/* Contadores */}
          <div
            role="group"
            aria-label="Resumen por comida"
            className="flex flex-wrap gap-2 mb-4"
          >
            {contadores.map(({ comida, esperadas, retiradas, pendientes, fueraDeFicha }) => (
              <div
                key={comida}
                className="flex items-center gap-2 text-xs bg-white border border-gray-100 rounded-lg px-3 py-2 shadow-sm"
              >
                <span className="font-medium text-[#1C1C1C]">
                  {TIPO_COMIDA_LABELS[comida]}
                </span>
                <span className="text-emerald-700">{retiradas} retiradas</span>
                <span className="text-[#6B7280]">/ {esperadas} esperadas</span>
                {/* En un día cerrado "pendientes" miente: ya no van a retirarse.
                    Cambia la etiqueta, no el cálculo. */}
                {pendientes > 0 && (
                  <span className="font-medium text-amber-700">
                    {pendientes} {esHistorico ? 'sin retirar' : 'pendientes'}
                  </span>
                )}
                {fueraDeFicha > 0 && (
                  <span
                    className="font-medium text-amber-700"
                    title={`${fueraDeFicha} entregadas a deportistas que no tienen ${TIPO_COMIDA_LABELS[comida].toLowerCase()} en su ficha`}
                  >
                    {fueraDeFicha} fuera de ficha
                  </span>
                )}
              </div>
            ))}
          </div>
          <p className="text-xs text-[#6B7280] mb-4">
            Los contadores son de esta disciplina y categoría, no del club entero.
          </p>

          {/* Buscador */}
          <div className="relative mb-4 max-w-sm">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7280]"
              aria-hidden="true"
            />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar deportista..."
              aria-label="Buscar deportista"
              className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3346CC]/30"
            />
          </div>

          {filtradas.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-[#6B7280]">
              {filtroComida && !busqueda.trim()
                ? `Nadie de esta categoría recibe ${FILTRO_COMIDA_VACIO[filtroComida]} según su ficha.`
                : 'Sin resultados para la búsqueda.'}
            </div>
          ) : (
            <>
              {/* Mobile — cards */}
              <ul className="lg:hidden space-y-3">
                {filtradas.map((d) => (
                  <li
                    key={d.id}
                    className="bg-white rounded-xl shadow-sm border border-gray-100 p-4"
                  >
                    <FilaEncabezado d={d} />
                    <div className="grid grid-cols-2 gap-2 mt-3">
                      {COMIDAS.map((comida) => (
                        <ComidaToggle
                          key={comida}
                          comida={comida}
                          deportistaNombre={`${d.apellido}, ${d.nombre}`}
                          entrega={d.entregas[comida]}
                          entregadoPorNombre={nombreEntregador(d, comida, entregadores)}
                          previstaEnFicha={comidasPrevistas(d)[comida]}
                          bloqueado={!puedeMarcar}
                          motivoBloqueo={motivoBloqueo}
                          soloLectura={esHistorico}
                          pendiente={enVuelo.has(celda(d.id, comida))}
                          onToggle={() => onToggle(d, comida)}
                        />
                      ))}
                    </div>
                  </li>
                ))}
              </ul>

              {/* Desktop — tabla */}
              <div className="hidden lg:block bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="text-xs uppercase text-[#6B7280] bg-[#F3F4F6] border-b border-gray-100">
                      <th scope="col" className="text-left px-4 py-3 font-medium">
                        Deportista
                      </th>
                      {COMIDAS.map((comida) => (
                        <th
                          key={comida}
                          scope="col"
                          className="px-3 py-3 font-medium w-[140px]"
                        >
                          {TIPO_COMIDA_LABELS[comida]}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtradas.map((d) => (
                      <tr key={d.id} className="border-b border-gray-50 last:border-0">
                        <td className="px-4 py-3">
                          <FilaEncabezado d={d} />
                        </td>
                        {COMIDAS.map((comida) => (
                          <td key={comida} className="px-3 py-3 align-middle">
                            <ComidaToggle
                              comida={comida}
                              deportistaNombre={`${d.apellido}, ${d.nombre}`}
                              entrega={d.entregas[comida]}
                              entregadoPorNombre={nombreEntregador(d, comida, entregadores)}
                              previstaEnFicha={comidasPrevistas(d)[comida]}
                              bloqueado={!puedeMarcar}
                              motivoBloqueo={motivoBloqueo}
                              soloLectura={esHistorico}
                              pendiente={enVuelo.has(celda(d.id, comida))}
                              onToggle={() => onToggle(d, comida)}
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function nombreEntregador(
  d: DeportistaVianda,
  comida: TipoComida,
  entregadores: Record<string, string>,
): string | undefined {
  const id = d.entregas[comida]?.entregadoPor;
  if (!id) return undefined;
  return entregadores[id];
}

function FilaEncabezado({ d }: { d: DeportistaVianda }) {
  const tag = tagElegibilidad(d);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm font-medium text-[#1C1C1C]">
        {d.apellido}, {d.nombre}
      </span>
      {/* El badge solo aparece si el estado NO es ACTIVO: mismo criterio que
          convocatorias, para que la fila normal no tenga ruido. */}
      {d.estado !== 'ACTIVO' && (
        <span
          className={`text-xs font-medium px-2 py-0.5 rounded-full ${
            ESTADO_DEPORTISTA_BADGE[d.estado] ?? 'bg-gray-100 text-[#6B7280]'
          }`}
        >
          {ESTADO_LABELS[d.estado]}
        </span>
      )}
      {tag && (
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${tag.className}`}>
          {tag.label}
        </span>
      )}
    </div>
  );
}
