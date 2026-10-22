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
 * `w-full min-w-0` en el `<main>`: el `<body>` del root layout es `flex`, y sin el
 * `min-w-0` un hijo ancho (las cards) estira el main y aparece scroll horizontal.
 */
export default function Landing({ conSesion }: { conSesion: boolean }) {
  return (
    <main className="w-full min-w-0 overflow-x-clip bg-white text-[#1C1C1C]">
      {/* El hero y la ventana del dashboard que se arma al scrollear (`MorphHero`). */}
      <MorphHero>
        {/* Degradé de fondo con drift lento: azules de la marca y un toque de dorado. */}
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div className="landing-deriva absolute -left-[10%] -top-[20%] h-[70%] w-[60%] rounded-full bg-[radial-gradient(closest-side,rgba(51,70,204,0.16),transparent)] blur-2xl" />
          <div className="landing-deriva absolute -right-[10%] top-[5%] h-[60%] w-[55%] rounded-full bg-[radial-gradient(closest-side,rgba(201,168,76,0.14),transparent)] blur-2xl [--fase:-12s]" />
          <div className="landing-deriva absolute bottom-0 left-[25%] h-[50%] w-[50%] rounded-full bg-[radial-gradient(closest-side,rgba(18,26,97,0.10),transparent)] blur-2xl [--fase:-6s]" />
        </div>
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
