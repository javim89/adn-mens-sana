import { getResumenPlantel } from '@/lib/queries/dashboard';
import { ESTADO_LABELS } from '@/lib/utils/enum-labels';
import type { EstadoDeportista } from '@/lib/generated/prisma/enums';
import EstadoVacio, { CardSeccion } from './EstadoVacio';
import KpiCard from './KpiCard';
import BarraApilada from './BarraApilada';
import MiniCardsNivel from './MiniCardsNivel';
import { linkEstado } from '../_lib/links';

/** El orden de lectura útil: primero los que están en actividad. */
const ORDEN: EstadoDeportista[] = ['ACTIVO', 'LESIONADO', 'SUSPENDIDO', 'INACTIVO'];

/**
 * Plantel por estado. Cada estado linkea a su `filter[estado]=`, así que el número y
 * el listado coinciden exactamente.
 *
 * Los colores son la versión saturada de la misma familia que `ESTADO_BADGE`
 * (`lib/utils/enum-labels.ts`, el que usa `DeportistasTable`): verde, ámbar, rojo y
 * gris. Un segmento de barra necesita más saturación que una píldora `-100`, pero el
 * tono tiene que ser reconociblemente el mismo estado en las dos pantallas.
 */
const ESTILO: Record<EstadoDeportista, { barra: string; tinte: string }> = {
  ACTIVO: { barra: 'bg-green-500', tinte: 'bg-green-50' },
  LESIONADO: { barra: 'bg-amber-400', tinte: 'bg-amber-50' },
  SUSPENDIDO: { barra: 'bg-red-500', tinte: 'bg-red-50' },
  INACTIVO: { barra: 'bg-gray-400', tinte: 'bg-gray-100' },
};
export default async function SeccionPlantel() {
  const datos = await getResumenPlantel();

  if (datos.total === 0) {
    return (
      // Sin `titulo`: el bloque ya dice "Plantel".
      <CardSeccion modulo="plantel">
        <EstadoVacio
          titulo="Todavía no hay deportistas cargados"
          detalle="Cuando se carguen fichas, acá se ve el plantel por estado."
        />
      </CardSeccion>
    );
  }

  return (
    /**
     * El total es dinámico y por eso es el número de la card y no parte del encabezado
     * del bloque (que se pinta antes de que la query resuelva). No lleva link propio:
     * cada estado linkea a su filtro, y "todos" no es un filtro del listado.
     */
    <KpiCard modulo="plantel" label="Deportistas en el plantel" valor={datos.total}>
      <BarraApilada
        total={datos.total}
        segmentos={ORDEN.map((estado) => ({
          clave: estado,
          label: ESTADO_LABELS[estado],
          cantidad: datos.porEstado[estado],
          clase: ESTILO[estado].barra,
          claseTexto: estado === 'ACTIVO' ? 'text-green-950' : 'text-[#1C1C1C]',
        }))}
        etiquetaMayor={(s, pct) => `${pct}% ${s.label.toLowerCase()}s`}
      />
      <div className="mt-4">
        <MiniCardsNivel
          columnas={2}
          total={datos.total}
          items={ORDEN.map((estado) => ({
            clave: estado,
            label: ESTADO_LABELS[estado],
            cantidad: datos.porEstado[estado],
            href: linkEstado(estado),
            ariaLabel: `Ver los deportistas con estado ${ESTADO_LABELS[estado]} (${datos.porEstado[estado]})`,
            punto: ESTILO[estado].barra,
            tinte: ESTILO[estado].tinte,
          }))}
        />
      </div>
    </KpiCard>
  );
}
