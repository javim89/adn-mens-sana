export interface CategoriaBarra {
  clave: string;
  label: string;
  /** `null` = no hay dato (p. ej. un día sin entrenamiento): barra vacía y "—". */
  valor: number | null;
}

/** Altura mínima de una barra con valor > 0, para que no desaparezca al lado de la máxima. */
const MINIMO_PX = 4;

/**
 * Barras verticales por categoría (comidas, días), en CSS puro.
 *
 * La máxima va en el color fuerte del módulo y el resto en el suave: el ojo encuentra
 * el pico sin leer los números. Con todo en cero no hay máximo que dividir — las
 * barras quedan planas y nunca aparece un `NaN` en un `height`.
 */
export default function BarrasCategoria({
  categorias,
  barraFuerte,
  barraSuave,
  formatear = (v) => String(v),
}: {
  categorias: CategoriaBarra[];
  /** Clase LITERAL de la barra máxima (`bg-indigo-600`). */
  barraFuerte: string;
  /** Clase LITERAL del resto (`bg-indigo-200`). */
  barraSuave: string;
  formatear?: (valor: number) => string;
}) {
  const maximo = Math.max(0, ...categorias.map((c) => c.valor ?? 0));

  return (
    <div
      role="img"
      aria-label={categorias
        .map((c) => `${c.label}: ${c.valor === null ? 'sin dato' : formatear(c.valor)}`)
        .join(', ')}
      className="flex items-end gap-2 sm:gap-3"
    >
      {categorias.map((c) => {
        const valor = c.valor ?? 0;
        const esMaxima = maximo > 0 && valor === maximo;
        const alto = maximo > 0 ? (valor / maximo) * 100 : 0;
        return (
          <div key={c.clave} className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
            <span className="text-xs font-semibold tabular-nums text-[#1C1C1C]">
              {c.valor === null ? '—' : formatear(c.valor)}
            </span>
            <div className="flex h-28 w-full items-end rounded-md bg-gray-50">
              <div
                data-barra={c.clave}
                className={`w-full rounded-md ${esMaxima ? barraFuerte : barraSuave}`}
                style={{
                  height: `${alto}%`,
                  minHeight: valor > 0 ? `${MINIMO_PX}px` : undefined,
                }}
              />
            </div>
            <span className="w-full truncate text-center text-xs text-[#5B6478]">
              {c.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
