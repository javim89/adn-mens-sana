import Reveal from './Reveal';

/**
 * Una sección de dos columnas: texto + un componente real del panel (decorativo).
 * `invertida` pone la visual a la izquierda en desktop; `fondo` alterna blanco / gris.
 */
export default function SeccionArea({
  id,
  etiqueta,
  titulo,
  children,
  puntos,
  visual,
  invertida = false,
  fondo = 'blanco',
}: {
  id: string;
  etiqueta: string;
  titulo: string;
  children: React.ReactNode;
  puntos: string[];
  visual: React.ReactNode;
  invertida?: boolean;
  fondo?: 'blanco' | 'gris';
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-titulo`}
      className={`scroll-mt-8 py-20 sm:py-28 ${fondo === 'gris' ? 'bg-[#F3F4F6]' : 'bg-white'}`}
    >
      <div className="mx-auto grid w-full max-w-[1200px] grid-cols-1 items-center gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:gap-16">
        <Reveal className={`min-w-0 ${invertida ? 'lg:order-2' : ''}`}>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#3346CC]">{etiqueta}</p>
          <h2
            id={`${id}-titulo`}
            className="mt-3 font-[family-name:var(--font-oswald)] text-4xl font-bold uppercase leading-tight text-[#121A61] sm:text-5xl"
          >
            {titulo}
          </h2>
          <div className="mt-5 text-base leading-relaxed text-[#6B7280]">{children}</div>
          <ul className="mt-6 space-y-3">
            {puntos.map((p) => (
              <li key={p} className="flex gap-3 text-sm text-[#1C1C1C]">
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#121A61]" aria-hidden />
                {p}
              </li>
            ))}
          </ul>
        </Reveal>
        <Reveal retrasoMs={120} className={`min-w-0 ${invertida ? 'lg:order-1' : ''}`}>
          <div aria-hidden inert className="landing-visual">
            {visual}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
