import { ACTUALIZADO, PAGINAS_FUNCIONALIDAD } from '@/app/_landing/funcionalidades/catalogo';
import { DESCRIPCION_BIOTEAM } from '@/lib/branding/metadata-bioteam';
import { AUDIENCIA_BIOTEAM, QUE_ES_BIOTEAM } from '@/lib/seo/producto';
import { urlDelSitio } from '@/lib/seo/sitio';

/**
 * Datos estructurados (schema.org) de las páginas públicas de BioTeam. Los builders son
 * puros y devuelven URLs absolutas (`urlDelSitio()`): Google no resuelve las relativas
 * contra `metadataBase`. Nunca llevan datos de clubes cliente. Los nodos se enlazan por
 * `@id` estables (`<sitio>/#organization`, `/#website`, `/#software`, `<url>#webpage`).
 */

const CONTEXTO = 'https://schema.org';
const IDIOMA = 'es-AR';

/**
 * Perfiles oficiales de BioTeam (LinkedIn, Instagram, …) para el `sameAs` de la
 * Organization. Agregar acá las URLs absolutas cuando existan; vacío no se emite.
 */
export const SAME_AS: readonly string[] = [];

export interface JsonLdObjeto {
  '@context': typeof CONTEXTO;
  '@type': string;
  [clave: string]: unknown;
}

export interface ItemRuta {
  nombre: string;
  ruta: string;
}

export interface PreguntaFrecuente {
  pregunta: string;
  respuesta: string;
}

function absoluta(ruta: string): string {
  return new URL(ruta, urlDelSitio()).href;
}

const ref = (id: string) => ({ '@id': id });

export const idOrganizacion = () => `${absoluta('/')}#organization`;
export const idSitioWeb = () => `${absoluta('/')}#website`;
export const idSoftware = () => `${absoluta('/')}#software`;
export const idPagina = (ruta: string) => `${absoluta(ruta)}#webpage`;

function sinContexto(objeto: JsonLdObjeto): Record<string, unknown> {
  return Object.fromEntries(Object.entries(objeto).filter(([clave]) => clave !== '@context'));
}

/**
 * Serializa para un `<script type="application/ld+json">`: escapa `<` como `<`
 * (sigue siendo el mismo JSON) para que un `</script>` en el contenido no cierre el tag.
 * Un array se emite como un solo `@graph` con el `@context` arriba.
 */
export function serializarJsonLd(data: JsonLdObjeto | readonly JsonLdObjeto[]): string {
  const valor = Array.isArray(data)
    ? { '@context': CONTEXTO, '@graph': data.map(sinContexto) }
    : data;
  return JSON.stringify(valor).replace(/</g, '\\u003c');
}

export function JsonLd({ data }: { data: JsonLdObjeto | readonly JsonLdObjeto[] }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializarJsonLd(data) }} />;
}

export function organizacion(sameAs: readonly string[] = SAME_AS): JsonLdObjeto {
  return {
    '@context': CONTEXTO,
    '@type': 'Organization',
    '@id': idOrganizacion(),
    name: 'BioTeam',
    url: absoluta('/'),
    logo: {
      '@type': 'ImageObject',
      url: absoluta('/brand/bioteam-logo.png'),
      width: 783,
      height: 1024,
    },
    description: QUE_ES_BIOTEAM,
    areaServed: [
      { '@type': 'Country', name: 'Argentina' },
      { '@type': 'AdministrativeArea', name: 'Latinoamérica' },
    ],
    knowsLanguage: 'es',
    ...(sameAs.length > 0 && { sameAs: [...sameAs] }),
  };
}

export function webSite(): JsonLdObjeto {
  return {
    '@context': CONTEXTO,
    '@type': 'WebSite',
    '@id': idSitioWeb(),
    name: 'BioTeam',
    url: absoluta('/'),
    description: DESCRIPCION_BIOTEAM,
    inLanguage: IDIOMA,
    publisher: ref(idOrganizacion()),
  };
}

/** Sin `offers` ni ratings: no hay precios públicos ni reseñas que respalden un número. */
export function softwareApplication(): JsonLdObjeto {
  return {
    '@context': CONTEXTO,
    '@type': 'SoftwareApplication',
    '@id': idSoftware(),
    name: 'BioTeam',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    description: DESCRIPCION_BIOTEAM,
    url: absoluta('/'),
    inLanguage: IDIOMA,
    audience: {
      '@type': 'BusinessAudience',
      audienceType: `Clubes deportivos: ${AUDIENCIA_BIOTEAM.join(', ')}`,
    },
    featureList: PAGINAS_FUNCIONALIDAD.map((p) => p.nombre),
    publisher: ref(idOrganizacion()),
    provider: ref(idOrganizacion()),
  };
}

export interface DatosPagina {
  ruta: string;
  nombre: string;
  descripcion: string;
  /** La página tiene un `breadcrumb()` en el mismo grafo. */
  conBreadcrumb?: boolean;
}

export function webPage({ ruta, nombre, descripcion, conBreadcrumb = false }: DatosPagina): JsonLdObjeto {
  return {
    '@context': CONTEXTO,
    '@type': 'WebPage',
    '@id': idPagina(ruta),
    url: absoluta(ruta),
    name: nombre,
    description: descripcion,
    inLanguage: IDIOMA,
    isPartOf: ref(idSitioWeb()),
    about: ref(idSoftware()),
    dateModified: ACTUALIZADO,
    ...(conBreadcrumb && { breadcrumb: ref(`${absoluta(ruta)}#breadcrumb`) }),
  };
}

/** El `@id` es `<url del último item>#breadcrumb`: la página actual lo referencia. */
export function breadcrumb(items: readonly ItemRuta[]): JsonLdObjeto {
  const actual = items.at(-1);
  return {
    '@context': CONTEXTO,
    '@type': 'BreadcrumbList',
    ...(actual && { '@id': `${absoluta(actual.ruta)}#breadcrumb` }),
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.nombre,
      item: absoluta(item.ruta),
    })),
  };
}

/** Con `ruta`, queda enlazada a su `webPage()` (`isPartOf`). */
export function faqPage(faqs: readonly PreguntaFrecuente[], ruta?: string): JsonLdObjeto {
  return {
    '@context': CONTEXTO,
    '@type': 'FAQPage',
    ...(ruta ? { '@id': `${absoluta(ruta)}#faq`, isPartOf: ref(idPagina(ruta)) } : {}),
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.pregunta,
      acceptedAnswer: { '@type': 'Answer', text: faq.respuesta },
    })),
  };
}

/** Con `ruta`, es la entidad principal de su `webPage()` (`mainEntityOfPage`). */
export function itemList(items: readonly ItemRuta[], ruta?: string): JsonLdObjeto {
  return {
    '@context': CONTEXTO,
    '@type': 'ItemList',
    ...(ruta ? { '@id': `${absoluta(ruta)}#itemlist`, mainEntityOfPage: ref(idPagina(ruta)) } : {}),
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: absoluta(item.ruta),
      name: item.nombre,
    })),
  };
}
