import Link from 'next/link';
import { Anillo } from '@/app/components/ui/anillo';
import { Avatar } from '@/app/components/ui/avatar';
import { Rotulo } from '@/app/components/ui/panel';
import type { ResumenPresentismo } from '@/lib/queries/dashboard';
import KpiCard from '../../dashboard/_components/KpiCard';
import BarrasCategoria from '../../dashboard/_components/BarrasCategoria';
import EstadoVacio, { CardSeccion } from '../../dashboard/_components/EstadoVacio';
import { ACENTOS } from '../../dashboard/_lib/acentos';
import { calcularVariacion } from '../../dashboard/_lib/variacion';

const DIAS_CORTOS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

function diaDeClave(clave: string): string {
  return DIAS_CORTOS[new Date(`${clave}T00:00:00.000Z`).getUTCDay()];
}

function iniciales(d: { nombre: string; apellido: string }): string {
  return `${d.nombre.charAt(0)}${d.apellido.charAt(0)}`;
}

/**
 * El presentismo de la semana en curso, con los mismos filtros de disciplina y
 * categoría que la lista. Todo sale de un solo `getResumenPresentismo`.
 */
export default function EstadisticasSemana({ datos }: { datos: ResumenPresentismo }) {
  const { actual, previo, porDia, porCategoria, ausentismoReiterado } = datos;
  const sinRegistros = actual.porcentaje === null;
  const hayAusentismo = ausentismoReiterado.length > 0;

  return (
    <section aria-labelledby="presentismo-semana" className="flex flex-col gap-3">
      <Rotulo como="h2" id="presentismo-semana">
        Esta semana
      </Rotulo>
      <div className="grid items-stretch gap-4 md:grid-cols-2 xl:grid-cols-3">
        <KpiCard
          modulo="presentismo"
          label="Presentismo semanal"
          valor={sinRegistros ? '—' : `${actual.porcentaje}%`}
          variacion={
            actual.porcentaje === null
              ? undefined
              : calcularVariacion(actual.porcentaje, previo.porcentaje)
          }
          sentido="mas_es_mejor"
          detalle={
            sinRegistros
              ? 'Sin asistencias registradas esta semana.'
              : `${actual.asistencias} de ${actual.registros} registros.`
          }
        >
          {!sinRegistros && (
            <div className="flex items-center gap-3">
              <Anillo
                valor={actual.porcentaje ?? 0}
                label="Presentismo semanal"
                claseFondo="stroke-teal-100"
                claseTrazo="stroke-teal-600"
              />
              <p className="text-xs text-muted-foreground">
                Cuenta como presente quien no estuvo ausente (incluye llegadas tarde y retiros
                anticipados).
              </p>
            </div>
          )}
        </KpiCard>

        <CardSeccion titulo="Por día" descripcion="En % de asistencia." modulo="presentismo">
          <div className="mt-4">
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
        </CardSeccion>

        <div className="min-w-0 md:col-span-2 xl:col-span-1">
          <CardSeccion
            titulo="Por categoría"
            descripcion="En % de asistencia."
            modulo="presentismo"
          >
            <div className="mt-4">
              {porCategoria.length === 0 ? (
                <EstadoVacio titulo="Sin registros por categoría esta semana" />
              ) : (
                <BarrasCategoria
                  categorias={porCategoria.map((c) => ({
                    clave: c.categoriaId,
                    label: c.categoria,
                    valor: c.porcentaje,
                  }))}
                  barraFuerte={ACENTOS.presentismo.barraFuerte}
                  barraSuave={ACENTOS.presentismo.barraSuave}
                  formatear={(v) => `${v}%`}
                />
              )}
            </div>
          </CardSeccion>
        </div>

        <div
          className={`min-w-0 rounded-2xl border p-4 md:col-span-2 md:p-5 xl:col-span-3 ${
            hayAusentismo ? 'border-amber-200 bg-amber-50' : 'border-border bg-background'
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3
              className={`text-xs font-semibold uppercase tracking-wide ${
                hayAusentismo ? 'text-amber-900' : 'text-muted-foreground'
              }`}
            >
              Dos o más ausencias esta semana
            </h3>
            {hayAusentismo && (
              <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-amber-900">
                Revisar
              </span>
            )}
          </div>
          {hayAusentismo ? (
            <ul className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {ausentismoReiterado.map((d) => (
                <li key={d.id} className="min-w-0">
                  <Link
                    href={`/deportistas/${d.id}`}
                    aria-label={`Ver la ficha de ${d.nombre} ${d.apellido} (${d.ausencias} ausencias)`}
                    className="flex min-w-0 items-center gap-3 rounded-lg bg-white p-2 ring-1 ring-amber-100 hover:ring-amber-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-900"
                  >
                    <Avatar
                      alt={`${d.nombre} ${d.apellido}`}
                      iniciales={iniciales(d)}
                      className="size-8 text-xs"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-foreground">
                        {d.apellido}, {d.nombre}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {d.categoria ?? 'Sin categoría'}
                      </span>
                    </span>
                    <span className="shrink-0 font-mono text-sm font-semibold tabular-nums text-amber-800">
                      {d.ausencias}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">
              {actual.registros === 0
                ? 'Todavía no hay asistencias registradas en la semana.'
                : 'Nadie acumula dos ausencias esta semana.'}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
