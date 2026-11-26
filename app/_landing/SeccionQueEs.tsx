import { AUDIENCIA_BIOTEAM, PREGUNTA_QUE_ES_BIOTEAM, QUE_ES_BIOTEAM } from '@/lib/seo/producto';

/**
 * "¿Qué es BioTeam?": la respuesta corta y autocontenida, justo después del hero (la
 * primera respuesta que encuentra quien llega, persona o buscador con IA).
 *
 * Va sobre el mismo papel del hero (`#F5F2EA`, el fondo del `<main>`), separada por un
 * filete neto, y antes de la franja navy de clubes. **Sin `Reveal`**: el texto se lee
 * siempre, con o sin JS, sin depender de que entre al viewport. Server Component.
 */
export default function SeccionQueEs() {
  return (
    <section
      aria-labelledby="que-es-titulo"
      data-testid="seccion-que-es"
      className="px-4 py-16 sm:px-6 sm:py-20"
    >
      <div className="mx-auto grid w-full max-w-[1200px] grid-cols-1 gap-6 border-t border-[#121A61]/15 pt-10 lg:grid-cols-12 lg:gap-12 lg:pt-14">
        <div className="min-w-0 lg:col-span-4">
          <span aria-hidden className="block h-1 w-12 bg-[#121A61]" />
          <h2
            id="que-es-titulo"
            className="mt-5 font-[family-name:var(--font-oswald)] text-3xl font-bold uppercase leading-tight text-[#121A61] break-words sm:text-4xl"
          >
            {PREGUNTA_QUE_ES_BIOTEAM}
          </h2>
        </div>
        <div className="min-w-0 lg:col-span-8">
          <p className="max-w-3xl text-base leading-relaxed text-[#1C1C1C] sm:text-lg">{QUE_ES_BIOTEAM}</p>
          <div className="mt-8">
            <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-[#3346CC]">Para quién es</h3>
            <ul className="mt-3 flex flex-wrap gap-2">
              {AUDIENCIA_BIOTEAM.map((rol) => (
                <li
                  key={rol}
                  className="rounded-full border border-[#121A61]/15 bg-white px-3 py-1 text-sm font-medium text-[#4B5563]"
                >
                  {rol}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
