'use client';

import { useEffect, useRef } from 'react';
import {
  acercar,
  contar,
  deltaHaciaSlot,
  encajarVentana,
  enProgreso,
  lerp,
  progresoScroll,
  puntoEnVentana,
  salida,
  suave,
  tramo,
  transformCard,
  transformEn,
  type Punto,
} from './morph';

/**
 * Cuándo se arma el morph: `xl` (debajo la grilla de cards del hero no es la
 * composición flotante) y un alto mínimo razonable. La ventana se escala al alto que
 * haya, y el hero tiene un alto mínimo propio (`globals.css`): en una laptop de ~720px
 * las cards de abajo quedan cortadas por el borde, como en la referencia, en vez de
 * pisar los CTAs. Con `prefers-reduced-motion` queda el hero y la ventana estática.
 */
export const MEDIA_MORPH =
  '(min-width: 1280px) and (min-height: 640px) and (prefers-reduced-motion: no-preference)';

/**
 * Los tramos de cada pieza, en VIEWPORTS de scroll dentro del pin (`PIN_VH` = 2.3).
 *
 * - **Etapa 1 (0 → 0.91):** el hero se arma en el dashboard. Mismos px que cuando el
 *   pin era de 1.3 viewports.
 * - **Pausa (0.91 → 1):** el dashboard armado, quieto.
 * - **Etapa 2 (1 → 2):** el contenido scrollea ADENTRO de la ventana, como en el
 *   `<main>` del `AppShell` real (el encabezado "Dashboard" se va con él), hasta mostrar la fila de Seguimientos, Viandas y Plantel, que se anima al
 *   llegar. El cursor de Viandas aparece sobre su card.
 * - **Pausa (2 → 2.3)** y la página sigue.
 */
const TRAMOS = {
  pill: enProgreso([0, 0.234]),
  texto: enProgreso([0, 0.52]),
  ventana: enProgreso([0, 0.78]),
  cards: enProgreso([0, 0.91]),
  extras: enProgreso([0.65, 0.91]),
  scrollInterno: enProgreso([1, 2]),
  cursor: enProgreso([1.3, 1.9]),
  contadores: enProgreso([1.3, 1.95]),
  barras: enProgreso([1.35, 1.95]),
  degrade: enProgreso([1.8, 2]),
} as const;

/** Desde acá las cards ya aterrizaron: la ventana muestra sus copias y deja de verse el vuelo. */
const INICIO_ETAPA_2 = enProgreso([0.95, 0.95])[0];

/** La ventana arranca asomada abajo del hero: su borde superior a esta altura del fondo. */
const ASOMA_PX = 150;
/** Opacidad de la ventana asomada al inicio. */
const OPACIDAD_INICIAL = 0.15;

/** Margen de la ventana dentro del escenario, debajo del nav. */
const MARGEN = { arriba: 12, abajo: 28, lados: 48 };

interface Medidas {
  alto: number;
  inicio: number;
  recorrido: number;
  ventana: { escala: number; x: number; y: number };
  /** Cuánto scrollea el contenido de la ventana en la etapa 2 (px de diseño). */
  scrollInterno: number;
  cards: { el: HTMLElement; origen: Punto; delta: Punto }[];
  /** El cursor de la etapa 2: `base` es su posición de layout y `hasta`, dónde aparece. */
  cursores: { el: HTMLElement; base: Punto; hasta: Punto }[];
  /** Los números de la fila 2 que cuentan hacia arriba. */
  contadores: { el: HTMLElement; final: number }[];
}

/** La posición de `el` relativa a `ancestro`, sin transforms (suma de `offset*`). */
function offsetRelativo(el: HTMLElement, ancestro: HTMLElement): Punto {
  let x = 0;
  let y = 0;
  let actual: HTMLElement | null = el;
  while (actual && actual !== ancestro) {
    x += actual.offsetLeft;
    y += actual.offsetTop;
    actual = actual.offsetParent as HTMLElement | null;
  }
  return { x, y };
}

function limpiar(raiz: HTMLElement) {
  raiz
    .querySelectorAll<HTMLElement>(
      '[data-morph-card], [data-morph-cursor], [data-morph-texto], [data-morph-pill], [data-morph-ventana], [data-morph-extra], [data-morph-contenido], [data-morph-degrade], [data-morph-degrade-arriba], [data-barra], .landing-crecer-x > *',
    )
    .forEach((el) => {
      el.style.transform = '';
      el.style.opacity = '';
      el.style.filter = '';
      el.style.visibility = '';
      el.style.clipPath = '';
    });
  raiz.querySelectorAll<HTMLElement>('[data-kpi-valor][data-final]').forEach((el) => {
    el.textContent = el.dataset.final!;
  });
  raiz.removeAttribute('data-morph-etapa2');
}

/**
 * El scroll del hero que arma el dashboard: las cards flotantes viajan (FLIP) desde
 * su lugar en el hero hasta su slot en la ventana de `VentanaDashboard`, mientras el
 * titular se va y la ventana aparece.
 *
 * **Sin estado de React por frame.** Las medidas se toman al montar y en cada resize;
 * el scroll (listener pasivo + `requestAnimationFrame`) solo escribe `transform`,
 * `opacity` y `filter` en el DOM. Las posiciones salen de `offsetLeft/Top`, que
 * ignoran transforms: medir no depende de en qué punto de la animación esté nada.
 *
 * **Apagado por defecto.** El HTML del servidor llega con `data-morph="off"`: hero
 * normal y la ventana estática abajo. Solo en el cliente, y si `MEDIA_MORPH` matchea,
 * pasa a `on` (wrapper alto + escenario sticky; ver `globals.css`).
 */
export default function MorphHero({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const raiz = ref.current;
    if (!raiz || typeof window.matchMedia !== 'function') return;
    const escenario = raiz.querySelector<HTMLElement>('[data-morph-escenario]');
    const ventanaEl = raiz.querySelector<HTMLElement>('[data-morph-ventana]');
    if (!escenario || !ventanaEl) return;
    const columnaEl = ventanaEl.querySelector<HTMLElement>('[data-morph-columna]');
    const contenidoEl = ventanaEl.querySelector<HTMLElement>('[data-morph-contenido]');
    const degradeEl = ventanaEl.querySelector<HTMLElement>('[data-morph-degrade]');
    const degradeArribaEl = ventanaEl.querySelector<HTMLElement>('[data-morph-degrade-arriba]');

    const media = window.matchMedia(MEDIA_MORPH);
    let medidas: Medidas | null = null;
    let frame = 0;
    // El progreso que se pinta: persigue al del scroll (scrub suave) en `paso`.
    let pintado = 0;

    const aplicar = (p: number) => {
      if (!medidas) return;
      raiz.toggleAttribute('data-morph-activo', p > 0);

      const tPill = tramo(p, ...TRAMOS.pill, salida);
      raiz.querySelectorAll<HTMLElement>('[data-morph-pill]').forEach((el) => {
        el.style.opacity = String(1 - tPill);
        el.style.visibility = tPill >= 0.98 ? 'hidden' : '';
      });

      // El titular sube, se achica y se desenfoca: queda detrás de la ventana que llega.
      const tTexto = tramo(p, ...TRAMOS.texto, salida);
      raiz.querySelectorAll<HTMLElement>('[data-morph-texto]').forEach((el) => {
        el.style.transform = `translate3d(0, ${-140 * tTexto}px, 0) scale(${lerp(1, 0.75, tTexto)})`;
        el.style.opacity = String(1 - tTexto);
        el.style.filter = tTexto > 0 ? `blur(${8 * tTexto}px)` : '';
        // Invisible = fuera del foco y de los clicks: los CTAs no quedan "fantasma".
        el.style.visibility = tTexto >= 0.98 ? 'hidden' : '';
      });

      // La ventana sube desde abajo (asomada y casi transparente) hasta su lugar.
      const tVentana = tramo(p, ...TRAMOS.ventana, salida);
      const v = medidas.ventana;
      const yAsomada = Math.max(v.y, medidas.alto - ASOMA_PX);
      ventanaEl.style.transform = `translate3d(${v.x}px, ${lerp(yAsomada, v.y, tVentana)}px, 0) scale(${v.escala})`;
      ventanaEl.style.opacity = String(lerp(OPACIDAD_INICIAL, 1, tVentana));
      ventanaEl.style.filter = tVentana < 1 ? `blur(${6 * (1 - tVentana)}px)` : '';

      const tCards = tramo(p, ...TRAMOS.cards, salida);
      for (const c of medidas.cards) {
        c.el.style.transform = transformCard(c.delta, v.escala, tCards);
      }
      // El cursor de la etapa 2 aparece subiendo sobre su card.
      const tCursor = tramo(p, ...TRAMOS.cursor, salida);
      for (const c of medidas.cursores) {
        c.el.style.opacity = String(tCursor);
        c.el.style.transform = transformEn(c.base, { x: c.hasta.x, y: c.hasta.y + 40 * (1 - tCursor) }, v.escala);
      }

      const tExtras = tramo(p, ...TRAMOS.extras, salida);
      raiz.querySelectorAll<HTMLElement>('[data-morph-extra]').forEach((el) => {
        el.style.opacity = String(tExtras);
        el.style.transform = `translate3d(0, ${16 * (1 - tExtras)}px, 0)`;
      });

      // Etapa 2. Al arrancar, las cards del hero (ya en sus slots) se cambian por sus
      // copias dentro de la ventana, que sí scrollean y se recortan con ella.
      raiz.toggleAttribute('data-morph-etapa2', p >= INICIO_ETAPA_2);
      const tScroll = tramo(p, ...TRAMOS.scrollInterno, suave);
      if (contenidoEl) {
        contenidoEl.style.transform = `translate3d(0, ${-medidas.scrollInterno * tScroll}px, 0)`;
      }
      if (degradeEl) degradeEl.style.opacity = String(1 - tramo(p, ...TRAMOS.degrade));
      if (degradeArribaEl) degradeArribaEl.style.opacity = String(tScroll);

      const tContar = tramo(p, ...TRAMOS.contadores, salida);
      for (const c of medidas.contadores) c.el.textContent = String(contar(c.final, tContar));

      const tBarras = tramo(p, ...TRAMOS.barras, salida);
      raiz.querySelectorAll<HTMLElement>('[data-morph-extra] [data-barra]').forEach((el) => {
        el.style.transform = `scaleY(${tBarras})`;
      });
      raiz.querySelectorAll<HTMLElement>('[data-morph-extra] .landing-crecer-x > *').forEach((el) => {
        el.style.clipPath = `inset(0 ${100 * (1 - tBarras)}% 0 0)`;
      });
    };

    const medir = () => {
      if (!media.matches) {
        raiz.dataset.morph = 'off';
        raiz.removeAttribute('data-morph-activo');
        limpiar(raiz);
        medidas = null;
        pintado = 0;
        return;
      }
      raiz.dataset.morph = 'on';

      // `offsetLeft/Top` se miden desde el borde de padding de la ventana, pero su
      // `transform` (y la escala) parten del borde exterior: se suma el borde de 1px.
      const enVentana = (el: HTMLElement): Punto => {
        const pos = offsetRelativo(el, ventanaEl);
        return { x: pos.x + ventanaEl.clientLeft, y: pos.y + ventanaEl.clientTop };
      };

      const nav = raiz.querySelector<HTMLElement>('[data-morph-nav]');
      const ventana = encajarVentana(
        { ancho: escenario.clientWidth, alto: escenario.clientHeight },
        { ancho: ventanaEl.offsetWidth, alto: ventanaEl.offsetHeight },
        { ...MARGEN, arriba: (nav?.offsetHeight ?? 0) + MARGEN.arriba },
      );

      const cards: Medidas['cards'] = [];
      raiz.querySelectorAll<HTMLElement>('[data-morph-card]').forEach((el) => {
        const id = el.dataset.morphCard!;
        const slot = ventanaEl.querySelector<HTMLElement>(`[data-morph-slot="${id}"]`);
        if (!slot) return;
        const origen = offsetRelativo(el, escenario);
        const delta = deltaHaciaSlot(origen, enVentana(slot), ventana);
        const c = { el, origen, delta };
        cards.push(c);
      });

      const scrollInterno =
        columnaEl && contenidoEl ? Math.max(0, contenidoEl.offsetHeight - columnaEl.clientHeight) : 0;

      const cursores: Medidas['cursores'] = [];
      raiz.querySelectorAll<HTMLElement>('[data-morph-cursor]').forEach((el) => {
        const [ancla, x = '0', y = '0'] = (el.dataset.morphCursor ?? '').split(',');
        const anclaEl = ancla ? ventanaEl.querySelector<HTMLElement>(`[data-morph-ancla="${ancla}"]`) : null;
        if (!anclaEl) return;
        const pos = enVentana(anclaEl);
        cursores.push({
          el,
          base: offsetRelativo(el, escenario),
          hasta: puntoEnVentana({ x: pos.x + Number(x), y: pos.y + Number(y) }, ventana, scrollInterno),
        });
      });

      const contadores: Medidas['contadores'] = [];
      ventanaEl.querySelectorAll<HTMLElement>('[data-morph-extra] [data-kpi-valor]').forEach((el) => {
        el.dataset.final ??= el.textContent ?? '';
        const final = Number(el.dataset.final);
        if (Number.isFinite(final)) contadores.push({ el, final });
      });

      const rect = raiz.getBoundingClientRect();
      medidas = {
        alto: escenario.clientHeight,
        inicio: rect.top + window.scrollY,
        recorrido: raiz.offsetHeight - window.innerHeight,
        ventana,
        scrollInterno,
        cards,
        cursores,
        contadores,
      };
      // Al medir (carga, resize) se pinta el estado exacto, sin perseguir.
      pintado = objetivo();
      aplicar(pintado);
    };

    const objetivo = () =>
      medidas ? progresoScroll(window.scrollY, medidas.inicio, medidas.recorrido) : 0;

    /** Un frame del scrub: acerca `pintado` al progreso del scroll y sigue hasta llegar. */
    const paso = () => {
      frame = 0;
      if (!medidas) return;
      const meta = objetivo();
      pintado = acercar(pintado, meta);
      aplicar(pintado);
      if (pintado !== meta) frame = window.requestAnimationFrame(paso);
    };

    const alScrollear = () => {
      if (!frame) frame = window.requestAnimationFrame(paso);
    };

    /**
     * Un CTA del hero que recibe foco con teclado mientras el morph está avanzado
     * (semitransparente o desplazado): se vuelve al inicio del pin para que se vea.
     */
    const alEnfocar = (e: FocusEvent) => {
      if (!medidas || pintado <= 0) return;
      if (!(e.target instanceof Element) || !e.target.closest('[data-morph-texto]')) return;
      // Solo con teclado: un click con el mouse ya ve el CTA y no tiene que saltar.
      if (!e.target.matches(':focus-visible')) return;
      window.scrollTo({ top: medidas.inicio, behavior: 'instant' });
      pintado = 0;
      aplicar(0);
    };

    medir();
    raiz.addEventListener('focusin', alEnfocar);
    window.addEventListener('scroll', alScrollear, { passive: true });
    window.addEventListener('resize', medir);
    media.addEventListener?.('change', medir);
    // Las fuentes cambian el alto del titular y con eso la posición de todo.
    document.fonts?.ready.then(medir).catch(() => {});

    return () => {
      raiz.removeEventListener('focusin', alEnfocar);
      window.removeEventListener('scroll', alScrollear);
      window.removeEventListener('resize', medir);
      media.removeEventListener?.('change', medir);
      if (frame) window.cancelAnimationFrame(frame);
      raiz.dataset.morph = 'off';
      limpiar(raiz);
    };
  }, []);

  return (
    <div ref={ref} data-morph="off" data-testid="morph-hero" className="morph-envoltura relative">
      <div data-morph-escenario className="morph-escenario relative isolate">
        {children}
      </div>
    </div>
  );
}
