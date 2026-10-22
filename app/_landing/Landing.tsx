import CtaFinal from './CtaFinal';
import Hero from './Hero';
import LandingFooter from './LandingFooter';
import LandingNav from './LandingNav';
import MorphHero from './MorphHero';
import SeccionClubes from './SeccionClubes';
import SeccionFuncionalidades from './SeccionFuncionalidades';
import SeccionModulos from './SeccionModulos';
import VentanaDashboard from './VentanaDashboard';

/**
 * La landing pública. Recibe la sesión ya resuelta para que `page.tsx` sea lo único
 * que habla con Clerk (y esto se pueda testear sin mockearlo).
 *
 * Fondos por sección, para que no queden bloques blancos pegados: el hero va sobre
 * "papel" cálido (`#F5F2EA`, el fondo del `<main>`, que cubre todo el alto del pin del
 * morph), los clubes en franja navy, los módulos en un tinte azul claro, el producto en
 * gris claro (`#EFEEEB`) con las demos como ventanas blancas, el cierre vuelve al papel y el
 * footer es navy. Sin degradés ni blobs: colores planos y bordes netos.
 *
 * `w-full min-w-0` en el `<main>`: el `<body>` del root layout es `flex`, y sin el
 * `min-w-0` un hijo ancho (las cards) estira el main y aparece scroll horizontal.
 */
export default function Landing({ conSesion }: { conSesion: boolean }) {
  return (
    <main className="w-full min-w-0 overflow-x-clip bg-[#F5F2EA] text-[#1C1C1C]">
      {/* El hero y la ventana del dashboard que se arma al scrollear (`MorphHero`). */}
      <MorphHero>
        <LandingNav conSesion={conSesion} />
        <Hero conSesion={conSesion} />
        <VentanaDashboard />
      </MorphHero>

      <SeccionClubes />
      <SeccionModulos />

      <SeccionFuncionalidades />

      <CtaFinal conSesion={conSesion} />
      <LandingFooter />
    </main>
  );
}
