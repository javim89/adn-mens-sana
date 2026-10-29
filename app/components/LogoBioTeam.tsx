import Image from 'next/image';

/** Proporción del ícono (viewBox 850 × 1111): no es cuadrado. */
const ANCHO = 85;
const ALTO = 111;

const SRC = {
  normal: '/brand/bioteam-logo.svg',
  inverso: '/brand/bioteam-logo-inverso.svg',
} as const;

export type VarianteLogo = keyof typeof SRC;

/**
 * El ícono de BioTeam: la "b" diagonal con el punto dorado.
 *
 * - `normal` (b azul marino): sobre fondos claros.
 * - `inverso` (b blanca): sobre azul marino u oscuros.
 *
 * Siempre va junto al wordmark `BioTeam`, que es el que da el nombre accesible: por eso
 * el ícono es decorativo (`alt=""`). El alto se fija con `className` (ej. `h-7`); el
 * ancho sale de la proporción. No confundir con `/logo.png`, que es el escudo de un club.
 */
export default function LogoBioTeam({
  variante = 'normal',
  className = 'h-7',
  eager = false,
}: {
  variante?: VarianteLogo;
  className?: string;
  /** Para el logo que se ve al cargar (nav, sidebar, auth): evita el lazy-load. */
  eager?: boolean;
}) {
  return (
    <Image
      src={SRC[variante]}
      alt=""
      aria-hidden
      width={ANCHO}
      height={ALTO}
      loading={eager ? 'eager' : 'lazy'}
      data-logo-bioteam={variante}
      className={`w-auto shrink-0 ${className}`}
    />
  );
}
