import { Check, ChevronDown, MapPin } from 'lucide-react';
import { Avatar } from '@/app/components/ui/avatar';
import { ViandasPorComidaDemo } from '../CardsDemo';
import { VIANDAS_PANEL_DEMO, type ComidaDemo, type ViandaDeportistaDemo } from '../datos-demo';
import { EncabezadoPantalla, FiltroDemo, PanelDemo, Pantalla } from './comun';

const COMIDAS: { comida: ComidaDemo; label: string; corto: string }[] = [
  { comida: 'DESAYUNO', label: 'Desayuno', corto: 'Des.' },
  { comida: 'ALMUERZO', label: 'Almuerzo', corto: 'Alm.' },
  { comida: 'MERIENDA', label: 'Merienda', corto: 'Mer.' },
  { comida: 'CENA', label: 'Cena', corto: 'Cena' },
];

/** La merienda no corre para la Reserva (depende de la categoría): queda fuera de la grilla. */
const COMIDAS_DEL_DIA = COMIDAS.filter((c) => c.comida !== 'MERIENDA');

/** Lo que la ficha prevé para cada comida (el desayuno lo reciben todos). */
function prevista(d: ViandaDeportistaDemo, comida: ComidaDemo): boolean {
  if (comida === 'ALMUERZO') return d.ficha !== 'Cena';
  if (comida === 'CENA') return d.ficha !== 'Almuerzo';
  return true;
}

/** El toggle de una comida, como `ComidaToggle`: verde con la hora si se retiró, punteado si no está en la ficha. */
function ToggleComida({ d, comida, label, corto }: { d: ViandaDeportistaDemo; comida: ComidaDemo; label: string; corto: string }) {
  const hora = d.entregas[comida];
  const enFicha = prevista(d, comida);
  const estilo = hora
    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
    : enFicha
      ? 'border-gray-200 bg-white text-[#6B7280]'
      : 'border-dashed border-gray-200 bg-[#F9FAFB] text-[#6B7280]';
  return (
    <span
      className={`flex min-w-0 flex-col items-center justify-center gap-0.5 rounded-lg border px-1.5 py-1.5 text-xs font-medium ${estilo}`}
    >
      <span className="flex items-center gap-1">
        {hora && <Check className="size-3 shrink-0" aria-hidden />}
        <span className="@lg:hidden">{corto}</span>
        <span className="hidden @lg:inline">{label}</span>
      </span>
      {hora && <span className="text-[11px] font-normal leading-tight text-emerald-700">{hora}</span>}
    </span>
  );
}

function FilaDeportista({ d, comidas, oculta = false }: { d: ViandaDeportistaDemo; comidas: typeof COMIDAS; oculta?: boolean }) {
  return (
    <li className={`${oculta ? 'hidden @2xl:flex' : 'flex'} flex-col gap-2 px-3 py-3 @2xl:flex-row @2xl:items-center @2xl:gap-4 @2xl:px-4`}>
      <div className="flex min-w-0 items-center gap-3 @2xl:w-56 @2xl:shrink-0">
        <Avatar alt={d.nombre} iniciales={d.iniciales} className="size-8 text-xs" />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-[#1C1C1C]">{d.nombre}</p>
          <p className="truncate text-xs text-[#6B7280]">Ficha: {d.ficha.toLowerCase()}</p>
        </div>
      </div>
      <div className={`grid min-w-0 flex-1 gap-2 ${comidas.length === 1 ? 'grid-cols-1 @2xl:max-w-40' : 'grid-cols-3'}`}>
        {comidas.map((c) => (
          <ToggleComida key={c.comida} d={d} {...c} />
        ))}
      </div>
    </li>
  );
}

function EncabezadoViandas() {
  const v = VIANDAS_PANEL_DEMO;
  return (
    <>
      <EncabezadoPantalla titulo="Viandas" bajada={`${v.fecha} · ${v.categoria}`} />
      <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-[#121A61]/5 px-2.5 py-1 text-xs font-medium text-[#121A61]">
        <MapPin className="size-3.5" aria-hidden />
        Lugar de retiro: {v.lugar}
      </p>
    </>
  );
}

/** El panel del día: contadores por comida (retiradas / esperadas) y el plantel con un toggle por comida. */
export function PantallaViandasPanel() {
  const v = VIANDAS_PANEL_DEMO;
  return (
    <Pantalla clave="viandas-panel" activo="/viandas">
      <EncabezadoViandas />

      <div className="mt-4 grid grid-cols-1 gap-2 @md:grid-cols-3">
        {v.contadores
          .filter((c) => c.esperadas > 0)
          .map((c) => (
            <div key={c.comida} className="min-w-0 rounded-lg border border-gray-100 bg-white px-3 py-2 shadow-sm">
              <p className="text-xs font-medium text-[#1C1C1C]">{c.label}</p>
              <p className="mt-0.5 text-xs">
                <span className="font-mono text-base font-semibold tabular-nums text-emerald-700">{c.retiradas}</span>
                <span className="text-[#6B7280]"> retiradas / {c.esperadas} esperadas</span>
              </p>
            </div>
          ))}
      </div>

      <PanelDemo className="mt-4">
        <ul className="divide-y divide-gray-100">
          {v.deportistas.map((d, i) => (
            <FilaDeportista key={d.id} d={d} comidas={COMIDAS_DEL_DIA} oculta={i >= 3} />
          ))}
        </ul>
      </PanelDemo>
    </Pantalla>
  );
}

/** El panel filtrado por almuerzo: solo quienes lo tienen en la ficha, y la card real de la semana al costado. */
export function PantallaViandasPorComida() {
  const v = VIANDAS_PANEL_DEMO;
  const conAlmuerzo = v.deportistas.filter((d) => prevista(d, 'ALMUERZO'));
  const almuerzo = COMIDAS.filter((c) => c.comida === 'ALMUERZO');
  return (
    <Pantalla clave="viandas-por-comida" activo="/viandas">
      <EncabezadoViandas />
      <div className="mt-3 flex flex-wrap gap-2">
        <FiltroDemo activo>
          Comida: almuerzo
          <ChevronDown className="size-3.5" aria-hidden />
        </FiltroDemo>
      </div>

      <div className="mt-4 grid items-start gap-4 @3xl:grid-cols-[minmax(0,1fr)_minmax(0,280px)]">
        <PanelDemo>
          <p className="border-b border-gray-100 px-3 py-2.5 text-xs text-[#6B7280] @2xl:px-4">
            <span className="font-semibold text-[#1C1C1C]">{conAlmuerzo.length} deportistas</span> reciben almuerzo según su ficha
          </p>
          <ul className="divide-y divide-gray-100">
            {conAlmuerzo.map((d) => (
              <FilaDeportista key={d.id} d={d} comidas={almuerzo} />
            ))}
          </ul>
        </PanelDemo>
        <div className="hidden min-w-0 @3xl:block">
          <ViandasPorComidaDemo />
        </div>
      </div>
    </Pantalla>
  );
}
