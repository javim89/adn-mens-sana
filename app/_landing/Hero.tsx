import { Sparkles } from 'lucide-react';
import { CtaContacto, CtaPrincipal } from './Ctas';
import HeroCards from './HeroCards';

/**
 * Titular centrado, pill de anuncio, bajada y CTAs, con las cards de producto
 * flotando alrededor. La entrada es escalonada (`landing-entrada` + `--retraso`).
 */
export default function Hero({ conSesion }: { conSesion: boolean }) {
  return (
    <section
      data-morph-hero
      aria-labelledby="hero-titulo"
      className="relative mx-auto w-full max-w-[1200px] px-4 pb-16 pt-10 sm:px-6 sm:pt-16 xl:min-h-[940px] xl:pb-0"
    >
      <div data-morph-texto className="relative z-10 mx-auto flex max-w-3xl flex-col items-center text-center xl:max-w-[640px]">
        <a
          href="#insights"
          data-morph-pill
          className="landing-entrada inline-flex max-w-full items-center gap-2 rounded-full border border-gray-200 bg-white/80 py-1 pl-1 pr-3 text-sm text-[#1C1C1C] shadow-sm backdrop-blur transition-colors hover:border-[#121A61]/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3346CC]"
        >
          <span className="inline-flex items-center gap-1 rounded-full bg-[#121A61] px-2.5 py-0.5 text-xs font-semibold text-white">
            <Sparkles className="size-3 text-[#C9A84C]" aria-hidden />
            Nuevo
          </span>
          <span className="truncate">Tableros de Insights</span>
          <span aria-hidden className="text-[#6B7280]">→</span>
        </a>

        <h1
          id="hero-titulo"
          className="landing-entrada mt-7 font-[family-name:var(--font-oswald)] text-5xl font-bold uppercase leading-[0.95] tracking-tight text-balance text-[#121A61] [--retraso:120ms] sm:text-7xl xl:text-[5.25rem]"
        >
          Todo tu club, en una sola pantalla
        </h1>

        <p className="landing-entrada mt-6 max-w-xl text-base leading-relaxed text-[#6B7280] [--retraso:240ms] sm:text-lg">
          La ficha de cada deportista, sus seguimientos médicos, psicológicos y sociales, turnos,
          presentismo, viandas y triage. Para que tu cuerpo técnico y tus profesionales decidan
          con datos.
        </p>

        <div className="landing-entrada mt-8 flex w-full flex-col gap-3 [--retraso:360ms] sm:w-auto sm:flex-row">
          <CtaPrincipal conSesion={conSesion} className="w-full sm:w-auto" />
          <CtaContacto className="w-full sm:w-auto" />
        </div>
      </div>

      <HeroCards />
    </section>
  );
}
