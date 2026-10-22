'use client';

import { useEffect, useRef, useState } from 'react';
import { prefiereMenosMovimiento } from './movimiento';

type Estado = 'inicial' | 'oculto' | 'visible';

/**
 * Hace aparecer su contenido (fade + slide) cuando entra al viewport.
 *
 * **Visible por defecto**: el HTML del servidor no esconde nada (`data-reveal` arranca
 * en `inicial`). Recién en el cliente, y solo si hay `IntersectionObserver` y no se
 * pidió reducir el movimiento, pasa a `oculto` hasta que entra a la vista. Así una
 * sección nunca queda invisible porque el JS no cargó.
 *
 * El estilo de cada estado vive en `globals.css` (`[data-reveal]`).
 */
export default function Reveal({
  children,
  className,
  retrasoMs = 0,
}: {
  children: React.ReactNode;
  className?: string;
  retrasoMs?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [estado, setEstado] = useState<Estado>('inicial');

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined' || prefiereMenosMovimiento()) {
      setEstado('visible');
      return;
    }
    setEstado('oculto');
    const observer = new IntersectionObserver(
      (entradas) => {
        if (entradas.some((e) => e.isIntersecting)) {
          setEstado('visible');
          observer.disconnect();
        }
      },
      { rootMargin: '0px 0px -10% 0px', threshold: 0.1 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      data-reveal={estado}
      className={className}
      style={retrasoMs ? { transitionDelay: `${retrasoMs}ms` } : undefined}
    >
      {children}
    </div>
  );
}
