export interface SegmentoBarra {
  clave: string;
  label: string;
  cantidad: number;
  /** Clase de fondo LITERAL del segmento (`bg-red-600`). */
  clase: string;
  /** Clase del texto de la etiqueta dentro del segmento. Blanco por defecto. */
  claseTexto?: string;
}

/** Debajo de este porcentaje el segmento es muy angosto para que la etiqueta entre. */
const UMBRAL_ETIQUETA = 15;

/**
 * Barra horizontal apilada, en CSS puro (es un Server Component: nada de recharts).
 *
 * - Los segmentos en 0 se omiten: un segmento de 0% no se ve y solo ensucia el DOM.
 * - La etiqueta ("85% en rojo") va DENTRO del segmento mayor, y solo si ese segmento
 *   ocupa al menos el 15%: más angosto, el texto se desbordaría sobre el vecino.
 * - `total === 0` no se renderiza: el llamador muestra su estado vacío. Así nunca hay
 *   un `NaN` en un `width`.
 * - Los segmentos no son links: los links están en las mini-cards de abajo, que tienen
 *   un área de toque razonable. Un segmento de 3px no la tiene.
 */
export default function BarraApilada({
  segmentos,
  total,
  etiquetaMayor,
  grosor = 'gruesa',
}: {
  segmentos: SegmentoBarra[];
  total: number;
  /** El texto dentro del segmento mayor, a partir de él y de su porcentaje. */
  etiquetaMayor?: (segmento: SegmentoBarra, porcentaje: number) => string;
  grosor?: 'fina' | 'gruesa';
}) {
  if (total <= 0) return null;

  const visibles = segmentos.filter((s) => s.cantidad > 0);
  const mayor = visibles.reduce<SegmentoBarra | null>(
    (m, s) => (m === null || s.cantidad > m.cantidad ? s : m),
    null,
  );
  const gruesa = grosor === 'gruesa';

  return (
    <div
      role="img"
      aria-label={visibles.map((s) => `${s.label}: ${s.cantidad}`).join(', ')}
      className={`flex w-full overflow-hidden rounded-full bg-gray-100 ${gruesa ? 'h-8' : 'h-2.5'}`}
    >
      {visibles.map((s) => {
        const porcentaje = (s.cantidad / total) * 100;
        const conEtiqueta =
          gruesa && etiquetaMayor && s === mayor && porcentaje >= UMBRAL_ETIQUETA;
        return (
          <div
            key={s.clave}
            data-segmento={s.clave}
            className={`flex h-full min-w-0 items-center ${conEtiqueta ? 'px-3' : ''} ${s.clase}`}
            style={{ width: `${porcentaje}%` }}
          >
            {conEtiqueta && (
              <span
                className={`truncate text-xs font-semibold ${s.claseTexto ?? 'text-white'}`}
                aria-hidden
              >
                {etiquetaMayor(s, Math.round(porcentaje))}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
