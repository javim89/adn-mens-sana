'use client';

import { useEffect, useRef } from 'react';
import { calcularEscala } from './funcionalidades';

/**
 * El lienzo de una demo de funcionalidades.
 *
 * - En lg+ (`activo`) es un lienzo fijo de 1280×832 px de diseño (la app entera), escalado
 *   con `transform` para llenar el ancho de la ventana (`[data-demo]`, con la misma
 *   proporción): se ve la "captura" completa, sin recortes. Mide con `ResizeObserver` y
 *   escribe `--escala` y `data-escala` directo en el DOM, sin re-renderizar la demo. Sin
 *   JS, `globals.css` arranca la escala en un valor que entra en el ancho mínimo de cada
 *   breakpoint.
 * - Debajo de lg es un `div` de bloque sin transform: la demo se ve como siempre.
 */
export default function EscenarioDemo({ activo, children }: { activo: boolean; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const lienzo = ref.current;
    const ventana = lienzo?.parentElement;
    if (!activo || !lienzo || !ventana) return;

    const medir = () => {
      const escala = calcularEscala(ventana.clientWidth);
      lienzo.style.setProperty('--escala', escala.toFixed(4));
      lienzo.dataset.escala = escala.toFixed(2);
    };

    medir();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(medir);
    observer?.observe(ventana);
    return () => {
      observer?.disconnect();
      lienzo.style.removeProperty('--escala');
      delete lienzo.dataset.escala;
    };
  }, [activo]);

  return (
    <div
      ref={ref}
      data-demo-lienzo
      className="landing-lienzo relative w-full lg:absolute lg:left-0 lg:top-0 lg:h-[832px] lg:w-[1280px]"
    >
      {children}
    </div>
  );
}
