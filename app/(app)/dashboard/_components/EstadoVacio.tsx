import { ACENTOS, ALERTA_AMBAR, ALERTA_ROSA, OSWALD, type ModuloDashboard } from '../_lib/acentos';

/**
 * El estado vacío de una card o de la página entera.
 *
 * Con la base sin seed de viandas y de presentismo, esto es lo que se ve por defecto,
 * así que **no es un borde: es el camino principal del día 1**. De ahí que el copy
 * tenga que explicar qué falta y qué hacer, y no quedar en "No hay datos".
 *
 * `role="status"` y no `alert`: no hay ningún error, solo todavía no hay datos.
 */
export default function EstadoVacio({
  titulo,
  detalle,
}: {
  titulo: string;
  detalle?: string;
}) {
  return (
    <div role="status" className="rounded-lg bg-[#F9FAFB] px-4 py-6 text-center">
      <p className="text-sm font-medium text-[#1C1C1C]">{titulo}</p>
      {detalle && <p className="mt-1 text-xs text-[#6B7280]">{detalle}</p>}
    </div>
  );
}

/**
 * Contenedor de una card con cuerpo: chrome blanco + encabezado opcional.
 *
 * **`titulo` es opcional a propósito.** Cada card vive dentro de un
 * `<BloqueDashboard>` que ya rotula el módulo, así que las cards cuyo título repetiría
 * el del bloque (plantel, eventos) lo omiten y quedan solo con su bajada. Las que
 * nombran algo distinto del módulo — "Próximos turnos" dentro de *Turnos*, "Ausencias
 * reiteradas" dentro de *Presentismo* — sí lo llevan.
 *
 * **`h3` y no `h2`**: el `h2` ahora es el del bloque. El outline de la página quedó
 * `h1 Dashboard → h2 Módulo → h3 Card`, que es lo que un lector de pantalla necesita
 * para saltar por módulo.
 */
export function CardSeccion({
  titulo,
  descripcion,
  modulo,
  variante = 'default',
  badge,
  children,
}: {
  titulo?: string;
  descripcion?: string;
  /** El borde superior del módulo (solo en `default`). */
  modulo?: ModuloDashboard;
  variante?: 'default' | 'alerta-ambar' | 'alerta-rosa';
  /** Pill en la esquina superior derecha ("REVISAR"). Solo tiene sentido en las alertas. */
  badge?: string;
  children: React.ReactNode;
}) {
  const conEncabezado = Boolean(titulo || descripcion || badge);
  const alerta =
    variante === 'alerta-ambar' ? ALERTA_AMBAR : variante === 'alerta-rosa' ? ALERTA_ROSA : null;
  const chrome = alerta
    ? alerta.card
    : `bg-white border border-gray-100 ${modulo ? ACENTOS[modulo].bordeSuperior : ''}`;

  return (
    <div className={`${chrome} rounded-2xl shadow-sm p-5 md:p-6 h-full min-w-0`}>
      {conEncabezado && (
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            {titulo && (
              <h3
                className={`text-lg font-semibold ${alerta ? alerta.valor : 'text-[#121A61]'}`}
                style={OSWALD}
              >
                {titulo}
              </h3>
            )}
            {descripcion && (
              <p
                className={`${titulo ? 'mt-0.5' : ''} text-xs ${alerta ? alerta.detalle : 'text-[#6B7280]'}`}
              >
                {descripcion}
              </p>
            )}
          </div>
          {badge && (
            <span
              className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${alerta ? alerta.badge : 'bg-gray-100 text-[#1C1C1C]'}`}
            >
              {badge}
            </span>
          )}
        </div>
      )}
      {/* `@container`: las grillas de tiles y mini-cards se acomodan al ancho de la card. */}
      <div className={`@container ${conEncabezado ? 'mt-4' : ''}`}>{children}</div>
    </div>
  );
}
