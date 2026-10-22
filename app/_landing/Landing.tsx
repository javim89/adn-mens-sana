import CardAcento from './CardAcento';
import {
  PresentismoKpiDemo,
  SeguimientosKpiDemo,
  TriageDemo,
  TurnosDemo,
  ViandasPorComidaDemo,
} from './CardsDemo';
import CtaFinal from './CtaFinal';
import Hero from './Hero';
import LandingFooter from './LandingFooter';
import LandingNav from './LandingNav';
import MorphHero from './MorphHero';
import SeccionArea from './SeccionArea';
import SeccionClubes from './SeccionClubes';
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

      <SeccionArea
        id="triage"
        etiqueta="Triage"
        titulo="Detectá a tiempo quién necesita apoyo"
        fondo="gris"
        puntos={[
          'Cuatro niveles: Verde, Amarillo, Naranja y Rojo.',
          'Se recalcula todas las semanas sobre el plantel activo.',
          'Muestra la variación contra la semana anterior.',
        ]}
        visual={<TriageDemo />}
      >
        Cada deportista tiene un nivel de vulnerabilidad calculado a partir de su ficha y de sus
        seguimientos. El panel muestra cómo se reparte el plantel y quiénes están en rojo.
      </SeccionArea>

      <SeccionArea
        id="seguimientos"
        etiqueta="Seguimientos y turnos"
        titulo="Todas las miradas sobre el mismo deportista"
        invertida
        puntos={[
          'Médicos, kinesiólogos, nutricionistas, psicólogos, cardiólogos y área social.',
          'Turnos con fecha, hora, lugar y deportistas citados.',
          'Antropometría con su historial de mediciones.',
        ]}
        visual={
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <SeguimientosKpiDemo />
            <TurnosDemo cantidad={2} />
          </div>
        }
      >
        Cada profesional registra sus seguimientos en la ficha del deportista, y el resto del
        cuerpo técnico ve el cuadro completo según su rol.
      </SeccionArea>

      <SeccionArea
        id="insights"
        etiqueta="Nuevo · Insights"
        titulo="Tableros sobre los datos de tu club"
        fondo="gris"
        puntos={[
          'Presentismo, viandas, seguimientos, antropometría y triage.',
          'Filtros a nivel tablero y exportación a CSV y PNG.',
          'Un tablero "Panorama general" listo desde el primer día.',
        ]}
        visual={
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <PresentismoKpiDemo />
            <ViandasPorComidaDemo />
          </div>
        }
      >
        Armá tableros con gráficos y KPIs sobre la información que tu club ya carga todos los
        días, sin pedir reportes a mano.
      </SeccionArea>

      <CardAcento />
      <CtaFinal conSesion={conSesion} />
      <LandingFooter />
    </main>
  );
}
