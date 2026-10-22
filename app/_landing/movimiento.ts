/** `true` si el usuario pidió reducir el movimiento. jsdom no trae `matchMedia`. */
export function prefiereMenosMovimiento(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}
