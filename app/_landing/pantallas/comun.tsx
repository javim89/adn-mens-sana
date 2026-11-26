import type { NavItem } from '@/lib/roles';
import type { ClavePantalla } from '@/app/_landing/funcionalidades/catalogo';
import MarcoVentanaDemo from '../MarcoVentanaDemo';

/**
 * Piezas compartidas de las pantallas recreadas de `/funcionalidades`.
 *
 * Cada pantalla es una ventana de la app (`MarcoVentanaDemo` fluido, `enPagina`) con datos
 * fijos de `datos-demo.ts`. Son decorativas: `aria-hidden` + `inert`, sin links reales y
 * sin headings (`<h*>`) propios, así no ensucian el índice de títulos de la página. Lo que
 * muestran lo dice en texto visible el `figcaption` que pone la página
 * (`DESCRIPCION_PANTALLA`).
 *
 * Responsive con container queries: el contenido se acomoda al ancho del área principal
 * de la ventana (`@md:`, `@2xl:`…), no al viewport. Así la misma pantalla sirve en el hero
 * a todo el ancho y en la columna de un bloque, y a 375px no hay scroll horizontal.
 */
export function Pantalla({
  clave,
  activo,
  children,
}: {
  clave: ClavePantalla;
  activo: NavItem['href'];
  children: React.ReactNode;
}) {
  return (
    <MarcoVentanaDemo
      activo={activo}
      variante="funcionalidad"
      enPagina
      aria-hidden
      inert
      data-pantalla={clave}
    >
      {children}
    </MarcoVentanaDemo>
  );
}

/** El encabezado de una pantalla: título en Oswald, un contador opcional y la acción principal. */
export function EncabezadoPantalla({
  titulo,
  contador,
  accion,
  bajada,
}: {
  titulo: string;
  contador?: string;
  accion?: string;
  bajada?: string;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="min-w-0 font-[family-name:var(--font-oswald)] text-lg font-bold text-[#121A61] @md:text-xl @3xl:text-2xl">
            {titulo}
          </p>
          {contador && (
            <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-[#6B7280]">
              {contador}
            </span>
          )}
        </div>
        {bajada && <p className="mt-0.5 text-xs text-[#6B7280] @md:text-sm">{bajada}</p>}
      </div>
      {accion && <BotonDemo>{accion}</BotonDemo>}
    </div>
  );
}

/** Un botón primario de mentira (no es un `<button>`: la pantalla no es interactiva). */
export function BotonDemo({
  children,
  variante = 'primario',
  className,
}: {
  children: React.ReactNode;
  variante?: 'primario' | 'secundario';
  className?: string;
}) {
  const estilo =
    variante === 'primario'
      ? 'bg-[#121A61] text-white'
      : 'border border-gray-200 bg-white text-[#1C1C1C]';
  return (
    <span
      className={`inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-semibold whitespace-nowrap ${estilo} ${className ?? ''}`}
    >
      {children}
    </span>
  );
}

/** Pill de filtro. `activo` = con un valor elegido. */
export function FiltroDemo({ children, activo = false }: { children: React.ReactNode; activo?: boolean }) {
  return (
    <span
      className={`inline-flex h-8 min-w-0 shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs font-medium whitespace-nowrap ${activo ? 'border-[#3346CC]/30 bg-[#3346CC]/10 text-[#3346CC]' : 'border-gray-200 bg-white text-[#1C1C1C]'}`}
    >
      {children}
    </span>
  );
}

/** Card blanca de la app. */
export function PanelDemo({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`min-w-0 rounded-xl border border-gray-100 bg-white shadow-sm ${className ?? ''}`}>
      {children}
    </div>
  );
}

/** Rótulo chico en mayúsculas (encabezados de columnas y de paneles). */
export function RotuloDemo({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={`text-xs font-semibold uppercase tracking-wide text-[#6B7280] ${className ?? ''}`}>
      {children}
    </p>
  );
}

export const BADGE = 'inline-flex w-fit shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap';
