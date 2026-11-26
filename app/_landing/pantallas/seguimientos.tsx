import { Calculator, ChevronDown, Plus } from 'lucide-react';
import { PRIORIDAD_LABELS, PRIORIDAD_STYLES, TIPO_SEGUIMIENTO_META } from '@/lib/utils/seguimiento-tipo';
import type { TipoSeguimiento } from '@/lib/types/seguimientos';
import { Avatar } from '@/app/components/ui/avatar';
import { ANTROPOMETRIA_DEMO, SEGUIMIENTOS_DEMO, SEGUIMIENTOS_LISTA_DEMO } from '../datos-demo';
import { BADGE, BotonDemo, EncabezadoPantalla, FiltroDemo, PanelDemo, Pantalla, RotuloDemo } from './comun';

/** Los 42 abiertos por tipo (como el panel de la demo de la home). */
const POR_TIPO: { tipo: TipoSeguimiento; cantidad: number }[] = [
  { tipo: 'TRAUMATOLOGIA', cantidad: 14 },
  { tipo: 'HISTORIA_CLINICA', cantidad: 9 },
  { tipo: 'EVALUACION_PSICOLOGICA', cantidad: 8 },
  { tipo: 'EVALUACION_CARDIOLOGICA', cantidad: 5 },
  { tipo: 'ANTROPOMETRIA', cantidad: 4 },
  { tipo: 'GENERICO', cantidad: 2 },
];

/** Ancho de cada barra del desglose, relativo al tipo con más abiertos (clases literales). */
const ANCHO_BARRA: Record<TipoSeguimiento, string> = {
  TRAUMATOLOGIA: 'w-full',
  HISTORIA_CLINICA: 'w-[64%]',
  EVALUACION_PSICOLOGICA: 'w-[57%]',
  EVALUACION_CARDIOLOGICA: 'w-[36%]',
  ANTROPOMETRIA: 'w-[29%]',
  GENERICO: 'w-[14%]',
};

const COLUMNAS = '@2xl:grid-cols-[minmax(0,180px)_minmax(0,1fr)_56px_84px]';

/** El listado de seguimientos: cards apiladas en angosto, tabla desde `@2xl`; el desglose por tipo al costado en ancho. */
export function PantallaSeguimientosLista() {
  return (
    <Pantalla clave="seguimientos-lista" activo="/seguimientos">
      <EncabezadoPantalla
        titulo="Seguimientos"
        contador={`${SEGUIMIENTOS_DEMO.abiertos} abiertos`}
        accion="Nuevo seguimiento"
      />
      <div className="mt-3 flex flex-wrap gap-2">
        <FiltroDemo activo>
          Prioridad: Alta y urgente
          <ChevronDown className="size-3.5" aria-hidden />
        </FiltroDemo>
        <span className="hidden @md:contents">
          <FiltroDemo>
            Profesional
            <ChevronDown className="size-3.5" aria-hidden />
          </FiltroDemo>
        </span>
      </div>

      <div className="mt-4 grid gap-4 @4xl:grid-cols-[minmax(0,1fr)_240px]">
        <PanelDemo className="overflow-hidden">
          <div
            className={`hidden gap-x-3 border-b border-gray-100 bg-[#F3F4F6] px-4 py-2.5 text-xs uppercase text-[#6B7280] @2xl:grid ${COLUMNAS}`}
          >
            <span>Deportista</span>
            <span>Título</span>
            <span>Fecha</span>
            <span>Prioridad</span>
          </div>
          {SEGUIMIENTOS_LISTA_DEMO.map((s, i) => {
            const tipo = TIPO_SEGUIMIENTO_META[s.tipo];
            return (
              <div
                key={s.id}
                className={`${i >= 4 ? 'hidden @2xl:grid' : 'grid'} grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 border-b border-gray-50 px-3 py-3 last:border-0 @2xl:px-4 @2xl:py-2.5 ${COLUMNAS}`}
              >
                <div className="contents @2xl:flex @2xl:min-w-0 @2xl:items-center @2xl:gap-2">
                  <Avatar alt={s.deportista} iniciales={s.iniciales} className="size-8 text-xs" />
                  <span className="truncate text-sm font-medium text-[#1C1C1C]">{s.deportista}</span>
                </div>
                <span className="text-xs text-[#6B7280] @2xl:order-1">{s.fecha}</span>
                <div className="col-span-2 col-start-2 min-w-0 @2xl:col-span-1 @2xl:col-start-auto">
                  <p className="truncate text-xs text-[#6B7280] @2xl:text-sm @2xl:text-[#1C1C1C]">{s.titulo}</p>
                  <span className="hidden @2xl:mt-1 @2xl:block">
                    <span className={`${BADGE} ${tipo.badge}`}>{tipo.label}</span>
                  </span>
                </div>
                <div className="col-span-2 col-start-2 flex flex-wrap gap-1.5 @2xl:order-2 @2xl:col-span-1 @2xl:col-start-auto">
                  <span className={`${BADGE} ${PRIORIDAD_STYLES[s.prioridad]}`}>{PRIORIDAD_LABELS[s.prioridad]}</span>
                  <span className={`${BADGE} @2xl:hidden ${tipo.badge}`}>{tipo.label}</span>
                </div>
              </div>
            );
          })}
        </PanelDemo>

        <div className="hidden min-w-0 rounded-xl border border-gray-100 bg-[#F9FAFB] p-4 @4xl:block">
          <RotuloDemo>Abiertos por tipo</RotuloDemo>
          <ul className="mt-4 space-y-3">
            {POR_TIPO.map(({ tipo, cantidad }) => (
              <li key={tipo}>
                <div className="flex items-center justify-between gap-2 text-sm text-[#1C1C1C]">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className={`size-2 shrink-0 rounded-full ${TIPO_SEGUIMIENTO_META[tipo].dot}`} />
                    <span className="truncate">{TIPO_SEGUIMIENTO_META[tipo].label}</span>
                  </span>
                  <span className="font-mono font-semibold tabular-nums">{cantidad}</span>
                </div>
                <div className="mt-1.5 h-1.5 rounded-full bg-gray-200">
                  <div className={`h-full rounded-full ${ANCHO_BARRA[tipo]} ${TIPO_SEGUIMIENTO_META[tipo].dot}`} />
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Pantalla>
  );
}

/** Un campo de formulario de mentira. */
function CampoDemo({ label, valor, unidad }: { label: string; valor: string; unidad?: string }) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-medium text-[#1C1C1C]">{label}</p>
      <div className="mt-1 flex h-9 items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white px-3 text-sm text-[#1C1C1C]">
        <span className="truncate font-mono tabular-nums">{valor}</span>
        {unidad && <span className="shrink-0 text-xs text-[#6B7280]">{unidad}</span>}
      </div>
    </div>
  );
}

const TIPOS_FORMULARIO: TipoSeguimiento[] = [
  'HISTORIA_CLINICA',
  'TRAUMATOLOGIA',
  'EVALUACION_PSICOLOGICA',
  'EVALUACION_CARDIOLOGICA',
  'ANTROPOMETRIA',
  'GENERICO',
];

/** Nuevo seguimiento de antropometría: tipo elegido, medidas, pliegues y los calculados. */
export function PantallaSeguimientoFormulario() {
  const a = ANTROPOMETRIA_DEMO;
  return (
    <Pantalla clave="seguimiento-formulario" activo="/seguimientos">
      <EncabezadoPantalla titulo="Nuevo seguimiento" bajada="Elegí el tipo y completá la evaluación." />

      <RotuloDemo className="mt-4">Tipo de seguimiento</RotuloDemo>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {TIPOS_FORMULARIO.map((t, i) => {
          const meta = TIPO_SEGUIMIENTO_META[t];
          const activo = t === 'ANTROPOMETRIA';
          return (
            <span
              key={t}
              className={`${i < 3 && !activo ? 'hidden @md:inline-flex' : 'inline-flex'} h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-medium whitespace-nowrap ${activo ? 'border-[#121A61] bg-[#121A61] text-white' : 'border-gray-200 bg-white text-[#1C1C1C]'}`}
            >
              <span className={`size-2 rounded-full ${meta.dot}`} />
              {meta.label}
            </span>
          );
        })}
      </div>

      <PanelDemo className="mt-4 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <Avatar alt={a.deportista} iniciales={a.iniciales} className="size-8 text-xs" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-[#1C1C1C]">{a.deportista}</p>
            <p className="text-xs text-[#6B7280]">Evaluación del {a.fecha}</p>
          </div>
          <span className={`${BADGE} ${PRIORIDAD_STYLES.BAJA}`}>Prioridad {PRIORIDAD_LABELS.BAJA.toLowerCase()}</span>
        </div>

        <RotuloDemo className="mt-4">Medidas</RotuloDemo>
        <div className="mt-2 grid grid-cols-2 gap-3 @2xl:grid-cols-4">
          {a.medidas.map((m, i) => (
            <div key={m.label} className={i >= 2 ? 'hidden @md:block' : ''}>
              <CampoDemo label={m.label} valor={m.valor} unidad={m.unidad} />
            </div>
          ))}
        </div>

        <RotuloDemo className="mt-4">Pliegues (mm)</RotuloDemo>
        <div className="mt-2 grid grid-cols-2 gap-3 @2xl:grid-cols-4">
          {a.pliegues.map((p, i) => (
            <div key={p.label} className={i >= 2 ? 'hidden @md:block' : ''}>
              <CampoDemo label={p.label} valor={p.valor} unidad="mm" />
            </div>
          ))}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 rounded-lg bg-[#3346CC]/[0.06] p-3">
          <div className="min-w-0">
            <p className="flex items-center gap-1 text-xs text-[#3346CC]">
              <Calculator className="size-3.5" aria-hidden />
              IMC
            </p>
            <p className="font-mono text-xl font-semibold tabular-nums text-[#121A61]">{a.imc}</p>
          </div>
          <div className="min-w-0">
            <p className="flex items-center gap-1 text-xs text-[#3346CC]">
              <Calculator className="size-3.5" aria-hidden />
              Suma de pliegues
            </p>
            <p className="font-mono text-xl font-semibold tabular-nums text-[#121A61]">{a.sumatoriaPliegues} mm</p>
          </div>
        </div>
      </PanelDemo>

      <div className="mt-4 flex flex-wrap justify-end gap-2">
        <span className="hidden @md:contents">
          <BotonDemo variante="secundario">
            <Plus className="size-3.5" aria-hidden />
            Próxima cita
          </BotonDemo>
        </span>
        <BotonDemo>Guardar seguimiento</BotonDemo>
      </div>
    </Pantalla>
  );
}
