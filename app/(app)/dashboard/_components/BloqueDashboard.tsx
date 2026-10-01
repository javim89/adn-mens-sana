import { ACENTOS, OSWALD, type ModuloDashboard } from '../_lib/acentos';

/**
 * El encabezado de un MÓDULO del dashboard: "Triage", "Viandas", "Turnos"…
 *
 * ============================================================================
 * POR QUÉ EXISTE
 * ============================================================================
 * Antes las 7 secciones eran un stack plano de grillas separadas por el mismo `gap-5`
 * que separa las cards *dentro* de cada sección. Sin un salto de jerarquía, la página
 * se leía como una sola pared de cards: no había forma de saber que la card de
 * "Viandas entregadas" y la de "Turnos de esta semana" son de módulos distintos, ni
 * dónde termina uno y empieza el otro.
 *
 * El bloque resuelve las dos cosas: pone un rótulo con el nombre del módulo en una
 * barra lavanda que corta el ancho (con el cuadradito del color del módulo, el mismo
 * que llevan sus cards), y la page separa bloque de bloque con `gap-10` — el doble
 * del `gap-5` interno. La distancia pasa a significar algo.
 *
 * ============================================================================
 * SE RENDERIZA FUERA DEL `<Suspense>`, Y ESO ES EL PUNTO
 * ============================================================================
 * El encabezado vive en `page.tsx`, envolviendo al `<Suspense>` en vez de adentro de
 * la sección. Así el esqueleto de la página (los 7 rótulos) aparece **entero en el
 * primer paint**, y cada bloque solo rellena su contenido cuando resuelve su query. Si
 * el título viviera dentro del componente de la sección, aparecería recién con los
 * datos y la página saltaría entera en cada resolución.
 *
 * Como efecto secundario el título es estático: no depende de la query, así que no
 * rompe la regla de que ninguna query se invoca desde `page.tsx`.
 */
export default function BloqueDashboard({
  id,
  titulo,
  descripcion,
  modulo,
  children,
}: {
  /**
   * El `CardId` del módulo. Solo se usa para atar el `<section>` a su `<h2>` vía
   * `aria-labelledby`: un lector de pantalla puede saltar de módulo a módulo y
   * escuchar "Triage", "Viandas"… en vez de siete regiones sin nombre.
   *
   * Es una prop y no un `useId()` porque los Server Components no corren hooks.
   */
  id: string;
  titulo: string;
  /** Qué mide el módulo y de qué período. Estático: no puede depender de la query. */
  descripcion: string;
  /** El color del cuadradito, el mismo acento que llevan las cards del módulo. */
  modulo: ModuloDashboard;
  children: React.ReactNode;
}) {
  const idTitulo = `bloque-${id}`;

  return (
    <section aria-labelledby={idTitulo} className="flex flex-col">
      {/**
       * `flex-wrap`: en desktop título, separador y descripción van en una línea; en
       * mobile la descripción baja sola y el separador desaparece (quedaría colgando
       * al final del renglón). El separador aparece recién en `lg` y no en `sm`: entre
       * 768 y 1023px el sidebar fijo deja ~512px de contenido y la descripción baja de
       * línea, así que con `sm:block` quedaba colgado.
       */}
      <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl bg-[#DFE3EF] px-4 py-3">
        <h2
          id={idTitulo}
          className="flex items-center gap-2.5 text-sm font-semibold uppercase tracking-[0.14em] text-[#121A61]"
          style={OSWALD}
        >
          <span
            data-testid="bloque-cuadrado"
            className={`h-3 w-3 shrink-0 rounded-sm ${ACENTOS[modulo].cuadrado}`}
            aria-hidden
          />
          {titulo}
        </h2>
        <span className="hidden h-4 w-px bg-[#B8BFD6] lg:block" aria-hidden />
        <p className="min-w-0 text-xs text-[#4A5368]">{descripcion}</p>
      </div>

      {/**
       * Columna flex + `flex-1 min-h-0`: en las grillas de dos columnas (plantel y
       * calendario) la grilla estira el `<section>` al alto de la fila y las cards usan
       * `h-full` para quedar parejas. Sin este wrapper, ese `h-full` se mide contra el
       * alto de la sección entera y la card se pasa por el alto del encabezado: el
       * sobrante convierte a `<main>` en un scroller anidado y la rueda del mouse se
       * traba ahí antes de seguir con la página. Acá `h-full` se mide contra lo que
       * queda debajo del encabezado.
       */}
      <div className="min-h-0 flex-1">{children}</div>
    </section>
  );
}
