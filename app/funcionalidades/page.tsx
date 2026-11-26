import type { Metadata, Viewport } from 'next';
import { auth } from '@clerk/nextjs/server';
import IndiceFuncionalidades from '@/app/_landing/paginas/IndiceFuncionalidades';
import {
  PAGINAS_FUNCIONALIDAD,
  RUTA_FUNCIONALIDADES,
  rutaFuncionalidad,
} from '@/app/_landing/funcionalidades/catalogo';
import { metadataPaginaPublica, VIEWPORT_LANDING } from '@/lib/branding/metadata-bioteam';
import { JsonLd, breadcrumb, itemList, webPage } from '@/lib/seo/json-ld';

const TITULO = 'Funcionalidades para gestionar tu club deportivo | BioTeam';
const DESCRIPCION =
  'Ficha del deportista, seguimientos médicos, triage, turnos, presentismo, convocatorias, viandas, calendario e Insights: todo lo que BioTeam hace por tu club.';

export const metadata: Metadata = metadataPaginaPublica({
  titulo: TITULO,
  descripcion: DESCRIPCION,
  ruta: RUTA_FUNCIONALIDADES,
});
export const viewport: Viewport = VIEWPORT_LANDING;

/** Pública (`proxy.ts`); la sesión solo decide el CTA, como en la home. */
export default async function Funcionalidades() {
  const { userId } = await auth();
  return (
    <>
      <JsonLd
        data={[
          webPage({ ruta: RUTA_FUNCIONALIDADES, nombre: TITULO, descripcion: DESCRIPCION, conBreadcrumb: true }),
          breadcrumb([
            { nombre: 'Inicio', ruta: '/' },
            { nombre: 'Funcionalidades', ruta: RUTA_FUNCIONALIDADES },
          ]),
          itemList(
            PAGINAS_FUNCIONALIDAD.map((p) => ({ nombre: p.nombre, ruta: rutaFuncionalidad(p.slug) })),
            RUTA_FUNCIONALIDADES,
          ),
        ]}
      />
      <IndiceFuncionalidades conSesion={Boolean(userId)} />
    </>
  );
}
