import type { MetadataRoute } from 'next';
import { AGENTES_IA } from '@/lib/seo/agentes-ia';
import { urlDelSitio } from '@/lib/seo/sitio';

const REGLAS = { allow: '/', disallow: ['/api/'] };

// No se bloquean las páginas privadas: si el robots.txt las excluyera, el crawler no
// llegaría a leer su `noindex` (lo pone la metadata de cada segmento).
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', ...REGLAS }, ...AGENTES_IA.map((userAgent) => ({ userAgent, ...REGLAS }))],
    sitemap: new URL('/sitemap.xml', urlDelSitio()).href,
  };
}
