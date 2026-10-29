import Link from 'next/link';
import { CONTACTO_HREF } from './contacto';
import Wordmark from './Wordmark';

/** Nav transparente sobre el papel del hero, anclado por una línea fina abajo. En mobile queda solo el logo y el CTA principal. */
export default function LandingNav({ conSesion }: { conSesion: boolean }) {
  return (
    <header data-morph-nav className="relative z-20 mx-auto flex w-full max-w-[1200px] items-center justify-between gap-4 px-4 py-5 sm:px-6 after:absolute after:inset-x-4 after:bottom-0 after:h-px after:bg-[#121A61]/10 sm:after:inset-x-6">
      <Link
        href="/"
        aria-label="BioTeam, inicio"
        className="min-w-0 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#3346CC]"
      >
        <Wordmark />
      </Link>
      <nav aria-label="Principal" className="flex shrink-0 items-center gap-2">
        <a
          href={CONTACTO_HREF}
          className="hidden rounded-full px-4 py-2 text-sm font-medium text-[#1C1C1C] transition-colors hover:bg-[#121A61]/[0.06] focus-visible:outline-2 focus-visible:outline-[#3346CC] sm:inline-flex"
        >
          Contacto
        </a>
        <Link
          href={conSesion ? '/dashboard' : '/sign-in'}
          className="inline-flex h-10 items-center rounded-full bg-[#121A61] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#1E2A8A] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3346CC]"
        >
          {conSesion ? 'Ir al panel' : 'Ingresar'}
        </Link>
      </nav>
    </header>
  );
}
