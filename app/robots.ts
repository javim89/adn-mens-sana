import type { MetadataRoute } from 'next';
import { urlDelSitio } from '@/lib/seo/sitio';

// No se bloquean las páginas privadas: si el robots.txt las excluyera, el crawler no
// llegaría a leer su `noindex` (lo pone la metadata de cada segmento).
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/api/'] },
    sitemap: new URL('/sitemap.xml', urlDelSitio()).href,
  };
}
