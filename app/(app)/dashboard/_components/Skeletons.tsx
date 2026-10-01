/**
 * Fallbacks de los `<Suspense>` de cada sección, y piezas del `loading.tsx`.
 *
 * Existen porque el dashboard streamea por sección: Next renderiza los hermanos
 * concurrentemente y pinta cada uno cuando resuelve, así que la página no espera a la
 * query más lenta (los `groupBy` de presentismo) para mostrar el primer número.
 *
 * Reproducen las grillas reales (2/5 + 3/5, mitades, fila completa) y el alto del
 * número gigante: si el skeleton fuera más bajo, la página saltaría al resolver.
 */

const CARD = 'bg-white rounded-2xl shadow-sm border border-gray-100 p-5 md:p-6 h-full';

/** Skeleton de una card de KPI. `cantidad` para las secciones que aportan varias. */
export function KpiSkeleton({ cantidad = 1 }: { cantidad?: number }) {
  return (
    <>
      {Array.from({ length: cantidad }).map((_, i) => (
        <div key={i} className={CARD} aria-hidden>
          <div className="h-4 w-36 bg-gray-100 rounded animate-pulse mb-4" />
          <div className="h-16 md:h-[72px] w-24 bg-gray-200 rounded-lg animate-pulse mb-4" />
          <div className="h-3 w-44 bg-gray-100 rounded animate-pulse mb-6" />
          <div className="h-4 w-28 bg-gray-100 rounded animate-pulse" />
        </div>
      ))}
    </>
  );
}

/**
 * Skeleton de una card con cuerpo (lista, tiles, mini-cards).
 *
 * `conTitulo={false}` para las cards que no llevan encabezado propio porque el rótulo
 * lo pone el `<BloqueDashboard>`. Si el skeleton dibujara una barra de título que la
 * card real no tiene, el contenido saltaría hacia arriba al resolver la query.
 */
export function PanelSkeleton({
  filas = 4,
  conTitulo = true,
}: {
  filas?: number;
  conTitulo?: boolean;
}) {
  return (
    <div className={CARD} aria-hidden>
      {conTitulo && <div className="h-6 w-44 bg-gray-200 rounded animate-pulse mb-4" />}
      <div className="space-y-2.5">
        {Array.from({ length: filas }).map((_, i) => (
          <div key={i} className="h-14 w-full bg-gray-50 rounded-xl animate-pulse" />
        ))}
      </div>
    </div>
  );
}

/** Una fila KPI (2/5) + panel (3/5), como Triage, Turnos y Presentismo. */
export function FilaSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
      <div className="min-w-0 lg:col-span-2">
        <KpiSkeleton />
      </div>
      <div className="min-w-0 lg:col-span-3">
        <PanelSkeleton />
      </div>
    </div>
  );
}

/** Dos cards iguales, como Viandas. */
export function MitadesSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <KpiSkeleton cantidad={2} />
    </div>
  );
}

/** La fila 2/5 + 3/5 de Seguimientos, más la fila completa de próximas citas. */
export function SeguimientosSkeleton() {
  return (
    <div className="flex flex-col gap-5">
      <FilaSkeleton />
      <PanelSkeleton filas={2} />
    </div>
  );
}

/** El encabezado de un bloque mientras carga: la misma barra lavanda que el real. */
export function EncabezadoBloqueSkeleton() {
  return (
    <div
      className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl bg-[#DFE3EF] px-4 py-3"
      aria-hidden
    >
      <div className="flex h-5 items-center gap-2.5">
        <div className="h-3 w-3 rounded-sm bg-[#B8BFD6]" />
        <div className="h-4 w-24 rounded bg-[#B8BFD6] animate-pulse" />
      </div>
      <div className="h-4 w-56 max-w-full rounded bg-[#CDD3E4] animate-pulse" />
    </div>
  );
}
