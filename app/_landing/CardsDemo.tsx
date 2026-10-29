import { NIVEL_TRIAGE_LABELS } from '@/lib/utils/enum-labels';
import KpiCard from '../(app)/dashboard/_components/KpiCard';
import BarraApilada from '../(app)/dashboard/_components/BarraApilada';
import MiniCardsNivel from '../(app)/dashboard/_components/MiniCardsNivel';
import BarrasCategoria from '../(app)/dashboard/_components/BarrasCategoria';
import TileFecha from '../(app)/dashboard/_components/TileFecha';
import { CardSeccion } from '../(app)/dashboard/_components/EstadoVacio';
import { NIVEL_ESTILO, NIVELES } from '../(app)/dashboard/_components/TriageDistribucion';
import { ACENTOS } from '../(app)/dashboard/_lib/acentos';
import {
  PLANTEL_DEMO,
  PRESENTISMO_DEMO,
  PRESENTISMO_POR_DIA,
  SEGUIMIENTOS_DEMO,
  TRIAGE_DEMO,
  TURNOS_DEMO,
  VIANDAS_POR_COMIDA,
} from './datos-demo';

/**
 * Las cards de producto de la landing: los componentes REALES del dashboard con los
 * datos fijos de `datos-demo.ts`.
 *
 * Son decorativas. Quien las monta las envuelve en un contenedor `aria-hidden` +
 * `inert`, así que los links internos de `MiniCardsNivel` van a `#`: no tiene sentido
 * que una página pública apunte (ni prefetchee) listados protegidos.
 *
 * `TriageDistribucion` no se usa entero porque sus mini-cards linkean a
 * `/deportistas?filter…`; se arma con sus mismas piezas (`BarraApilada` +
 * `MiniCardsNivel`) y su misma paleta (`NIVEL_ESTILO`).
 */

export function TriageDemo({ columnas = 5 }: { columnas?: 2 | 5 }) {
  const { actual, sinCalcular, totalActivos } = TRIAGE_DEMO;
  const segmentos = [
    ...NIVELES.map((nivel) => ({
      clave: nivel as string,
      label: NIVEL_TRIAGE_LABELS[nivel],
      cantidad: actual[nivel],
      clase: NIVEL_ESTILO[nivel].barra,
      claseTexto: NIVEL_ESTILO[nivel].texto,
      punto: NIVEL_ESTILO[nivel].barra,
      tinte: NIVEL_ESTILO[nivel].tinte,
    })),
    {
      clave: 'SIN_CALCULAR',
      label: 'Sin calcular',
      cantidad: sinCalcular,
      clase: 'bg-gray-300',
      claseTexto: 'text-[#1C1C1C]',
      punto: 'bg-gray-400',
      tinte: 'bg-gray-100',
    },
  ];
  // En la card angosta del hero entran 4 mini-cards en 2x2: "Sin calcular" queda en la barra.
  const items = columnas === 2 ? segmentos.slice(0, 4) : segmentos;

  return (
    <CardSeccion
      titulo="Distribución de triage"
      descripcion={`Sobre ${totalActivos} deportistas activos.`}
    >
      <div className="landing-crecer-x">
        <BarraApilada
          segmentos={segmentos}
          total={totalActivos}
          etiquetaMayor={(s, pct) => `${pct}% en ${s.label.toLowerCase()}`}
        />
      </div>
      <div className="mt-4">
        <MiniCardsNivel
          total={totalActivos}
          columnas={columnas}
          items={items.map((s) => ({
            clave: s.clave,
            label: s.label,
            cantidad: s.cantidad,
            href: '#',
            ariaLabel: `${s.label}: ${s.cantidad}`,
            punto: s.punto,
            tinte: s.tinte,
          }))}
        />
      </div>
    </CardSeccion>
  );
}

/** El anillo de progreso de la card de presentismo (la "stat card con ring" de la referencia). */
function Anillo({ porcentaje }: { porcentaje: number }) {
  const radio = 26;
  const circunferencia = 2 * Math.PI * radio;
  return (
    <svg viewBox="0 0 64 64" className="size-16 -rotate-90" aria-hidden>
      <circle cx="32" cy="32" r={radio} fill="none" strokeWidth="7" className="stroke-teal-100" />
      <circle
        cx="32"
        cy="32"
        r={radio}
        fill="none"
        strokeWidth="7"
        strokeLinecap="round"
        className="landing-anillo stroke-teal-600"
        style={
          {
            strokeDasharray: circunferencia,
            strokeDashoffset: circunferencia * (1 - porcentaje / 100),
            '--anillo-total': `${circunferencia}`,
          } as React.CSSProperties
        }
      />
    </svg>
  );
}

export function PresentismoKpiDemo() {
  return (
    <KpiCard
      modulo="presentismo"
      label="Presentismo semanal"
      valor={`${PRESENTISMO_DEMO.porcentaje}%`}
      variacion={PRESENTISMO_DEMO.variacion}
      sentido="mas_es_mejor"
      detalle={PRESENTISMO_DEMO.detalle}
    >
      <div className="flex items-center gap-3">
        <Anillo porcentaje={PRESENTISMO_DEMO.porcentaje} />
        <p className="text-xs text-[#5B6478]">
          <span className="font-semibold text-[#1C1C1C]">Objetivo 85%</span>
          <br />
          por categoría
        </p>
      </div>
    </KpiCard>
  );
}

export function PresentismoPorDiaDemo() {
  return (
    <CardSeccion titulo="Presentismo por día" descripcion="Esta semana, en % de asistencia." modulo="presentismo">
      <div className="landing-crecer-y mt-4">
        <BarrasCategoria
          categorias={PRESENTISMO_POR_DIA}
          barraFuerte={ACENTOS.presentismo.barraFuerte}
          barraSuave={ACENTOS.presentismo.barraSuave}
          formatear={(v) => `${v}%`}
        />
      </div>
    </CardSeccion>
  );
}

export function ViandasPorComidaDemo() {
  return (
    <CardSeccion titulo="Viandas entregadas" descripcion="Esta semana, por comida." modulo="viandas">
      <div className="landing-crecer-y mt-4">
        <BarrasCategoria
          categorias={VIANDAS_POR_COMIDA}
          barraFuerte={ACENTOS.viandas.barraFuerte}
          barraSuave={ACENTOS.viandas.barraSuave}
        />
      </div>
    </CardSeccion>
  );
}

export function TurnosDemo({ cantidad = TURNOS_DEMO.length }: { cantidad?: number }) {
  return (
    <CardSeccion titulo="Próximos turnos" descripcion="Los que vienen desde hoy, en orden." modulo="turnos">
      <ul className="mt-4 grid grid-cols-1 gap-3">
        {TURNOS_DEMO.slice(0, cantidad).map((t) => (
          <li key={t.id} className="flex min-w-0 items-center gap-3 rounded-xl bg-gray-50 p-2.5">
            <TileFecha arriba={t.dia} abajo={t.hora} fondo={ACENTOS.turnos.tileFecha} />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-[#1C1C1C]">{t.titulo}</p>
              <p className="truncate text-xs text-[#5B6478]">{t.detalle}</p>
            </div>
          </li>
        ))}
      </ul>
    </CardSeccion>
  );
}

export function SeguimientosKpiDemo() {
  return (
    <KpiCard
      variante="hero"
      label="Seguimientos abiertos"
      valor={SEGUIMIENTOS_DEMO.abiertos}
      variacion={SEGUIMIENTOS_DEMO.variacion}
      sentido="menos_es_mejor"
      detalle="Médicos, psicológicos y sociales, de todo el plantel."
    />
  );
}

/**
 * Plantel por estado, como `SeccionPlantel`. Los colores son los mismos (literales):
 * no se importan de ahí porque ese archivo trae la query del dashboard.
 */
const ESTADOS_PLANTEL = [
  { clave: 'ACTIVO', label: 'Activo', barra: 'bg-green-500', tinte: 'bg-green-50', texto: 'text-green-950' },
  { clave: 'LESIONADO', label: 'Lesionado', barra: 'bg-amber-400', tinte: 'bg-amber-50', texto: 'text-[#1C1C1C]' },
  { clave: 'SUSPENDIDO', label: 'Suspendido', barra: 'bg-red-500', tinte: 'bg-red-50', texto: 'text-[#1C1C1C]' },
  { clave: 'INACTIVO', label: 'Inactivo', barra: 'bg-gray-400', tinte: 'bg-gray-100', texto: 'text-[#1C1C1C]' },
] as const;

export function PlantelDemo() {
  const { total, porEstado } = PLANTEL_DEMO;
  return (
    <KpiCard modulo="plantel" label="Deportistas en el plantel" valor={total}>
      <div className="landing-crecer-x">
        <BarraApilada
          total={total}
          segmentos={ESTADOS_PLANTEL.map((e) => ({
            clave: e.clave,
            label: e.label,
            cantidad: porEstado[e.clave],
            clase: e.barra,
            claseTexto: e.texto,
          }))}
          etiquetaMayor={(s, pct) => `${pct}% ${s.label.toLowerCase()}s`}
        />
      </div>
      <div className="mt-4">
        <MiniCardsNivel
          columnas={2}
          total={total}
          items={ESTADOS_PLANTEL.map((e) => ({
            clave: e.clave,
            label: e.label,
            cantidad: porEstado[e.clave],
            href: '#',
            ariaLabel: `${e.label}: ${porEstado[e.clave]}`,
            punto: e.barra,
            tinte: e.tinte,
          }))}
        />
      </div>
    </KpiCard>
  );
}
