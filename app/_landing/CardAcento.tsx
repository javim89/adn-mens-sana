import Reveal from './Reveal';

/** La única card de acento de la landing: navy con la banda y el badge dorados. */
export default function CardAcento() {
  return (
    <section aria-labelledby="acento-titulo" className="bg-white px-4 py-20 sm:px-6 sm:py-28">
      <Reveal className="mx-auto w-full max-w-[1200px]">
        <div className="relative overflow-hidden rounded-3xl bg-[#121A61] px-6 py-14 text-center text-white sm:px-12 sm:py-20">
          {/* Banda horizontal sutil y filete dorado arriba. */}
          <div aria-hidden className="absolute inset-x-0 top-1/2 h-16 -translate-y-1/2 bg-white/[0.04]" />
          <div aria-hidden className="absolute inset-x-0 top-0 h-1.5 bg-[#C9A84C]" />
          <div className="relative">
            <span className="inline-block rounded-full bg-[#C9A84C] px-3 py-1 text-xs font-semibold uppercase tracking-wider text-[#1C1C1C]">
              Una sola ficha
            </span>
            <h2
              id="acento-titulo"
              className="mx-auto mt-6 max-w-3xl font-[family-name:var(--font-oswald)] text-4xl font-bold uppercase leading-tight sm:text-6xl"
            >
              Cada área mira al mismo deportista
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-white/75 sm:text-lg">
              Médicos, kinesiólogos, nutricionistas, psicólogos, cardiólogos, área social y cuerpo
              técnico trabajan sobre la misma ficha. Cada rol ve solo lo que le corresponde.
            </p>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
