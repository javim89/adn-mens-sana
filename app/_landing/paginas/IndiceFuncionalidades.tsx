import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { ICON_MAP } from '@/lib/nav-icons';
import { PAGINAS_FUNCIONALIDAD, rutaFuncionalidad } from '@/app/_landing/funcionalidades/catalogo';
import { CtaContacto, CtaPrincipal } from '../Ctas';
import FiguraPantalla from './FiguraPantalla';
import LayoutPublico from './LayoutPublico';

/**
 * `/funcionalidades`: hero con la pantalla del tablero y una tarjeta por funcionalidad.
 *
 * Fondos: hero en papel (el del layout), la grilla en el tinte azul claro de la home
 * (`#ECEFF9`) con tarjetas blancas de borde neto. Grises de texto `#4B5563` (AA sobre los
 * dos fondos). Cada tarjeta es un solo `<Link>`: toda la superficie es clickeable y el
 * foco se ve en el borde.
 */
export default function IndiceFuncionalidades({ conSesion }: { conSesion: boolean }) {
  return (
    <LayoutPublico conSesion={conSesion}>
      <section aria-labelledby="funcionalidades-h1" className="px-4 pt-12 pb-16 sm:px-6 sm:pt-16 lg:pb-24">
        <div className="mx-auto w-full max-w-[1200px]">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#3346CC]">Funcionalidades</p>
            <h1
              id="funcionalidades-h1"
              className="mt-3 font-[family-name:var(--font-oswald)] text-4xl font-bold uppercase leading-[1.05] text-[#121A61] break-words sm:text-5xl lg:text-6xl"
            >
              Funcionalidades para gestionar tu club deportivo
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-[#4B5563] sm:text-lg">
              Fichas, seguimientos de salud, triage, turnos, asistencia, convocatorias, viandas,
              calendario y tableros de datos: cada área del club trabaja sobre la misma información,
              con la marca de tu club.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <CtaPrincipal conSesion={conSesion} />
              <CtaContacto />
            </div>
          </div>

          <FiguraPantalla clave="dashboard" className="mt-12 lg:mt-16" />
        </div>
      </section>

      <section aria-label="Todas las funcionalidades" className="bg-[#ECEFF9] px-4 py-16 sm:px-6 sm:py-24">
        <ul className="mx-auto grid w-full max-w-[1200px] grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PAGINAS_FUNCIONALIDAD.map((p) => {
            const Icono = ICON_MAP[p.icono];
            return (
              <li key={p.slug} className="min-w-0">
                <Link
                  href={rutaFuncionalidad(p.slug)}
                  className="group flex h-full flex-col rounded-2xl border border-[#121A61]/10 bg-white p-6 transition-[border-color,box-shadow,transform] hover:-translate-y-0.5 hover:border-[#121A61]/35 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3346CC] motion-reduce:transition-none motion-reduce:hover:translate-y-0"
                >
                  <span className="flex size-11 items-center justify-center rounded-xl bg-[#121A61] text-white">
                    <Icono className="size-5" aria-hidden />
                  </span>
                  <h2 className="mt-5 font-[family-name:var(--font-oswald)] text-xl font-semibold uppercase tracking-wide text-[#121A61]">
                    {p.nombre}
                  </h2>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-[#4B5563]">{p.resumen}</p>
                  <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-[#3346CC] group-hover:text-[#121A61] group-hover:underline">
                    Conocer más
                    <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" aria-hidden />
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>
    </LayoutPublico>
  );
}
