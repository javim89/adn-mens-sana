import { ALL_NAV_ITEMS } from '@/lib/roles';
import { ICON_MAP } from '@/lib/nav-icons';
import { DESCRIPCION_MODULO, HREF_MODULOS } from './datos-demo';
import Reveal from './Reveal';

/** Los módulos del panel, con el mismo ícono y nombre que en el sidebar. */
const MODULOS = HREF_MODULOS.map((href) => ALL_NAV_ITEMS.find((i) => i.href === href)).filter(
  (i) => i !== undefined,
);

export default function SeccionModulos() {
  return (
    <section aria-labelledby="modulos-titulo" className="bg-white py-20 sm:py-28">
      <div className="mx-auto w-full max-w-[1200px] px-4 sm:px-6">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#3346CC]">Módulos</p>
          <h2
            id="modulos-titulo"
            className="mt-3 font-[family-name:var(--font-oswald)] text-4xl font-bold uppercase leading-tight text-[#121A61] sm:text-5xl"
          >
            Todo el seguimiento del deportista en un lugar
          </h2>
          <p className="mt-4 text-base text-[#6B7280]">
            Cada área carga lo suyo y todos ven la misma ficha. Cada rol accede solo a lo que le
            corresponde.
          </p>
        </Reveal>

        <ul className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {MODULOS.map((m, i) => {
            const Icono = ICON_MAP[m.icon];
            return (
              <li key={m.href} className="min-w-0">
                <Reveal retrasoMs={(i % 4) * 80} className="h-full">
                  <div className="group h-full rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
                    <span className="flex size-11 items-center justify-center rounded-xl bg-[#121A61] text-white">
                      <Icono className="size-5" aria-hidden />
                    </span>
                    <h3 className="mt-5 font-[family-name:var(--font-oswald)] text-xl font-semibold text-[#121A61]">
                      {m.label}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-[#6B7280]">
                      {DESCRIPCION_MODULO[m.href]}
                    </p>
                  </div>
                </Reveal>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
