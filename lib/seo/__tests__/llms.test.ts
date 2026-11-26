import { afterEach, describe, expect, it, vi } from 'vitest';
import { CONTACTO_HREF } from '@/app/_landing/contacto';
import { PAGINAS_FUNCIONALIDAD, rutaFuncionalidad } from '@/app/_landing/funcionalidades/catalogo';
import { GET as getLlms, dynamic as dynamicLlms } from '@/app/llms.txt/route';
import { GET as getLlmsFull, dynamic as dynamicLlmsFull } from '@/app/llms-full.txt/route';
import { QUE_ES_BIOTEAM } from '../producto';
import { llmsFullTxt, llmsTxt } from '../llms';

const SITIO = new URL('https://bioteam.com.ar');
const urlDe = (slug: string) => `https://bioteam.com.ar${rutaFuncionalidad(slug)}`;

/** Todos los links Markdown `[texto](url)` del contenido. */
const links = (texto: string) => Array.from(texto.matchAll(/\]\(([^)]+)\)/g), (m) => m[1]);

describe('llmsTxt', () => {
  const txt = llmsTxt(SITIO);

  it('sigue el formato de llmstxt.org: H1, blockquote y secciones H2', () => {
    const lineas = txt.split('\n');
    expect(lineas[0]).toBe('# BioTeam');
    expect(lineas[2]).toMatch(/^> \S/);
    expect(txt).toContain(QUE_ES_BIOTEAM);
    expect(txt).toContain('\n## Funcionalidades\n');
    expect(txt).toContain('\n## Más\n');
    expect(txt.match(/^# /gm)).toHaveLength(1);
  });

  it('lista cada funcionalidad con su URL absoluta y una descripción', () => {
    for (const p of PAGINAS_FUNCIONALIDAD) {
      expect(txt).toContain(`- [${p.nombre}](${urlDe(p.slug)}): ${p.resumen}`);
    }
  });

  it('en "Más" están la home, el índice y el contacto público, y todos los links son absolutos', () => {
    expect(txt).toContain('(https://bioteam.com.ar/)');
    expect(txt).toContain('(https://bioteam.com.ar/funcionalidades)');
    expect(txt).toContain(`(${CONTACTO_HREF})`);
    expect(txt).toContain('(https://bioteam.com.ar/llms-full.txt)');
    for (const url of links(txt)) expect(url).toMatch(/^https:\/\//);
  });

  it('no nombra a clubes cliente', () => {
    expect(txt).not.toMatch(/\b(gimnasia|esgrima|la plata|lobo)\b/i);
  });
});

describe('llmsFullTxt', () => {
  const txt = llmsFullTxt(SITIO);

  it('tiene una sección por funcionalidad con URL, bajada, resumen, beneficios, pasos y FAQs', () => {
    for (const p of PAGINAS_FUNCIONALIDAD) {
      const inicio = txt.indexOf(`## ${p.h1}\n`);
      expect(inicio).toBeGreaterThan(-1);
      const fin = txt.indexOf('\n## ', inicio + 1);
      const seccion = txt.slice(inicio, fin === -1 ? undefined : fin);
      expect(seccion).toContain(`URL: ${urlDe(p.slug)}`);
      expect(seccion).toContain(p.bajada);
      expect(seccion).toContain(p.resumenRespuesta);
      for (const b of p.beneficios) for (const item of b.items) expect(seccion).toContain(`- ${item}`);
      for (const paso of p.pasos) expect(seccion).toContain(paso.texto);
      expect(seccion).toContain('### Preguntas frecuentes');
      for (const faq of p.faqs) {
        expect(seccion).toContain(`**${faq.pregunta}**`);
        expect(seccion).toContain(faq.respuesta);
      }
    }
  });

  it('no nombra a clubes cliente', () => {
    expect(txt).not.toMatch(/\b(gimnasia|esgrima|la plata|lobo)\b/i);
  });
});

describe('route handlers /llms.txt y /llms-full.txt', () => {
  afterEach(() => vi.unstubAllEnvs());

  it.each([
    ['/llms.txt', getLlms, dynamicLlms],
    ['/llms-full.txt', getLlmsFull, dynamicLlmsFull],
  ] as const)('%s: 200, text/plain utf-8, estático y con URLs del sitio', async (_, get, dynamic) => {
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://bioteam.com.ar');
    expect(dynamic).toBe('force-static');
    const res = get();
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('text/plain; charset=utf-8');
    const texto = await res.text();
    expect(texto.startsWith('# BioTeam')).toBe(true);
    for (const p of PAGINAS_FUNCIONALIDAD) expect(texto).toContain(urlDe(p.slug));
  });
});
