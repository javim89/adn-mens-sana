import Link from 'next/link';
import { ArrowRight, Check, ChevronDown, ChevronRight } from 'lucide-react';
import { ICON_MAP } from '@/lib/nav-icons';
import {
  PAGINAS_FUNCIONALIDAD,
  RUTA_FUNCIONALIDADES,
  rutaFuncionalidad,
  type PaginaFuncionalidad,
} from '@/app/_landing/funcionalidades/catalogo';
import { CtaContacto, CtaPrincipal } from '../Ctas';
import FiguraPantalla from './FiguraPantalla';
import LayoutPublico from './LayoutPublico';

const EYEBROW = 'text-xs font-semibold uppercase tracking-[0.2em] text-[#3346CC]';
const H2 =
  'font-[family-name:var(--font-oswald)] text-3xl font-bold uppercase leading-tight text-[#121A61] break-words sm:text-4xl';
const LINK =
  'rounded-sm font-semibold text-[#3346CC] underline-offset-4 hover:text-[#121A61] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3346CC]';

/**
 * La página de una funcionalidad. Un solo `<h1>` (`pagina.h1`) y `<h2>` por sección, con
 * `<h3>` solo debajo de un `<h2>`. El JSON-LD y la metadata los pone la ruta.
 *
 * Ritmo de fondos (colores planos, como la home): hero en papel → "En pocas palabras"
 * (callout blanco, todavía en el papel) → beneficios en tinte
 * azul (`#ECEFF9`) → "Cómo funciona" en franja navy (el motivo de la banda horizontal) →
 * bloques en gris claro (`#EFEEEB`), con las pantallas como ventanas → relacionadas en
 * blanco → preguntas en tinte → el cierre del layout vuelve al papel.
 */
export default function PaginaFuncionalidadVista({
  pagina,
  conSesion,
}: {
  pagina: PaginaFuncionalidad;
  conSesion: boolean;
}) {
  const relacionadas = PAGINAS_FUNCIONALIDAD.filter((p) => p.slug !== pagina.slug);

  return (
    <LayoutPublico conSesion={conSesion}>
      {/* Hero */}
      <section aria-labelledby="funcionalidad-h1" className="px-4 pt-6 pb-16 sm:px-6 sm:pt-8 lg:pb-24">
        <div className="mx-auto w-full max-w-[1200px]">
          <nav aria-label="Ruta" className="text-sm text-[#4B5563]">
            <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
              <li className="flex items-center gap-1.5">
                <Link href="/" className={LINK}>
                  Inicio
                </Link>
                <ChevronRight className="size-3.5 shrink-0" aria-hidden />
              </li>
              <li className="flex items-center gap-1.5">
                <Link href={RUTA_FUNCIONALIDADES} className={LINK}>
                  Funcionalidades
                </Link>
                <ChevronRight className="size-3.5 shrink-0" aria-hidden />
              </li>
              <li>
                <span aria-current="page" className="font-medium text-[#1C1C1C]">
                  {pagina.nombre}
                </span>
              </li>
            </ol>
          </nav>

          <div className="mt-10 max-w-3xl sm:mt-12">
            <p className={EYEBROW}>{pagina.eyebrow}</p>
            <h1
              id="funcionalidad-h1"
              className="mt-3 font-[family-name:var(--font-oswald)] text-4xl font-bold uppercase leading-[1.05] text-[#121A61] break-words sm:text-5xl lg:text-6xl"
            >
              {pagina.h1}
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-[#4B5563] sm:text-lg">{pagina.bajada}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <CtaPrincipal conSesion={conSesion} />
              <CtaContacto />
            </div>
          </div>

          <FiguraPantalla clave={pagina.pantallaHero} className="mt-12 lg:mt-16" />
        </div>
      </section>

      {/* En pocas palabras: la respuesta corta y citable, en el HTML del servidor (sin JS). */}
      <section
        aria-labelledby="resumen-titulo"
        data-testid="resumen-funcionalidad"
        className="px-4 pb-16 sm:px-6 lg:pb-24"
      >
        <div className="mx-auto w-full max-w-[1200px]">
          <div className="max-w-3xl rounded-2xl border border-[#121A61]/10 border-l-4 border-l-[#121A61] bg-white p-6 sm:p-8">
            <h2 id="resumen-titulo" className={EYEBROW}>
              En pocas palabras
            </h2>
            <p className="mt-3 text-base leading-relaxed text-[#1C1C1C] sm:text-lg">{pagina.resumenRespuesta}</p>
          </div>
        </div>
      </section>

      {/* Beneficios */}
      <section aria-labelledby="beneficios-titulo" className="bg-[#ECEFF9] px-4 py-16 sm:px-6 sm:py-24">
        <div className="mx-auto w-full max-w-[1200px]">
          <p className={EYEBROW}>Beneficios</p>
          <h2 id="beneficios-titulo" className={`mt-3 max-w-2xl ${H2}`}>
            Qué gana tu club
          </h2>
          <ul className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-3">
            {pagina.beneficios.map((b) => (
              <li key={b.titulo} className="min-w-0 rounded-2xl border border-[#121A61]/10 bg-white p-6">
                <h3 className="font-[family-name:var(--font-oswald)] text-xl font-semibold uppercase tracking-wide text-[#121A61]">
                  {b.titulo}
                </h3>
                <ul className="mt-4 space-y-2.5">
                  {b.items.map((item) => (
                    <li key={item} className="flex gap-2.5 text-sm leading-relaxed text-[#1C1C1C]">
                      <Check className="mt-0.5 size-4 shrink-0 text-[#3346CC]" aria-hidden />
                      <span className="min-w-0">{item}</span>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Cómo funciona */}
      <section aria-labelledby="como-funciona-titulo" className="bg-[#121A61] px-4 py-16 text-white sm:px-6 sm:py-24">
        <div className="mx-auto w-full max-w-[1200px]">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/70">Paso a paso</p>
          <h2
            id="como-funciona-titulo"
            className="mt-3 font-[family-name:var(--font-oswald)] text-3xl font-bold uppercase leading-tight break-words sm:text-4xl"
          >
            Cómo funciona
          </h2>
          <ol className="mt-10 grid grid-cols-1 gap-8 md:grid-cols-3 md:gap-6">
            {pagina.pasos.map((paso, i) => (
              <li key={paso.titulo} className="min-w-0 border-t border-white/20 pt-6">
                <span
                  aria-hidden
                  className="font-[family-name:var(--font-oswald)] text-4xl font-bold tabular-nums text-[#C9A84C]"
                >
                  {String(i + 1).padStart(2, '0')}
                </span>
                <h3 className="mt-3 font-[family-name:var(--font-oswald)] text-xl font-semibold uppercase tracking-wide">
                  {paso.titulo}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-white/80">{paso.texto}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Bloques: texto + pantalla, alternados en lg */}
      <div className="bg-[#EFEEEB] px-4 py-16 sm:px-6 sm:py-24">
        <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-16 lg:gap-24">
          {pagina.bloques.map((bloque, i) => {
            const id = `bloque-${i + 1}-titulo`;
            return (
              <section
                key={bloque.titulo}
                aria-labelledby={id}
                className="grid grid-cols-1 items-center gap-8 lg:grid-cols-12 lg:gap-12"
              >
                <div className={`min-w-0 lg:col-span-5 ${i % 2 === 1 ? 'lg:order-last' : ''}`}>
                  <h2 id={id} className={H2}>
                    {bloque.titulo}
                  </h2>
                  <p className="mt-4 text-base leading-relaxed text-[#4B5563] sm:text-lg">{bloque.texto}</p>
                </div>
                <FiguraPantalla clave={bloque.pantalla} className="lg:col-span-7" />
              </section>
            );
          })}
        </div>
      </div>

      {/* Relacionadas */}
      <section aria-labelledby="relacionadas-titulo" className="bg-white px-4 py-16 sm:px-6 sm:py-24">
        <div className="mx-auto w-full max-w-[1200px]">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h2 id="relacionadas-titulo" className={H2}>
              Otras funcionalidades
            </h2>
            <Link href={RUTA_FUNCIONALIDADES} className={`group inline-flex shrink-0 items-center gap-1.5 text-base ${LINK}`}>
              Ver todas las funcionalidades
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" aria-hidden />
            </Link>
          </div>
          <ul className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {relacionadas.map((p) => {
              const Icono = ICON_MAP[p.icono];
              return (
                <li key={p.slug} className="min-w-0">
                  <Link
                    href={rutaFuncionalidad(p.slug)}
                    className="group flex h-full items-center gap-3 rounded-xl border border-[#121A61]/10 bg-white p-4 transition-colors hover:border-[#121A61]/35 hover:bg-[#ECEFF9]/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3346CC]"
                  >
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#121A61] text-white">
                      <Icono className="size-5" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1 font-semibold text-[#121A61]">{p.nombre}</span>
                    <ChevronRight
                      className="size-4 shrink-0 text-[#3346CC] transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
                      aria-hidden
                    />
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      {/* Preguntas frecuentes: <details> nativo, sin JS. */}
      <section aria-labelledby="faq-titulo" className="bg-[#ECEFF9] px-4 py-16 sm:px-6 sm:py-24">
        <div className="mx-auto w-full max-w-3xl">
          <p className={EYEBROW}>Preguntas frecuentes</p>
          <h2 id="faq-titulo" className={`mt-3 ${H2}`}>
            Lo que nos suelen preguntar
          </h2>
          <div className="mt-10 divide-y divide-[#121A61]/10 rounded-2xl border border-[#121A61]/10 bg-white">
            {pagina.faqs.map((faq) => (
              <details key={faq.pregunta} className="group">
                <summary className="flex cursor-pointer list-none items-start justify-between gap-4 rounded-2xl px-5 py-4 text-base font-semibold text-[#121A61] transition-colors hover:bg-[#F5F2EA]/60 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#3346CC] sm:px-6 [&::-webkit-details-marker]:hidden">
                  <span className="min-w-0">{faq.pregunta}</span>
                  <ChevronDown
                    className="mt-0.5 size-5 shrink-0 text-[#3346CC] transition-transform group-open:rotate-180 motion-reduce:transition-none"
                    aria-hidden
                  />
                </summary>
                <p className="px-5 pb-5 text-sm leading-relaxed text-[#4B5563] sm:px-6 sm:text-base">{faq.respuesta}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </LayoutPublico>
  );
}
