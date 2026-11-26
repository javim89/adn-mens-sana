import CtaFinal from '../CtaFinal';
import LandingFooter from '../LandingFooter';
import LandingNav from '../LandingNav';

/**
 * El marco de las páginas públicas fuera de la home (`/funcionalidades/**`): el nav de la
 * landing, el contenido, el cierre con CTA y el footer. Sin el morph de la home.
 *
 * `w-full min-w-0` en la raíz: el `<body>` del root layout es `flex`, y sin el `min-w-0`
 * un hijo ancho estira la página y aparece scroll horizontal. `overflow-x-clip` (no
 * `hidden`) corta sin crear un contexto de scroll.
 */
export default function LayoutPublico({
  conSesion,
  children,
}: {
  conSesion: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex w-full min-w-0 flex-col overflow-x-clip bg-[#F5F2EA] text-[#1C1C1C]">
      <LandingNav conSesion={conSesion} />
      <main id="contenido" className="w-full min-w-0 bg-[#F5F2EA]">
        {children}
        <CtaFinal conSesion={conSesion} />
      </main>
      <LandingFooter />
    </div>
  );
}
