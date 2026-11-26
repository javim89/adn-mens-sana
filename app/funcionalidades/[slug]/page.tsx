import type { Metadata, Viewport } from 'next';
import { notFound } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import PaginaFuncionalidadVista from '@/app/_landing/paginas/PaginaFuncionalidadVista';
import {
  PAGINAS_FUNCIONALIDAD,
  RUTA_FUNCIONALIDADES,
  paginaPorSlug,
  rutaFuncionalidad,
} from '@/app/_landing/funcionalidades/catalogo';
import { metadataPaginaPublica, VIEWPORT_LANDING } from '@/lib/branding/metadata-bioteam';
import { JsonLd, breadcrumb, faqPage, webPage } from '@/lib/seo/json-ld';

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = false;
export const viewport: Viewport = VIEWPORT_LANDING;

export function generateStaticParams() {
  return PAGINAS_FUNCIONALIDAD.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const pagina = paginaPorSlug(slug);
  if (!pagina) notFound();
  return metadataPaginaPublica({
    titulo: pagina.seo.titulo,
    descripcion: pagina.seo.descripcion,
    ruta: rutaFuncionalidad(pagina.slug),
  });
}

export default async function Funcionalidad({ params }: Props) {
  const { slug } = await params;
  const pagina = paginaPorSlug(slug);
  if (!pagina) notFound();
  const { userId } = await auth();
  const ruta = rutaFuncionalidad(pagina.slug);
  return (
    <>
      <JsonLd
        data={[
          webPage({ ruta, nombre: pagina.h1, descripcion: pagina.resumenRespuesta, conBreadcrumb: true }),
          breadcrumb([
            { nombre: 'Inicio', ruta: '/' },
            { nombre: 'Funcionalidades', ruta: RUTA_FUNCIONALIDADES },
            { nombre: pagina.nombre, ruta },
          ]),
          faqPage(pagina.faqs, ruta),
        ]}
      />
      <PaginaFuncionalidadVista pagina={pagina} conSesion={Boolean(userId)} />
    </>
  );
}
