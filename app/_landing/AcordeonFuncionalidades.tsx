'use client';

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { ALL_NAV_ITEMS } from '@/lib/roles';
import { ICON_MAP } from '@/lib/nav-icons';
import EscenarioDemo from './EscenarioDemo';
import { FUNCIONALIDADES, type FuncionalidadId } from './funcionalidades';

const QUERY_DESKTOP = '(min-width: 1024px)';
const QUERY_MENOS_MOVIMIENTO = '(prefers-reduced-motion: reduce)';

/** `true` si la media query aplica. En el servidor (y en jsdom sin `matchMedia`) da `false`. */
function useMediaQuery(query: string): boolean {
  const suscribir = useCallback(
    (avisar: () => void) => {
      if (typeof window.matchMedia !== 'function') return () => {};
      const mq = window.matchMedia(query);
      mq.addEventListener('change', avisar);
      return () => mq.removeEventListener('change', avisar);
    },
    [query],
  );
  return useSyncExternalStore(
    suscribir,
    () => typeof window.matchMedia === 'function' && window.matchMedia(query).matches,
    () => false,
  );
}

// Clases literales: Tailwind no genera las que se arman concatenando.
const ORDEN_TEXTO = ['order-1', 'order-3', 'order-5', 'order-7'];
const ORDEN_DEMO = ['order-2', 'order-4', 'order-6', 'order-8'];
// En lg los textos van en las filas 2–5: la 1 y la 6 son `1fr` y los centran contra la ventana.
const FILA_LG = ['lg:row-start-2', 'lg:row-start-3', 'lg:row-start-4', 'lg:row-start-5'];

const ICONOS = FUNCIONALIDADES.map((f) => {
  const item = ALL_NAV_ITEMS.find((i) => i.href === f.href);
  return ICON_MAP[item?.icon ?? 'LayoutDashboard'];
});

/**
 * Las features de la landing. **Un solo DOM con dos modos** (ver
 * `docs/feature/landing-features-acordeon/overview.md`):
 *
 * - `lista` (< lg, y el HTML del servidor): una grilla de una columna donde `order`
 *   intercala texto y demo de cada feature. Sin acordeón ni auto-avance.
 * - `acordeon` (lg+): textos en una columna angosta (centrados en vertical) y las 4 demos
 *   apiladas en la misma celda de la columna 2, que ocupa el resto del ancho: una ventana
 *   completa con la app escalada adentro (`EscenarioDemo`). Solo se ve la activa.
 *   Auto-avanza con la barra de progreso.
 *
 * El layout lo resuelve el CSS; `modo` solo prende el auto-avance y la barra. El avance
 * lo dispara el `animationend` de la barra (dura `DURACION_FUNCIONALIDAD_MS`, escrita en
 * `globals.css`), así que pausar es pausar la animación (`data-pausado`). Activar un ítem
 * (click, Enter, Espacio; también el que ya está abierto) remonta la barra desde 0 y el
 * auto-avance sigue desde ahí. Las flechas, Home y End solo mueven el foco.
 *
 * Las demos llegan como nodos ya armados por el server component y se montan una sola
 * vez, siempre `aria-hidden` + `inert`: reordenarlas no toca el orden de lectura ni el foco.
 */
export default function AcordeonFuncionalidades({
  demos,
}: {
  demos: Record<FuncionalidadId, React.ReactNode>;
}) {
  const raizRef = useRef<HTMLDivElement>(null);
  const botonesRef = useRef<(HTMLButtonElement | null)[]>([]);

  const esDesktop = useMediaQuery(QUERY_DESKTOP);
  const menosMovimiento = useMediaQuery(QUERY_MENOS_MOVIMIENTO);
  const modo = esDesktop ? 'acordeon' : 'lista';

  // El foco que deja un click no pausa (el de teclado sí): si no, después de clickear un
  // ítem la barra quedaría pausada hasta el blur. Se marca en el pointerdown, que llega antes.
  const focoPorPunteroRef = useRef(false);

  const [activa, setActiva] = useState(0);
  /** Sube en cada activación (click, Enter, Espacio): remonta la barra para que arranque de 0. */
  const [activacion, setActivacion] = useState(0);
  const [foco, setFoco] = useState(false);
  const [fueraDeVista, setFueraDeVista] = useState(false);
  const [pestanaOculta, setPestanaOculta] = useState(false);

  const conBarra = modo === 'acordeon' && !menosMovimiento;
  const autoavance = conBarra;
  // Sin pausa por hover (como steep): con el mouse encima después de un click la barra quedaba quieta.
  const pausado = foco || fueraDeVista || pestanaOculta;

  useEffect(() => {
    const el = raizRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver((entradas) => {
      const ultima = entradas[entradas.length - 1];
      if (ultima) setFueraDeVista(!ultima.isIntersecting);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const actualizar = () => setPestanaOculta(document.hidden);
    document.addEventListener('visibilitychange', actualizar);
    return () => document.removeEventListener('visibilitychange', actualizar);
  }, []);

  function abrir(indice: number) {
    setActiva(indice);
    setActivacion((n) => n + 1);
  }

  function alTeclear(e: React.KeyboardEvent<HTMLButtonElement>, indice: number) {
    const total = FUNCIONALIDADES.length;
    const destino =
      e.key === 'ArrowDown'
        ? (indice + 1) % total
        : e.key === 'ArrowUp'
          ? (indice - 1 + total) % total
          : e.key === 'Home'
            ? 0
            : e.key === 'End'
              ? total - 1
              : null;
    if (destino === null) return;
    e.preventDefault();
    botonesRef.current[destino]?.focus();
  }

  const autoavanceRef = useRef(autoavance);
  useEffect(() => {
    autoavanceRef.current = autoavance;
  }, [autoavance]);

  // Listener nativo y no `onAnimationEnd`: React elige el nombre del evento según el
  // navegador y en jsdom no escucha `animationend`. Filtra por la barra porque también
  // burbujean los `animationend` de las demos y del panel.
  useEffect(() => {
    const el = raizRef.current;
    if (!el) return;
    const alTerminar = (e: Event) => {
      if (!autoavanceRef.current) return;
      if (!(e.target instanceof Element) || !e.target.closest('[data-testid^="progreso-"]')) return;
      setActiva((i) => (i + 1) % FUNCIONALIDADES.length);
    };
    el.addEventListener('animationend', alTerminar);
    return () => el.removeEventListener('animationend', alTerminar);
  }, []);

  return (
    <div
      ref={raizRef}
      data-testid="acordeon-funcionalidades"
      data-modo={modo}
      data-activa={FUNCIONALIDADES[activa].id}
      data-autoavance={autoavance ? 'on' : 'off'}
      data-pausado={pausado ? 'true' : 'false'}
      onPointerDown={() => {
        focoPorPunteroRef.current = true;
      }}
      onPointerUp={() => {
        focoPorPunteroRef.current = false;
      }}
      onFocus={() => {
        setFoco(!focoPorPunteroRef.current);
        focoPorPunteroRef.current = false;
      }}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFoco(false);
      }}
      className="grid grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)] lg:grid-rows-[1fr_auto_auto_auto_auto_1fr] lg:gap-x-10"
    >
      {FUNCIONALIDADES.map((f, i) => {
        const Icono = ICONOS[i];
        const esActiva = i === activa;
        return (
          <div
            key={f.id}
            data-funcionalidad-texto={f.id}
            className={`mt-16 min-w-0 first:mt-0 lg:col-start-1 lg:mt-0 lg:self-start lg:border-b lg:border-gray-200 lg:order-none ${ORDEN_TEXTO[i]} ${FILA_LG[i]} ${i === 0 ? 'lg:border-t' : ''}`}
          >
            <h3 className="m-0">
              <button
                ref={(el) => {
                  botonesRef.current[i] = el;
                }}
                type="button"
                id={`funcionalidad-${f.id}-boton`}
                aria-expanded={esActiva}
                aria-controls={`funcionalidad-${f.id}-panel`}
                onClick={() => abrir(i)}
                onKeyDown={(e) => alTeclear(e, i)}
                className="hidden w-full cursor-pointer items-center rounded-sm py-5 text-left text-[17px] font-medium leading-snug text-[#6B7280] transition-colors duration-200 hover:text-[#121A61] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#3346CC] aria-expanded:text-[#121A61] lg:flex"
              >
                {f.titulo}
              </button>
              <span
                data-titulo-movil
                className="flex items-center gap-3 font-[family-name:var(--font-oswald)] text-2xl font-bold uppercase leading-tight text-[#121A61] sm:text-3xl lg:hidden"
              >
                <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#121A61] text-white">
                  <Icono className="size-5" />
                </span>
                {f.titulo}
              </span>
            </h3>
            <div
              id={`funcionalidad-${f.id}-panel`}
              role="region"
              aria-labelledby={`funcionalidad-${f.id}-boton`}
              className={`pb-0 lg:-mt-2 lg:pb-5 ${esActiva ? 'landing-panel-entrada' : 'lg:hidden'}`}
            >
              <p className="mt-3 max-w-prose text-base leading-relaxed text-[#6B7280] lg:mt-0 lg:text-[15px]">
                {f.descripcion}
              </p>
              {esActiva && conBarra && (
                <div
                  key={`${activa}-${activacion}`}
                  data-testid={`progreso-${f.id}`}
                  className="mt-5 h-0.5 w-full overflow-hidden rounded-full bg-gray-200"
                >
                  <div className="landing-progreso-relleno h-full w-full origin-left bg-[#121A61]" />
                </div>
              )}
            </div>
          </div>
        );
      })}

      {FUNCIONALIDADES.map((f, i) => (
        <div
          key={f.id}
          data-demo={f.id}
          aria-hidden="true"
          inert
          data-visible={modo === 'lista' || i === activa ? 'true' : 'false'}
          className={`landing-demo relative mt-6 min-w-0 overflow-hidden rounded-2xl bg-[#F3F4F6] p-3 sm:p-4 lg:order-none lg:col-start-2 lg:row-span-6 lg:row-start-1 lg:mt-0 lg:aspect-[1280/832] lg:self-center lg:bg-white lg:p-0 lg:shadow-xl lg:shadow-[#121A61]/10 lg:ring-1 lg:ring-[#121A61]/10 ${ORDEN_DEMO[i]}`}
        >
          <EscenarioDemo activo={modo === 'acordeon'}>{demos[f.id]}</EscenarioDemo>
        </div>
      ))}
    </div>
  );
}
