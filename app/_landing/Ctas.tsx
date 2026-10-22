import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { CONTACTO_HREF } from './contacto';

/**
 * Los dos CTAs en pill de la landing. El primario depende de la sesión: sin sesión
 * "Ingresar" (`/sign-in`), con sesión "Ir al panel" (`/dashboard`).
 */
export function CtaPrincipal({ conSesion, className }: { conSesion: boolean; className?: string }) {
  return (
    <Link
      href={conSesion ? '/dashboard' : '/sign-in'}
      className={`inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#121A61] px-7 text-base font-semibold text-white shadow-lg shadow-[#121A61]/20 transition-colors hover:bg-[#1E2A8A] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3346CC] ${className ?? ''}`}
    >
      {conSesion ? 'Ir al panel' : 'Ingresar'}
      <ArrowRight className="size-4" aria-hidden />
    </Link>
  );
}

export function CtaContacto({ className, sobreOscuro = false }: { className?: string; sobreOscuro?: boolean }) {
  return (
    <a
      href={CONTACTO_HREF}
      className={`inline-flex h-12 items-center justify-center rounded-full border px-7 text-base font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 ${sobreOscuro ? 'border-white/40 text-white hover:bg-white/10 focus-visible:outline-white' : 'border-[#121A61]/20 bg-white/70 text-[#121A61] hover:bg-[#3346CC]/5 focus-visible:outline-[#3346CC]'} ${className ?? ''}`}
    >
      Contactanos
    </a>
  );
}
