'use client';

import { useEffect, useState } from 'react';

/**
 * `true` cuando el viewport es más angosto que `breakpoint`.
 *
 * Arranca en `false` y se corrige después del montaje: en SSR no hay `window`,
 * y asumir "escritorio" evita que el primer render del servidor y el del
 * cliente difieran (lo que produciría un error de hidratación).
 */
export function useIsTouchWidth(breakpoint: number): boolean {
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    const query = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const update = () => setIsTouch(query.matches);

    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, [breakpoint]);

  return isTouch;
}
