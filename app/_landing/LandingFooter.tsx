import { CONTACTO_HREF } from './contacto';
import Wordmark from './Wordmark';

export default function LandingFooter() {
  return (
    <footer className="bg-[#121A61] text-white">
      <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-6 px-4 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <Wordmark sobreOscuro />
          <p className="mt-1 text-sm text-white/70">El seguimiento integral del deportista.</p>
        </div>
        <div className="flex items-center gap-6 text-sm text-white/70">
          <a
            href={CONTACTO_HREF}
            className="rounded font-medium text-white hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            Contacto
          </a>
          <span>© {new Date().getFullYear()}</span>
        </div>
      </div>
    </footer>
  );
}
