import { getDistribucionTriage } from '@/lib/queries/triage';
import type { RangoSemana } from '@/lib/utils/fecha';
import { calcularVariacion } from '../_lib/variacion';
import { diaYMesInstante } from '../_lib/formato';
import { linkTriage } from '../_lib/links';
import KpiCard from './KpiCard';
import TriageDistribucion from './TriageDistribucion';

/**
 * Triage: la card de ROJO y la distribución completa.
 *
 * **Las dos viven en el MISMO componente porque comparten la query** (una sola ida a
 * la base con los dos CTEs). Separarlas en dos `<Suspense>` obligaría o a ejecutar la
 * query dos veces, o a levantar el `await` a `page.tsx` — que es justamente lo que el
 * gating estructural prohíbe.
 *
 * **El corte es `desdeInstante` y no `desdeDb`**: `triage.calculated_at` es un
 * timestamp real, y usar el borde de fecha correría el corte 3 horas.
 */
export default async function SeccionTriage({ semana }: { semana: RangoSemana }) {
  const datos = await getDistribucionTriage(semana.desdeInstante);

  const rojoActual = datos.actual.ROJO;
  const variacion = calcularVariacion(rojoActual, datos.previo?.ROJO ?? null);

  // Cuando hay base, se nombra la FECHA del snapshot en vez de afirmar "vs. la semana
  // anterior": si el cron falló una semana, el baseline es más viejo y decirlo mal
  // haría dudar del número entero.
  const detalle = datos.ultimoPrevio
    ? `Comparado con el snapshot del ${diaYMesInstante(datos.ultimoPrevio)}.`
    : 'Todavía no hay un snapshot anterior con el que comparar.';

  return (
    /**
     * Sin `role="group"` ni `aria-label`: el `<BloqueDashboard>` que la envuelve ya es
     * un `<section aria-labelledby>` con el nombre del módulo. Dejar los dos hacía que
     * un lector de pantalla anunciara dos regiones anidadas para la misma cosa.
     */
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
      {/* Hero navy: es EL número del dashboard, el que más importa mirar primero. */}
      <div className="min-w-0 lg:col-span-2">
        <KpiCard
          variante="hero"
          label="Deportistas activos en rojo"
          valor={rojoActual}
          detalle={detalle}
          variacion={variacion}
          // En triage subir es EMPEORAR: la flecha hacia arriba va en rosa.
          sentido="menos_es_mejor"
          href={linkTriage('ROJO')}
          linkLabel="Ver deportistas"
          ariaLabel="Ver los deportistas activos en nivel Rojo"
        />
      </div>
      <div className="min-w-0 lg:col-span-3">
        <TriageDistribucion datos={datos} />
      </div>
    </div>
  );
}
