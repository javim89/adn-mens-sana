import Link from 'next/link';
import { CONTACTO_HREF } from './contacto';
import { PAGINAS_FUNCIONALIDAD, RUTA_FUNCIONALIDADES, rutaFuncionalidad } from './funcionalidades/catalogo';
import Wordmark from './Wordmark';

const LINK =
  'rounded hover:text-white hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white';

export default function LandingFooter() {
  return (
    <footer className="bg-[#121A61] text-white">
      <div className="mx-auto grid w-full max-w-[1200px] grid-cols-1 gap-10 px-4 py-12 sm:px-6 lg:grid-cols-12 lg:gap-8">
        <div className="lg:col-span-4">
          <Wordmark sobreOscuro />
          <p className="mt-1 text-sm text-white/70">El seguimiento integral del deportista.</p>
          <div className="mt-6 flex items-center gap-6 text-sm text-white/70">
            <a
              href={CONTACTO_HREF}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded font-medium text-white hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              Contacto
            </a>
            <span>© {new Date().getFullYear()}</span>
          </div>
        </div>

        <nav aria-labelledby="footer-funcionalidades" className="min-w-0 lg:col-span-8">
          <p
            id="footer-funcionalidades"
            className="text-xs font-semibold uppercase tracking-[0.2em] text-white/70"
          >
            Funcionalidades
          </p>
          <ul className="mt-4 grid grid-cols-1 gap-x-6 gap-y-2.5 text-sm text-white/80 sm:grid-cols-2 md:grid-cols-3">
            {PAGINAS_FUNCIONALIDAD.map((p) => (
              <li key={p.slug} className="min-w-0">
                <Link href={rutaFuncionalidad(p.slug)} className={LINK}>
                  {p.nombre}
                </Link>
              </li>
            ))}
            <li className="min-w-0">
              <Link href={RUTA_FUNCIONALIDADES} className={`font-semibold text-white ${LINK}`}>
                Ver todas
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </footer>
  );
}
