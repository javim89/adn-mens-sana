import type { ClavePantalla } from '@/app/_landing/funcionalidades/catalogo';
import { DESCRIPCION_PANTALLA, PANTALLAS } from '../pantallas';

/**
 * Una pantalla recreada con su descripción visible. La ventana es decorativa
 * (`aria-hidden` + `inert`); el `figcaption` es lo que leen las personas y los buscadores.
 */
export default function FiguraPantalla({
  clave,
  sobreOscuro = false,
  className,
}: {
  clave: ClavePantalla;
  sobreOscuro?: boolean;
  className?: string;
}) {
  return (
    <figure className={`min-w-0 ${className ?? ''}`}>
      {PANTALLAS[clave]()}
      <figcaption
        className={`mt-3 text-sm leading-relaxed ${sobreOscuro ? 'text-white/80' : 'text-[#4B5563]'}`}
      >
        {DESCRIPCION_PANTALLA[clave]}
      </figcaption>
    </figure>
  );
}
