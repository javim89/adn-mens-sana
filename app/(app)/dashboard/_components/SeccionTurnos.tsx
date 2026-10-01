import { getResumenTurnos } from '@/lib/queries/dashboard';
import type { RangoSemana } from '@/lib/utils/fecha';
import KpiCard from './KpiCard';
import EstadoVacio, { CardSeccion } from './EstadoVacio';
import TileFecha from './TileFecha';
import LinkPie from './LinkPie';
import { diaCortoYFechaDb, listaDeportistas, rangoSemana } from '../_lib/formato';

/** 4 y no 5: los próximos van en una grilla 2x2, y un quinto quedaría huérfano. */
const LIMITE_PROXIMOS = 4;

/**
 * Turnos de la semana + los próximos, INLINE.
 *
 * **Por qué inline y no un deep link:** `/turnos` expone `?page&area&q` y **no** un
 * filtro por rango de fechas, así que un link a `/turnos` mostraría un conjunto
 * distinto del número de la card. La regla es que cada card o linkea a su filtro
 * exacto, o muestra las filas que contó. El footer dice "Ver todos los turnos" y no
 * "ver estos N", porque es a dónde va de verdad.
 *
 * **Scoping**: admin ve todos; no-admin solo los propios, igual que `/turnos`.
 */
export default async function SeccionTurnos({
  semana,
  hoyDb,
  profesionalId,
}: {
  semana: RangoSemana;
  hoyDb: Date;
  /** `undefined` = admin. Presente = solo los turnos de ese profesional. */
  profesionalId?: string;
}) {
  const datos = await getResumenTurnos({
    rango: { desdeDb: semana.desdeDb, finExclusivoDb: semana.finExclusivoDb },
    desdeHoyDb: hoyDb,
    profesionalId,
    limite: LIMITE_PROXIMOS,
  });

  const alcance = profesionalId ? 'Solo tus turnos.' : 'Todos los profesionales.';

  return (
    // El nombre de la región lo pone el `<BloqueDashboard>` de `page.tsx`.
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
      <div className="min-w-0 lg:col-span-2">
        <KpiCard
          modulo="turnos"
          label="Turnos de esta semana"
          valor={datos.totalSemana}
          detalle={`${rangoSemana(semana.desdeClave, semana.hastaClave)}. ${alcance}`}
          href="/turnos"
          linkLabel="Ver todos los turnos"
          ariaLabel="Ver el listado completo de turnos"
        />
      </div>

      <div className="min-w-0 lg:col-span-3">
        <CardSeccion
          titulo="Próximos turnos"
          descripcion="Los que vienen desde hoy, en orden."
        >
          {datos.proximos.length === 0 ? (
            <EstadoVacio
              titulo="No hay turnos próximos"
              detalle={
                profesionalId
                  ? 'No tenés turnos agendados de hoy en adelante.'
                  : 'No hay turnos agendados de hoy en adelante.'
              }
            />
          ) : (
            <>
              {/**
               * Los tiles NO son links, y es a propósito: `/turnos/[id]` **no existe**
               * (verificado: bajo `app/(app)/turnos/[id]/` solo hay `editar/`). Las
               * dos alternativas eran peores — linkear a `/turnos/[id]/editar` manda a
               * un formulario de edición a alguien que solo vino a mirar (y que puede
               * no ser el dueño del turno), y crear la ruta de detalle es otro módulo.
               * Mostrar los tiles sin link sigue cumpliendo la regla que importa: la
               * card muestra las filas concretas que contó.
               */}
              <ul className="grid grid-cols-1 @lg:grid-cols-2 gap-3">
                {datos.proximos.map((t) => (
                  <li
                    key={t.id}
                    className="flex min-w-0 items-center gap-3 rounded-xl bg-gray-50 p-2.5"
                  >
                    <TileFecha arriba={diaCortoYFechaDb(t.fecha)} abajo={t.hora} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[#1C1C1C]">
                        {t.titulo}
                      </p>
                      <p className="truncate text-xs text-[#5B6478]">
                        {listaDeportistas(t.deportistas)} · {t.lugar}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="mt-4">
                <LinkPie href="/turnos">Ver todos los turnos</LinkPie>
              </div>
            </>
          )}
        </CardSeccion>
      </div>
    </div>
  );
}
