import { ArrowRight } from 'lucide-react';
import AcordeonFuncionalidades from './AcordeonFuncionalidades';
import { CONTACTO_HREF } from './contacto';
import DemoConvocatorias from './demos/DemoConvocatorias';
import DemoDeportistas from './demos/DemoDeportistas';
import DemoInsights from './demos/DemoInsights';
import DemoSeguimientos from './demos/DemoSeguimientos';
import Reveal from './Reveal';

/**
 * Las funcionalidades del producto: encabezado y el acordeón con una demo de cada
 * módulo. `overflow-x-clip` corta el sangrado de la demo hacia la derecha sin crear un
 * contexto de scroll.
 *
 * Fondo gris claro neutro `#EFEEEB`: sin el tono amarillento del papel del hero y del
 * CTA, y sin el azul del tinte de los módulos, así se distingue de los dos vecinos. Las
 * demos (blancas, con borde y sombra navy) se leen como ventanas encima. Los grises de
 * texto son `#4B5563`: el `#6B7280` no llega a AA sobre este gris.
 */
export default function SeccionFuncionalidades() {
  return (
    <section
      id="funcionalidades"
      aria-labelledby="funcionalidades-titulo"
      data-testid="seccion-funcionalidades"
      className="scroll-mt-8 overflow-x-clip bg-[#EFEEEB] py-20 sm:py-28"
    >
      <div className="mx-auto w-full max-w-[1200px] px-4 sm:px-6">
        <Reveal className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#3346CC]">Producto</p>
          <h2
            id="funcionalidades-titulo"
            className="mt-3 font-[family-name:var(--font-oswald)] text-4xl font-bold uppercase leading-tight text-[#121A61] sm:text-5xl"
          >
            Del dato a la decisión
          </h2>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-[#4B5563] sm:text-lg">
            Lo que tu club ya carga todos los días, ordenado para que el cuerpo técnico y los
            profesionales actúen a tiempo.
          </p>
          <a
            href={CONTACTO_HREF}
            className="group mt-6 inline-flex items-center gap-1.5 rounded-sm text-base font-semibold text-[#3346CC] underline-offset-4 transition-colors hover:text-[#121A61] hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#3346CC]"
          >
            Hablemos
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
          </a>
        </Reveal>

        <Reveal retrasoMs={120} className="mt-12 min-w-0 lg:mt-16">
          <AcordeonFuncionalidades
            demos={{
              insights: <DemoInsights />,
              seguimientos: <DemoSeguimientos />,
              convocatorias: <DemoConvocatorias />,
              deportistas: <DemoDeportistas />,
            }}
          />
        </Reveal>
      </div>
    </section>
  );
}
