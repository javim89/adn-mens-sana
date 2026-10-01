/**
 * Dashboard — el resumen de la semana, por rol.
 *
 * ============================================================================
 * LA REGLA ESTRUCTURAL DE ESTE ARCHIVO: **ninguna query se invoca desde acá.**
 * ============================================================================
 *
 * Cada query vive DENTRO del componente de su sección, y la page solo decide qué
 * secciones montar. Eso hace que el gating por rol sea estructural y no una
 * convención: si no monto la sección, su query no se ejecuta. No hace falta ningún
 * `if` alrededor de un `await`, y el bug de "traer los datos y esconderlos" se vuelve
 * imposible. Si agregás una sección, el `await` va en la sección, no acá.
 *
 * Además, una sección por `<Suspense>` (y no un `Promise.all` monolítico) tiene dos
 * beneficios: la página no espera a la query más lenta para pintar el primer número,
 * y un error en una query degrada una sola card en vez de toda la pantalla.
 *
 * **Por qué `/dashboard` no lleva guard de ruta:** es el destino de todos los
 * `redirect('/dashboard')` de los otros módulos y el fallback de
 * `getNavItemsForRole`. Un guard acá dejaría a algún rol sin ninguna pantalla
 * alcanzable. El gating va por rol *dentro* de la page, vía `cardsVisibles`.
 *
 * Sin `unstable_cache` ni `revalidate`: cachear la card y no el listado al que linkea
 * rompería la propiedad de que los dos números coincidan.
 *
 * ============================================================================
 * LA ORGANIZACIÓN VISUAL: UN BLOQUE POR MÓDULO
 * ============================================================================
 * Cada sección va envuelta en un `<BloqueDashboard>` que la rotula ("Triage",
 * "Viandas", …). El rótulo está ACÁ y no adentro de la sección para que los 7
 * encabezados se pinten en el primer paint, mientras cada query todavía resuelve
 * abajo de su `<Suspense>`.
 *
 * La jerarquía de espacios es la que hace legible la página: `gap-10` entre bloques,
 * `gap-5` entre las cards de un mismo bloque. El doble de distancia significa "esto ya
 * es otro tema".
 */
import { Suspense } from 'react';
import { auth, currentUser } from '@clerk/nextjs/server';
import { LayoutDashboard } from 'lucide-react';
import {
  fechaDbDesdeClave,
  hoyEnArgentina,
  semanaActual,
  semanaAnterior,
} from '@/lib/utils/fecha';
import { esLugarRetiro } from '@/lib/utils/viandas';
import { cardsVisibles } from './_lib/visibilidad';
import { rangoSemana } from './_lib/formato';
import {
  FilaSkeleton,
  MitadesSkeleton,
  PanelSkeleton,
  SeguimientosSkeleton,
} from './_components/Skeletons';
import BloqueDashboard from './_components/BloqueDashboard';
import SeccionTriage from './_components/SeccionTriage';
import SeccionViandas from './_components/SeccionViandas';
import SeccionTurnos from './_components/SeccionTurnos';
import SeccionPresentismo from './_components/SeccionPresentismo';
import SeccionSeguimientos from './_components/SeccionSeguimientos';
import SeccionPlantel from './_components/SeccionPlantel';
import SeccionEventos from './_components/SeccionEventos';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const { userId } = await auth();
  const user = await currentUser();
  const role = String(user?.publicMetadata?.role ?? '');
  const isAdmin = role === 'admin';

  const cards = cardsVisibles(role);

  const semana = semanaActual();
  const previa = semanaAnterior();
  const hoyDb = fechaDbDesdeClave(hoyEnArgentina());

  // El lugar del responsable de viandas sale de Clerk, igual que en `/viandas`.
  const metaLugar = (user?.publicMetadata as Record<string, unknown> | undefined)
    ?.lugarRetiro;
  const lugarResponsable = esLugarRetiro(metaLugar) ? metaLugar : null;

  return (
    <div className="p-4 md:p-8">
      <h1
        className="text-3xl font-bold text-[#121A61] mb-1"
        style={{ fontFamily: 'Oswald, sans-serif' }}
      >
        Dashboard
      </h1>
      <p className="text-[#6B7280] mb-6">
        Resumen de la semana {rangoSemana(semana.desdeClave, semana.hastaClave)}.
      </p>

      {cards.size === 0 ? (
        /**
         * Rol desconocido o ausente: `getNavItemsForRole` cae al fallback de solo
         * `/dashboard`, así que no hay ninguna card. NO puede quedar como una página
         * en blanco, que se leería como un bug: el mensaje dice qué pasa y qué hacer.
         */
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-6 py-12 text-center">
          <LayoutDashboard size={28} className="mx-auto text-[#6B7280] mb-3" />
          <p className="text-[#1C1C1C] font-medium mb-1">
            Tu usuario todavía no tiene un rol asignado
          </p>
          <p className="text-sm text-[#6B7280]">
            Pedile al administrador del club que te asigne uno para ver el resumen que
            te corresponde.
          </p>
        </div>
      ) : (
        /**
         * `gap-10` entre bloques contra el `gap-5` de adentro de cada uno: la
         * jerarquía de la página está en esa diferencia, no en una línea divisoria.
         */
        <div className="flex flex-col gap-10">
          {cards.has('triage') && (
            <BloqueDashboard
              id="triage"
              titulo="Triage"
              descripcion="Riesgo del plantel activo, según el último cálculo semanal."
              modulo="triage"
            >
              <Suspense fallback={<FilaSkeleton />}>
                <SeccionTriage semana={semana} />
              </Suspense>
            </BloqueDashboard>
          )}

          {cards.has('viandas') && (
            <BloqueDashboard
              id="viandas"
              titulo="Viandas"
              descripcion="Entregas de comida registradas esta semana."
              modulo="viandas"
            >
              <Suspense fallback={<MitadesSkeleton />}>
                <SeccionViandas
                  semana={semana}
                  isAdmin={isAdmin}
                  lugar={lugarResponsable}
                />
              </Suspense>
            </BloqueDashboard>
          )}

          {cards.has('turnos') && (
            <BloqueDashboard
              id="turnos"
              titulo="Turnos"
              descripcion="La agenda de atención de esta semana."
              modulo="turnos"
            >
              <Suspense fallback={<FilaSkeleton />}>
                {/* Scoping: el admin ve todos los turnos; el resto solo los propios. */}
                <SeccionTurnos
                  semana={semana}
                  hoyDb={hoyDb}
                  profesionalId={isAdmin ? undefined : (userId ?? undefined)}
                />
              </Suspense>
            </BloqueDashboard>
          )}

          {cards.has('presentismo') && (
            <BloqueDashboard
              id="presentismo"
              titulo="Presentismo"
              descripcion="Asistencia a los entrenamientos de esta semana."
              modulo="presentismo"
            >
              <Suspense fallback={<FilaSkeleton />}>
                <SeccionPresentismo
                  semana={semana}
                  semanaPrevia={previa}
                  entrenadorId={isAdmin ? undefined : (userId ?? undefined)}
                />
              </Suspense>
            </BloqueDashboard>
          )}

          {cards.has('seguimientos') && (
            <BloqueDashboard
              id="seguimientos"
              titulo="Seguimientos"
              /**
               * Dice "backlog abierto" porque los dos números NO son de la semana,
               * a diferencia de los bloques de arriba. Si el rótulo del módulo no lo
               * aclarara, el encabezado de la página ("Resumen de la semana…") los
               * haría leer como semanales.
               */
              descripcion="Backlog abierto y citas agendadas. No es de la semana."
              modulo="seguimientos"
            >
              <Suspense fallback={<SeguimientosSkeleton />}>
                {/* Seguimientos es GLOBAL: no lleva profesionalId. */}
                <SeccionSeguimientos hoyDb={hoyDb} />
              </Suspense>
            </BloqueDashboard>
          )}

          {/**
           * Plantel y calendario van uno al lado del otro: son los dos bloques de
           * contexto (ni KPI ni semana), y cada uno es una sola card angosta. Lado a lado
           * recién en `xl`: en `lg` el sidebar deja ~350px por columna y los nombres de
           * los equipos se truncaban. El `gap-y-10` es el mismo que separa los bloques
           * de arriba, así que cuando se apilan la rítmica no cambia.
           */}
          {(cards.has('plantel') || cards.has('eventos')) && (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-x-5 gap-y-10">
              {cards.has('plantel') && (
                <BloqueDashboard
                  id="plantel"
                  titulo="Plantel"
                  descripcion="Los deportistas por estado."
                  modulo="plantel"
                >
                  <Suspense fallback={<PanelSkeleton filas={5} conTitulo={false} />}>
                    <SeccionPlantel />
                  </Suspense>
                </BloqueDashboard>
              )}
              {cards.has('eventos') && (
                <BloqueDashboard
                  id="eventos"
                  titulo="Calendario"
                  descripcion="Los partidos que vienen."
                  modulo="eventos"
                >
                  <Suspense fallback={<PanelSkeleton filas={6} conTitulo={false} />}>
                    <SeccionEventos hoyDb={hoyDb} />
                  </Suspense>
                </BloqueDashboard>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
