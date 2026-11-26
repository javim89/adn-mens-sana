import type { MetadataRoute } from 'next';
import { ACTUALIZADO, PAGINAS_FUNCIONALIDAD, RUTA_FUNCIONALIDADES, rutaFuncionalidad } from '@/app/_landing/funcionalidades/catalogo';
import { urlDelSitio } from '@/lib/seo/sitio';

export default function sitemap(): MetadataRoute.Sitemap {
  const sitio = urlDelSitio();
  const url = (ruta: string) => new URL(ruta, sitio).href;
  return [
    { url: url('/'), lastModified: ACTUALIZADO, changeFrequency: 'monthly', priority: 1 },
    { url: url(RUTA_FUNCIONALIDADES), lastModified: ACTUALIZADO, changeFrequency: 'monthly', priority: 0.9 },
    ...PAGINAS_FUNCIONALIDAD.map((pagina) => ({
      url: url(rutaFuncionalidad(pagina.slug)),
      lastModified: ACTUALIZADO,
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    })),
  ];
}
