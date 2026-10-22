import Link from 'next/link';
import { CONTACTO_HREF } from './contacto';
import Reveal from './Reveal';

/** Cierre para clubes interesados: el CTA es contacto; el login queda como link secundario. */
export default function CtaFinal({ conSesion }: { conSesion: boolean }) {
  return (
    <section aria-labelledby="cta-final-titulo" className="bg-[#F3F4F6] px-4 py-20 sm:px-6 sm:py-28">
      <Reveal className="mx-auto flex w-full max-w-2xl flex-col items-center text-center">
        <h2
          id="cta-final-titulo"
          className="font-[family-name:var(--font-oswald)] text-4xl font-bold uppercase leading-tight text-[#121A61] sm:text-5xl"
        >
          ¿Querés sumar ADN Mens Sana a tu club?
        </h2>
        <p className="mt-4 text-base text-[#6B7280]">
          Escribinos y coordinamos una presentación para tu cuerpo técnico y tus profesionales.
        </p>
        <a
          href={CONTACTO_HREF}
          className="mt-8 inline-flex h-12 w-full items-center justify-center rounded-full bg-[#121A61] px-7 text-base font-semibold text-white shadow-lg shadow-[#121A61]/20 transition-colors hover:bg-[#1E2A8A] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3346CC] sm:w-auto"
        >
          Contactanos
        </a>
        <p className="mt-5 text-sm text-[#6B7280]">
          {conSesion ? '¿Venías a trabajar? ' : '¿Tu club ya lo usa? '}
          <Link
            href={conSesion ? '/dashboard' : '/sign-in'}
            className="rounded font-semibold text-[#3346CC] hover:text-[#121A61] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3346CC]"
          >
            {conSesion ? 'Ir al panel' : 'Ingresar'}
          </Link>
        </p>
      </Reveal>
    </section>
  );
}
