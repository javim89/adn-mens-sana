import Link from 'next/link';
import { OSWALD } from '../_lib/acentos';

export interface ItemNivel {
  clave: string;
  label: string;
  cantidad: number;
  href: string;
  /** El nombre accesible del link: incluye el label y el conteo. */
  ariaLabel: string;
  /** Clase LITERAL del punto de color (`bg-red-600`). */
  punto: string;
  /** Clase LITERAL del fondo tintado (`bg-red-50`). */
  tinte: string;
}

/**
 * Columnas según el ancho de la CARD (container queries `@sm`/`@lg`), no del viewport:
 * con el sidebar fijo de 256px, a 1024px de viewport la columna 3/5 mide ~360px y con
 * `lg:grid-cols-5` los labels quedaban en "Na…", "A…". Las 5 en fila piden ≥576px
 * (`@xl`): con menos, "Sin calcular" se trunca (medido a 1280px: la card mide ~516px y
 * queda en 3 + 2). El `@container` lo ponen
 * `CardSeccion` y `KpiCard` en su cuerpo. Literales: Tailwind no ve clases concatenadas.
 */
const COLUMNAS = {
  2: 'grid-cols-2',
  3: 'grid-cols-2 @sm:grid-cols-3',
  4: 'grid-cols-2 @sm:grid-cols-4',
  5: 'grid-cols-2 @sm:grid-cols-3 @xl:grid-cols-5',
} as const;

/**
 * Mini-cards tintadas por nivel/estado: punto + label, número grande y el % del total.
 *
 * Cada una es un link a su filtro exacto, así que el número que muestra es el que va a
 * contar el listado. **Las de 0 no se esconden**: "no hay nadie en naranja" es
 * información; se atenúan para que el ojo vaya a las que tienen gente. La atenuación
 * es con gris `#6B7280` y sin tinte, NO con `opacity`: siguen siendo links activos y
 * con `opacity-50` el texto caía a ~3:1 (no pasa AA).
 *
 * `total === 0` no divide: el % se omite.
 */
export default function MiniCardsNivel({
  items,
  total,
  columnas = 5,
}: {
  items: ItemNivel[];
  total: number;
  columnas?: keyof typeof COLUMNAS;
}) {
  return (
    <ul className={`grid gap-2.5 ${COLUMNAS[columnas]}`}>
      {items.map((it) => {
        const vacio = it.cantidad === 0;
        return (
          <li key={it.clave} className="min-w-0">
            <Link
              href={it.href}
              aria-label={it.ariaLabel}
              data-vacio={vacio || undefined}
              className={`group flex h-full flex-col rounded-xl px-3 py-2.5 transition-colors hover:ring-2 hover:ring-[#121A61]/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3346CC] ${vacio ? 'bg-gray-50' : it.tinte}`}
            >
              <span className="flex min-w-0 items-center gap-1.5">
                <span
                  className={`h-2 w-2 shrink-0 rounded-full ${vacio ? 'bg-gray-300' : it.punto}`}
                  aria-hidden
                />
                <span
                  className={`truncate text-xs font-medium group-hover:underline ${vacio ? 'text-[#6B7280]' : 'text-[#1C1C1C]'}`}
                >
                  {it.label}
                </span>
              </span>
              <span
                className={`mt-1 text-3xl font-semibold leading-none tabular-nums ${vacio ? 'text-[#6B7280]' : 'text-[#121A61]'}`}
                style={OSWALD}
              >
                {it.cantidad}
              </span>
              {total > 0 && (
                <span className="mt-1 text-xs tabular-nums text-[#4A5368]">
                  {Math.round((it.cantidad / total) * 100)}%
                </span>
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
