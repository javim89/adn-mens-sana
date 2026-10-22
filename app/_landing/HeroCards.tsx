import {
  CursorDemo,
  PresentismoKpiDemo,
  PresentismoPorDiaDemo,
  TriageDemo,
  TurnosDemo,
} from './CardsDemo';

/**
 * Las cards flotantes alrededor del titular.
 *
 * **Dos layouts con el mismo DOM.** Desde `xl` cada card es `absolute` contra un borde
 * del hero (la composición de la referencia); por debajo, todas pasan a una grilla
 * debajo de los CTAs. `xl` y no `lg`: a 1024px el costado libre al lado del titular
 * mide ~190px y las cards lo pisarían.
 *
 * Cada card lleva dos capas: la de afuera hace la entrada desde su borde
 * (`landing-desde-borde`, con `--desde-x/--desde-y`) y la de adentro el flotado
 * idle (`landing-flotar`, con duración y fase propias). Separadas porque las dos
 * animan la posición y en un mismo elemento una pisaría a la otra.
 *
 * `data-morph-card` es el id del slot de `VentanaDashboard` al que viaja cada card en
 * el morph del scroll (`MorphHero`). El único cursor solo existe en la etapa 2 del
 * morph: aparece sobre la card de Viandas (`morphDestino`).
 *
 * Todo el bloque es decorativo: `aria-hidden` + `inert` lo sacan del árbol de
 * accesibilidad y del foco.
 */
export default function HeroCards() {
  return (
    <div
      aria-hidden
      inert
      data-testid="hero-cards"
      className="mx-auto mt-14 grid w-full max-w-xl grid-cols-1 gap-5 sm:max-w-3xl sm:grid-cols-2 xl:pointer-events-none xl:absolute xl:inset-0 xl:mt-0 xl:block xl:max-w-none"
    >
      {/* Arriba a la izquierda: triage. */}
      <div data-morph-card="triage" className="landing-desde-borde min-w-0 [--retraso:500ms] xl:absolute xl:-left-10 xl:top-6 xl:w-[300px] xl:[--desde-x:-80px]">
        <div className="landing-flotar h-full [--duracion:7s] [--fase:0s]">
          <TriageDemo columnas={2} />
        </div>
      </div>

      {/* Derecha, a media altura: KPI con anillo. Más abajo que el triage de la izquierda
          para que la columna derecha no quede vacía abajo ahora que no hay buscador. */}
      <div data-morph-card="presentismo-kpi" className="landing-desde-borde min-w-0 [--retraso:650ms] xl:absolute xl:-right-10 xl:top-[280px] xl:w-[270px] xl:[--desde-x:80px]">
        <div className="landing-flotar h-full [--duracion:8s] [--fase:-2s]">
          <PresentismoKpiDemo />
        </div>
      </div>

      {/* Abajo a la izquierda: gráfico. */}
      <div data-morph-card="presentismo-dia" className="landing-desde-borde min-w-0 [--retraso:800ms] xl:absolute xl:bottom-6 xl:left-4 xl:w-[300px] xl:[--desde-y:80px]">
        <div className="landing-flotar h-full [--duracion:7.5s] [--fase:-4s]">
          <PresentismoPorDiaDemo />
        </div>
      </div>

      {/* Abajo al centro, debajo de los CTAs: turnos. Anclada por arriba (como el bloque
          de texto) y no por abajo: así nunca pisa los CTAs, y en pantallas bajas asoma
          cortada por el borde. */}
      <div data-morph-card="turnos" className="landing-desde-borde hidden min-w-0 [--retraso:950ms] sm:block xl:absolute xl:inset-x-0 xl:top-[640px] xl:mx-auto xl:w-[310px] xl:[--desde-y:80px]">
        <div className="landing-flotar h-full [--duracion:6.5s] [--fase:-1s]">
          <TurnosDemo cantidad={2} />
        </div>
      </div>

      {/* Solo en la etapa 2 del morph: llega a la card de Viandas. Rol real: responsable_viandas. */}
      <CursorDemo
        rol="Viandas"
        morphDestino="viandas,420,100"
        iniciales="V"
        className="morph-cursor-etapa2 absolute left-0 top-0 hidden"
      />
    </div>
  );
}
