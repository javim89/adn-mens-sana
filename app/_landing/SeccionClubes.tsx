import Image from 'next/image';
import { CLUBES } from './clubes';
import Reveal from './Reveal';

/** Franja de clubes clientes, entre el hero y los módulos. */
export default function SeccionClubes() {
  return (
    <section aria-labelledby="clubes-titulo" className="border-y border-gray-100 bg-white py-14 sm:py-16">
      <Reveal className="mx-auto w-full max-w-[1200px] px-4 text-center sm:px-6">
        <h2
          id="clubes-titulo"
          className="text-xs font-semibold uppercase tracking-[0.2em] text-[#6B7280]"
        >
          Clubes que confían en nosotros
        </h2>
        <ul className="mt-8 flex flex-wrap items-center justify-center gap-x-12 gap-y-8">
          {CLUBES.map((club) => (
            <li key={club.nombre} className="flex min-w-0 items-center gap-4">
              <Image
                src={club.escudo}
                alt={club.alt}
                width={64}
                height={64}
                className="size-16 shrink-0 rounded-full"
              />
              <span className="text-left font-[family-name:var(--font-oswald)] text-lg font-semibold uppercase leading-tight tracking-wide text-[#121A61] sm:text-xl">
                {club.nombre}
              </span>
            </li>
          ))}
        </ul>
      </Reveal>
    </section>
  );
}
