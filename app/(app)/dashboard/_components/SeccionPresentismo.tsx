import Link from 'next/link';
import { getResumenPresentismo } from '@/lib/queries/dashboard';
import { ESTADO_ASISTENCIA_LABELS } from '@/lib/utils/asistencia';
import type { EstadoAsistencia } from '@/lib/types/presentismo';
import type { RangoSemana } from '@/lib/utils/fecha';
import KpiCard from './KpiCard';
import EstadoVacio, { CardSeccion } from './EstadoVacio';
import BarraApilada from './BarraApilada';
import BarrasCategoria from './BarrasCategoria';
import { calcularVariacion } from '../_lib/variacion';
import { rangoSemana } from '../_lib/formato';
import { ACENTOS, OSWALD } from '../_lib/acentos';

/** Del que más suma al que resta: los tres primeros cuentan como asistencia. */
const ESTADOS: { estado: EstadoAsistencia; clase: string }[] = [
  { estado: 'PRESENTE', clase: 'bg-teal-600' },
  { estado: 'LLEGO_TARDE', clase: 'bg-teal-300' },
  { estado: 'SE_RETIRO_ANTES', clase: 'bg-cyan-200' },
  { estado: 'AUSENTE', clase: 'bg-rose-400' },
];

const DIAS_CORTOS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

/** `'Lun'` de una clave `YYYY-MM-DD`, leída en UTC como toda columna de fecha. */
function diaDeClave(clave: string): string {
  return DIAS_CORTOS[new Date(`${clave}T00:00:00.000Z`).getUTCDay()];
}

/**
 * Presentismo de la semana + los deportistas con 2 o más ausencias.
 *
 * La lista de ausentismo reiterado no es decorativa: las ausencias son un factor del
 * scoring de triage, así que esta card conecta con la de arriba. Cada nombre linkea a
 * `/deportistas/[id]`, que sí existe.
 *
 * **Scoping**: no-admin scopeado por `entrenadorId`, igual que `getEntrenamientos`.
 */
export default async function SeccionPresentismo({
  semana,
  semanaPrevia,
  entrenadorId,
}: {
  semana: RangoSemana;
  semanaPrevia: RangoSemana;
  /** `undefined` = admin (todos los entrenadores). */
  entrenadorId?: string;
}) {
  const datos = await getResumenPresentismo({
    rango: { desdeDb: semana.desdeDb, finExclusivoDb: semana.finExclusivoDb },
    rangoPrevio: {
      desdeDb: semanaPrevia.desdeDb,
      finExclusivoDb: semanaPrevia.finExclusivoDb,
    },
    entrenadorId,
  });

  const { actual, previo, ausentismoReiterado, porDia } = datos;

  // Sin registros no hay porcentaje: `null`, nunca un 0% mentiroso. Con la base sin
  // seed de presentismo éste es el estado real, así que tiene que leerse bien.
  const variacion =
    actual.porcentaje === null
      ? undefined
      : calcularVariacion(actual.porcentaje, previo.porcentaje);

  const hayAusentismo = ausentismoReiterado.length > 0;

  return (
    // El nombre de la región lo pone el `<BloqueDashboard>` de `page.tsx`.
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
      <div className="min-w-0 lg:col-span-2">
        <KpiCard
          modulo="presentismo"
          label="Presentismo de esta semana"
          valor={actual.porcentaje === null ? '—' : `${actual.porcentaje}%`}
          detalle={
            actual.porcentaje === null
              ? `Sin asistencias registradas ${rangoSemana(semana.desdeClave, semana.hastaClave)}.`
              : // La definición va a la vista, no solo al docblock: es la única forma de
                // que el número sea interpretable sin leer el código.
                `${actual.asistencias} de ${actual.registros} registros. Cuenta como presente quien no estuvo ausente (incluye llegadas tarde y retiros anticipados).`
          }
          variacion={variacion}
          // En presentismo subir es MEJOR: al revés que en triage.
          sentido="mas_es_mejor"
          href="/presentismo"
          linkLabel="Ver presentismo"
          ariaLabel="Ver el módulo de presentismo"
        >
          {/* Sin registros no hay nada que desglosar: el detalle ya lo dice. */}
          {actual.registros > 0 && (
            <div className="flex flex-col gap-5">
              <div>
                <BarraApilada
                  grosor="fina"
                  total={actual.registros}
                  segmentos={ESTADOS.map(({ estado, clase }) => ({
                    clave: estado,
                    label: ESTADO_ASISTENCIA_LABELS[estado],
                    cantidad: actual.porEstado[estado],
                    clase,
                  }))}
                />
                <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
                  {ESTADOS.map(({ estado, clase }) => (
                    <li key={estado} className="flex items-center gap-1.5 text-xs text-[#5B6478]">
                      <span className={`h-2 w-2 shrink-0 rounded-full ${clase}`} aria-hidden />
                      {ESTADO_ASISTENCIA_LABELS[estado]}
                      <span className="font-semibold tabular-nums text-[#1C1C1C]">
                        {actual.porEstado[estado]}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
              {/* Un día sin entrenamientos es `null`: barra vacía y "—", no un 0%. */}
              <BarrasCategoria
                categorias={porDia.map((d) => ({
                  clave: d.clave,
                  label: diaDeClave(d.clave),
                  valor: d.porcentaje,
                }))}
                barraFuerte={ACENTOS.presentismo.barraFuerte}
                barraSuave={ACENTOS.presentismo.barraSuave}
                formatear={(v) => `${v}%`}
              />
            </div>
          )}
        </KpiCard>
      </div>

      <div className="min-w-0 lg:col-span-3">
        <CardSeccion
          titulo="Ausencias reiteradas"
          descripcion="Deportistas con 2 o más ausencias esta semana. Es uno de los factores del triage."
          variante={hayAusentismo ? 'alerta-rosa' : 'default'}
          modulo={hayAusentismo ? undefined : 'presentismo'}
          badge={hayAusentismo ? 'REVISAR' : undefined}
        >
          {!hayAusentismo ? (
            <EstadoVacio
              titulo="Nadie acumula 2 ausencias esta semana"
              detalle={
                actual.registros === 0
                  ? 'Todavía no hay asistencias registradas en la semana.'
                  : 'Buena señal: no hay ausentismo reiterado.'
              }
            />
          ) : (
            <ul className="grid grid-cols-1 @lg:grid-cols-2 gap-3">
              {ausentismoReiterado.map((d) => (
                <li key={d.id} className="min-w-0">
                  <Link
                    href={`/deportistas/${d.id}`}
                    aria-label={`Ver la ficha de ${d.nombre} ${d.apellido} (${d.ausencias} ausencias)`}
                    className="group flex h-full items-center justify-between gap-3 rounded-xl bg-white px-4 py-3 shadow-sm ring-1 ring-rose-100 hover:ring-rose-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-900"
                  >
                    <span className="min-w-0 truncate text-sm font-semibold text-[#1C1C1C] group-hover:underline">
                      {d.apellido}, {d.nombre}
                    </span>
                    <span className="flex shrink-0 items-baseline gap-1">
                      <span
                        className="text-3xl font-semibold leading-none tabular-nums text-rose-700"
                        style={OSWALD}
                      >
                        {d.ausencias}
                      </span>
                      <span className="text-xs text-rose-900">ausencias</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardSeccion>
      </div>
    </div>
  );
}
