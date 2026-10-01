import Link from 'next/link';
import { getResumenSeguimientos } from '@/lib/queries/dashboard';
import type { PrioridadSeguimiento } from '@/lib/generated/prisma/enums';
import KpiCard from './KpiCard';
import EstadoVacio, { CardSeccion } from './EstadoVacio';
import BarraApilada from './BarraApilada';
import MiniCardsNivel from './MiniCardsNivel';
import TileFecha from './TileFecha';
import { linkPrioridad } from '../_lib/links';
import { ACENTOS } from '../_lib/acentos';
import {
  claveDesdeFechaDb,
  diaCortoDb,
  diaYMesCortoDb,
  fechaDb,
  listaDeportistas,
} from '../_lib/formato';

/** De más a menos urgente. Rosa/naranja para lo que quema, violeta (el módulo) para el resto. */
const PRIORIDADES: {
  prioridad: PrioridadSeguimiento;
  label: string;
  barra: string;
  texto: string;
  tinte: string;
}[] = [
  {
    prioridad: 'URGENTE',
    label: 'Urgente',
    barra: 'bg-rose-600',
    texto: 'text-white',
    tinte: 'bg-rose-50',
  },
  {
    prioridad: 'ALTA',
    label: 'Alta',
    barra: 'bg-orange-500',
    // Blanco sobre orange-500 es 2.8:1: no pasa AA para la etiqueta "NN% alta".
    texto: 'text-orange-950',
    tinte: 'bg-orange-50',
  },
  {
    prioridad: 'MEDIA',
    label: 'Media',
    barra: 'bg-violet-400',
    texto: 'text-violet-950',
    tinte: 'bg-violet-50',
  },
  {
    prioridad: 'BAJA',
    label: 'Baja',
    barra: 'bg-violet-200',
    texto: 'text-violet-950',
    tinte: 'bg-violet-50',
  },
];

/**
 * Seguimientos que requieren atención.
 *
 * **Cada prioridad tiene su número y su link**, y no hay sumas linkeadas: el filtro
 * `?prioridad=` del listado acepta un solo valor, así que un total combinado no
 * tendría a dónde linkear sin mostrar un conjunto distinto del número. El total del
 * backlog aparece solo como denominador, sin link.
 *
 * Los conteos son **backlog abierto**, no de la semana, porque eso es exactamente lo
 * que muestra el link. El rótulo lo dice.
 *
 * **Scoping: ninguno.** Todos los roles ven todos los seguimientos.
 */
export default async function SeccionSeguimientos({ hoyDb }: { hoyDb: Date }) {
  const datos = await getResumenSeguimientos({ desdeHoyDb: hoyDb });
  const hoyClave = claveDesdeFechaDb(hoyDb);

  const hayUrgentes = datos.urgente > 0;

  return (
    // El nombre de la región lo pone el `<BloqueDashboard>` de `page.tsx`.
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        <div className="min-w-0 lg:col-span-2">
          <KpiCard
            variante={hayUrgentes ? 'alerta-rosa' : 'default'}
            modulo="seguimientos"
            badge={hayUrgentes ? 'URGENTE' : undefined}
            label="Seguimientos urgentes"
            valor={datos.urgente}
            detalle="Backlog abierto, no solo de esta semana."
            href={linkPrioridad('URGENTE')}
            linkLabel="Ver urgentes"
            ariaLabel="Ver los seguimientos con prioridad Urgente"
          />
        </div>

        <div className="min-w-0 lg:col-span-3">
          <CardSeccion
            titulo="Backlog por prioridad"
            descripcion={
              datos.total > 0 ? `Sobre ${datos.total} seguimientos del backlog abierto.` : undefined
            }
          >
            {datos.total === 0 ? (
              <EstadoVacio
                titulo="No hay seguimientos abiertos"
                detalle="Cuando se registre un seguimiento, acá se ve cómo se reparte por prioridad."
              />
            ) : (
              <>
                <BarraApilada
                  total={datos.total}
                  segmentos={PRIORIDADES.map((p) => ({
                    clave: p.prioridad,
                    label: p.label,
                    cantidad: datos.porPrioridad[p.prioridad],
                    clase: p.barra,
                    claseTexto: p.texto,
                  }))}
                  etiquetaMayor={(s, pct) => `${pct}% ${s.label.toLowerCase()}`}
                />
                <div className="mt-4">
                  <MiniCardsNivel
                    columnas={4}
                    total={datos.total}
                    items={PRIORIDADES.map((p) => ({
                      clave: p.prioridad,
                      label: p.label,
                      cantidad: datos.porPrioridad[p.prioridad],
                      href: linkPrioridad(p.prioridad),
                      ariaLabel: `Ver los seguimientos con prioridad ${p.label} (${datos.porPrioridad[p.prioridad]})`,
                      punto: p.barra,
                      tinte: p.tinte,
                    }))}
                  />
                </div>
              </>
            )}
          </CardSeccion>
        </div>
      </div>

      <CardSeccion
        titulo="Próximas citas"
        modulo="seguimientos"
        /**
         * EL RÓTULO ES PARTE DE LA CORRECCIÓN. `Seguimiento` no tiene flag de
         * "cumplida", así que una `proximaCita` pasada no se puede cerrar nunca:
         * decir "citas perdidas" afirmaría que no se cumplieron, y no hay dato para
         * eso. "Cuya fecha ya pasó" es lo único que la base sabe.
         */
        descripcion="Citas de los próximos 7 días y citas cuya fecha ya pasó (últimos 90 días). El sistema no registra si se cumplieron."
      >
        {datos.proximasCitas.length === 0 ? (
          <EstadoVacio
            titulo="No hay citas próximas ni vencidas"
            detalle="Las próximas citas aparecen acá cuando un seguimiento agenda una."
          />
        ) : (
          <ul className="grid grid-cols-1 @lg:grid-cols-2 @3xl:grid-cols-3 gap-3">
            {datos.proximasCitas.map((c) => {
              // Comparación lexicográfica de claves ISO: correcta, y sin construir
              // un Date por fila.
              const vencida = claveDesdeFechaDb(c.proximaCita) < hoyClave;
              return (
                <li key={c.id} className="min-w-0">
                  <Link
                    href={`/seguimientos/${c.id}`}
                    aria-label={`Ver el seguimiento ${c.titulo}, cita del ${fechaDb(c.proximaCita)}${vencida ? ', ya pasó' : ''}`}
                    className="group flex h-full min-w-0 items-center gap-3 rounded-xl bg-gray-50 p-2.5 hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3346CC]"
                  >
                    <TileFecha
                      arriba={diaCortoDb(c.proximaCita)}
                      abajo={diaYMesCortoDb(c.proximaCita)}
                      fondo={vencida ? 'bg-amber-100' : ACENTOS.seguimientos.tileFecha}
                      texto={vencida ? 'text-amber-900' : 'text-white'}
                    />
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate text-sm font-semibold text-[#1C1C1C] group-hover:underline">
                        {c.titulo}
                      </span>
                      <span className="truncate text-xs text-[#5B6478]">
                        {listaDeportistas(c.deportistas)}
                      </span>
                      {vencida && (
                        <span className="mt-1 self-start rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900">
                          ya pasó
                        </span>
                      )}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </CardSeccion>
    </div>
  );
}
