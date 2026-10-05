import { getResumenViandas } from '@/lib/queries/dashboard';
import { TIPO_COMIDA_LABELS, LUGAR_RETIRO_LABELS } from '@/lib/utils/enum-labels';
import { COMIDAS } from '@/lib/utils/viandas';
import type { LugarRetiro } from '@/lib/generated/prisma/enums';
import type { RangoSemana } from '@/lib/utils/fecha';
import KpiCard from './KpiCard';
import EstadoVacio, { CardSeccion } from './EstadoVacio';
import BarrasCategoria from './BarrasCategoria';
import { rangoSemana } from '../_lib/formato';
import { ACENTOS, ALERTA_AMBAR } from '../_lib/acentos';

/**
 * Viandas de la semana: entregas y entregas fuera de ficha.
 *
 * **Scoping**: el admin ve todos los lugares; el `responsable_viandas` ve **solo su
 * lugar**, que es el único que opera, así el número coincide con lo que él hace. Si no
 * tiene lugar asignado, muestra el mismo mensaje que `/viandas` y **no consulta la
 * base** — números globales serían peor que no mostrar nada.
 */
export default async function SeccionViandas({
  semana,
  isAdmin,
  lugar,
}: {
  semana: RangoSemana;
  isAdmin: boolean;
  lugar: LugarRetiro | null;
}) {
  // El guard va ANTES del await: un responsable sin lugar no dispara la query.
  if (!isAdmin && !lugar) {
    return (
      <div className="grid grid-cols-1 gap-5">
        <CardSeccion modulo="viandas">
          <EstadoVacio
            titulo="No tenés un lugar de retiro asignado"
            detalle="Pedile al administrador que te asigne Bosquesito, Sede o Estancia Chica para poder registrar y ver las entregas."
          />
        </CardSeccion>
      </div>
    );
  }

  const datos = await getResumenViandas({
    rango: { desdeDb: semana.desdeDb, finExclusivoDb: semana.finExclusivoDb },
    lugar: isAdmin ? null : lugar,
  });

  const alcance = isAdmin
    ? 'Todos los lugares de retiro.'
    : `Solo ${LUGAR_RETIRO_LABELS[lugar!]}.`;

  const hayFueraDeFicha = datos.totalFueraDeFicha > 0;

  return (
    // El nombre de la región lo pone el `<BloqueDashboard>` de `page.tsx`.
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <KpiCard
        modulo="viandas"
        label="Viandas entregadas esta semana"
        valor={datos.totalEntregas}
        detalle={
          datos.totalEntregas === 0
            ? `Sin entregas registradas ${rangoSemana(semana.desdeClave, semana.hastaClave)}. ${alcance}`
            : alcance
        }
        href="/viandas"
        linkLabel="Ir a viandas"
        ariaLabel="Ir al módulo de viandas"
      >
        {/* Sin entregas no hay desglose que mostrar: el detalle ya lo dice. */}
        {datos.totalEntregas > 0 && (
          <BarrasCategoria
            categorias={COMIDAS.map((c) => ({
              clave: c,
              label: TIPO_COMIDA_LABELS[c],
              valor: datos.porComida[c].entregas,
            }))}
            barraFuerte={ACENTOS.viandas.barraFuerte}
            barraSuave={ACENTOS.viandas.barraSuave}
          />
        )}
      </KpiCard>
      {/**
       * La card se tiñe y pide "REVISAR" solo cuando hay algo que revisar. En 0 queda
       * blanca con el borde ámbar: el número sigue a la vista, pero sin alarma.
       */}
      <KpiCard
        variante={hayFueraDeFicha ? 'alerta-ambar' : 'default'}
        bordeSuperior={hayFueraDeFicha ? undefined : ALERTA_AMBAR.bordeSuperior}
        badge={hayFueraDeFicha ? 'REVISAR' : undefined}
        label="Entregas fuera de ficha"
        valor={datos.totalFueraDeFicha}
        /**
         * El copy es la mitad de la card. `/viandas` deja entregar cualquier comida a
         * cualquiera A PROPÓSITO, porque la ficha puede estar incompleta y el empleado
         * que entrega hoy no puede quedar trabado por un dato que falta cargar. Esto
         * NO es una lista de errores: es una señal de supervisión.
         */
        detalle="Almuerzos o cenas que la ficha no prevé, y meriendas a categorías que solo reciben desayuno. No son errores: la ficha puede estar incompleta. Es una señal para revisar."
        href="/viandas"
        linkLabel="Ir a viandas"
        ariaLabel="Ir al módulo de viandas para revisar las entregas"
      />
    </div>
  );
}
