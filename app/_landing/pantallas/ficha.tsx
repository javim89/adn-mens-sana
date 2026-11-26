import { ArrowLeft, Pencil } from 'lucide-react';
import { ESTADO_BADGE, ESTADO_LABELS, NIVEL_TRIAGE_BADGE, NIVEL_TRIAGE_LABELS } from '@/lib/utils/enum-labels';
import { Avatar } from '@/app/components/ui/avatar';
import { FICHA_DETALLE_DEMO, TRAYECTORIA_DEMO } from '../datos-demo';
import { BADGE, BotonDemo, PanelDemo, Pantalla, RotuloDemo } from './comun';

/** El encabezado de la ficha (foto, nombre, categoría, estado y triage) y las pestañas. */
function EncabezadoFicha({ activa }: { activa: string }) {
  const f = FICHA_DETALLE_DEMO;
  const indice = f.pestanas.indexOf(activa);
  const inicio = Math.min(Math.max(indice - 1, 0), f.pestanas.length - 3);
  return (
    <>
      <p className="flex items-center gap-1 text-xs text-[#6B7280]">
        <ArrowLeft className="size-3.5" aria-hidden />
        Deportistas
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-3 @md:gap-4">
        <Avatar alt={f.nombre} iniciales={f.iniciales} className="size-12 text-base @md:size-16 @md:text-xl" />
        <div className="min-w-0 flex-1">
          <p className="font-[family-name:var(--font-oswald)] text-lg font-bold text-[#121A61] @md:text-2xl">{f.nombre}</p>
          <p className="text-xs text-[#6B7280] @md:text-sm">
            {f.disciplina} · {f.categoria} · {f.posicion} · {f.edad}
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <span className={`${BADGE} ${ESTADO_BADGE[f.estado]}`}>{ESTADO_LABELS[f.estado]}</span>
            <span className={`${BADGE} ${NIVEL_TRIAGE_BADGE[f.triage]}`}>Triage {NIVEL_TRIAGE_LABELS[f.triage]}</span>
          </div>
        </div>
        <span className="hidden @lg:contents">
          <BotonDemo variante="secundario">
            <Pencil className="size-3.5" aria-hidden />
            Editar
          </BotonDemo>
        </span>
      </div>

      {/* Pestañas: en angosto quedan las tres alrededor de la activa (sin scroll); desde
          `@lg` entran todas. */}
      <div className="mt-4 flex gap-1 border-b border-gray-200">
        {f.pestanas.map((p, i) => (
          <span
            key={p}
            className={`shrink-0 border-b-2 px-2.5 pb-2 text-sm font-medium whitespace-nowrap @md:px-3 ${i >= inicio && i < inicio + 3 ? '' : 'hidden @lg:inline'} ${p === activa ? 'border-[#121A61] text-[#121A61]' : 'border-transparent text-[#6B7280]'}`}
          >
            {p}
          </span>
        ))}
      </div>
    </>
  );
}

/** La ficha con la pestaña Salud abierta. */
export function PantallaFichaPestanas() {
  return (
    <Pantalla clave="ficha-pestanas" activo="/deportistas">
      <EncabezadoFicha activa="Salud" />
      <div className="mt-4 grid gap-4 @3xl:grid-cols-[minmax(0,1fr)_240px]">
        <PanelDemo className="p-4">
          <RotuloDemo>Datos de salud</RotuloDemo>
          <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-3 @sm:grid-cols-2">
            {FICHA_DETALLE_DEMO.salud.map((d) => (
              <div key={d.label} className="min-w-0">
                <dt className="text-xs text-[#6B7280]">{d.label}</dt>
                <dd className="text-sm font-medium text-[#1C1C1C]">{d.valor}</dd>
              </div>
            ))}
          </dl>
        </PanelDemo>
        <div className="hidden min-w-0 flex-col gap-3 @3xl:flex">
          <div className="rounded-xl border border-orange-200 bg-orange-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-orange-800">Nivel de triage</p>
            <p className="mt-1 font-[family-name:var(--font-oswald)] text-2xl font-semibold text-orange-800">Naranja</p>
            <p className="mt-1 text-xs text-orange-900">Evaluación psicológica de prioridad alta y sin citación en las últimas 3 fechas.</p>
          </div>
          <div className="rounded-xl border border-gray-100 bg-[#F9FAFB] p-4">
            <p className="text-xs text-[#6B7280]">Seguimientos abiertos</p>
            <p className="font-mono text-2xl font-semibold tabular-nums text-[#121A61]">3</p>
          </div>
        </div>
      </div>
    </Pantalla>
  );
}

/** La pestaña Trayectoria: divisiones con fechas, clubes anteriores e hitos. */
export function PantallaFichaTrayectoria() {
  const t = TRAYECTORIA_DEMO;
  return (
    <Pantalla clave="ficha-trayectoria" activo="/deportistas">
      <EncabezadoFicha activa="Trayectoria" />
      <div className="mt-4 grid gap-4 @2xl:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)]">
        <PanelDemo className="p-4">
          <div className="flex items-center justify-between gap-2">
            <RotuloDemo>Divisiones</RotuloDemo>
            <span className="text-xs font-semibold text-[#3346CC]">Gestionar</span>
          </div>
          <ol className="mt-3">
            {t.periodos.map((p, i) => (
              <li key={p.id} className="relative flex gap-3 pb-4 last:pb-0">
                {i < t.periodos.length - 1 && <span className="absolute top-4 left-[5px] h-full w-px bg-gray-200" />}
                <span
                  className={`relative mt-1 size-3 shrink-0 rounded-full ring-4 ring-white ${p.hasta ? 'bg-gray-300' : 'bg-[#3346CC]'}`}
                />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[#1C1C1C]">{p.division}</p>
                  <p className="text-xs text-[#6B7280]">
                    {p.desde} – {p.hasta ?? 'actualidad'}
                  </p>
                </div>
                {!p.hasta && (
                  <span className={`${BADGE} ml-auto self-start bg-[#3346CC] text-white`}>Actual</span>
                )}
              </li>
            ))}
          </ol>
        </PanelDemo>

        <div className="grid min-w-0 content-start gap-4">
          <PanelDemo className="p-4">
            <RotuloDemo>Clubes anteriores</RotuloDemo>
            <ul className="mt-2 space-y-1.5">
              {t.clubesAnteriores.map((c) => (
                <li key={c.id} className="flex flex-wrap items-baseline justify-between gap-x-2 text-sm">
                  <span className="min-w-0 text-[#1C1C1C]">{c.nombre}</span>
                  <span className="text-xs text-[#6B7280]">{c.periodo}</span>
                </li>
              ))}
            </ul>
          </PanelDemo>
          <PanelDemo className="hidden p-4 @md:block">
            <RotuloDemo>Historia deportiva</RotuloDemo>
            <ul className="mt-2 space-y-2.5">
              {t.hitos.map((h) => (
                <li key={h.id} className="flex gap-3">
                  <span className="shrink-0 font-mono text-xs tabular-nums text-[#6B7280]">{h.fecha}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[#1C1C1C]">{h.titulo}</p>
                    <p className="text-xs text-[#6B7280]">{h.detalle}</p>
                  </div>
                </li>
              ))}
            </ul>
          </PanelDemo>
        </div>
      </div>
    </Pantalla>
  );
}
