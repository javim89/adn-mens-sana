import Image from 'next/image';
import { CLUBES } from './clubes';
import Reveal from './Reveal';

/**
 * Franja de clubes clientes, entre el hero y los módulos. Va en navy, de contraste
 * con el papel del hero y el tinte claro de los módulos.
 *
 * El escudo (`/logo.png`) es un PNG opaco con fondo blanco: va dentro de una placa
 * blanca cuadrada (no recortado en círculo, que le cortaba los sables) para que se lea
 * entero sobre el navy.
 */
export default function SeccionClubes() {
  return (
    <section
      aria-labelledby="clubes-titulo"
      data-testid="seccion-clubes"
      className="bg-[#121A61] py-14 text-white sm:py-16"
    >
      <Reveal className="mx-auto w-full max-w-[1200px] px-4 text-center sm:px-6">
        <h2
          id="clubes-titulo"
          className="text-xs font-semibold uppercase tracking-[0.2em] text-[#C9A84C]"
        >
          Clubes que confían en nosotros
        </h2>
        <ul className="mt-8 flex flex-wrap items-center justify-center gap-x-12 gap-y-8">
          {CLUBES.map((club) => (
            <li key={club.nombre} className="flex min-w-0 items-center gap-4">
              <span className="flex size-[72px] shrink-0 items-center justify-center rounded-xl bg-white p-1">
                <Image src={club.escudo} alt={club.alt} width={64} height={64} className="size-16" />
              </span>
              <span className="text-left font-[family-name:var(--font-oswald)] text-lg font-semibold uppercase leading-tight tracking-wide text-white sm:text-xl">
                {club.nombre}
              </span>
            </li>
          ))}
        </ul>
      </Reveal>
    </section>
  );
}
