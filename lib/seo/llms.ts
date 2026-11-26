import { CONTACTO_HREF } from '@/app/_landing/contacto';
import {
  ACTUALIZADO,
  PAGINAS_FUNCIONALIDAD,
  RUTA_FUNCIONALIDADES,
  rutaFuncionalidad,
  type PaginaFuncionalidad,
} from '@/app/_landing/funcionalidades/catalogo';
import { DESCRIPCION_BIOTEAM } from '@/lib/branding/metadata-bioteam';
import { AUDIENCIA_BIOTEAM, QUE_ES_BIOTEAM } from '@/lib/seo/producto';

/**
 * `/llms.txt` y `/llms-full.txt` (https://llmstxt.org): Markdown en texto plano para que
 * los buscadores con IA entiendan y citen BioTeam. Puros y con URLs absolutas.
 */

const absoluta = (ruta: string, sitio: URL) => new URL(ruta, sitio).href;

const enlace = (texto: string, url: string, descripcion: string) => `- [${texto}](${url}): ${descripcion}`;

function encabezado(titulo: string): string[] {
  return [
    `# ${titulo}`,
    '',
    `> ${DESCRIPCION_BIOTEAM}`,
    '',
    QUE_ES_BIOTEAM,
    '',
    `Para quién: ${AUDIENCIA_BIOTEAM.join(', ')}.`,
    '',
  ];
}

export function llmsTxt(sitio: URL): string {
  return [
    ...encabezado('BioTeam'),
    '## Funcionalidades',
    '',
    ...PAGINAS_FUNCIONALIDAD.map((p) => enlace(p.nombre, absoluta(rutaFuncionalidad(p.slug), sitio), p.resumen)),
    '',
    '## Más',
    '',
    enlace('Inicio', absoluta('/', sitio), 'Qué es BioTeam y qué resuelve para un club deportivo.'),
    enlace(
      'Todas las funcionalidades',
      absoluta(RUTA_FUNCIONALIDADES, sitio),
      'Índice de las funcionalidades de BioTeam.',
    ),
    enlace('Contacto por WhatsApp', CONTACTO_HREF, 'Para pedir una demo o consultar por BioTeam.'),
    enlace(
      'Versión completa',
      absoluta('/llms-full.txt', sitio),
      'El detalle de cada funcionalidad, con sus preguntas frecuentes.',
    ),
    '',
  ].join('\n');
}

function seccion(p: PaginaFuncionalidad, sitio: URL): string[] {
  return [
    `## ${p.h1}`,
    '',
    `URL: ${absoluta(rutaFuncionalidad(p.slug), sitio)}`,
    '',
    p.bajada,
    '',
    `En pocas palabras: ${p.resumenRespuesta}`,
    '',
    '### Beneficios',
    '',
    ...p.beneficios.flatMap((b) => [`**${b.titulo}**`, '', ...b.items.map((item) => `- ${item}`), '']),
    '### Cómo funciona',
    '',
    ...p.pasos.map((paso, i) => `${i + 1}. **${paso.titulo}**: ${paso.texto}`),
    '',
    ...p.bloques.flatMap((b) => [`**${b.titulo}**: ${b.texto}`, '']),
    '### Preguntas frecuentes',
    '',
    ...p.faqs.flatMap((faq) => [`**${faq.pregunta}**`, '', faq.respuesta, '']),
  ];
}

export function llmsFullTxt(sitio: URL): string {
  return [
    ...encabezado('BioTeam: funcionalidades en detalle'),
    `Sitio: ${absoluta('/', sitio)}`,
    `Última actualización: ${ACTUALIZADO}`,
    '',
    ...PAGINAS_FUNCIONALIDAD.flatMap((p) => seccion(p, sitio)),
  ].join('\n');
}

/** `text/plain` y no `text/markdown`: todos los crawlers y navegadores lo muestran inline. */
export const CONTENT_TYPE_LLMS = 'text/plain; charset=utf-8';

export function respuestaLlms(contenido: string): Response {
  return new Response(contenido, { headers: { 'Content-Type': CONTENT_TYPE_LLMS } });
}
