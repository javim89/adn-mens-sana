import { llmsFullTxt, respuestaLlms } from '@/lib/seo/llms';
import { urlDelSitio } from '@/lib/seo/sitio';

// Contenido estático (sale del catálogo): se genera en el build.
export const dynamic = 'force-static';

export function GET(): Response {
  return respuestaLlms(llmsFullTxt(urlDelSitio()));
}
