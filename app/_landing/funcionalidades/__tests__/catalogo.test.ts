import { describe, expect, it } from 'vitest';
import { ICON_MAP } from '@/lib/nav-icons';
import {
  ACTUALIZADO,
  CLAVES_PANTALLA,
  PAGINAS_FUNCIONALIDAD,
  RUTA_FUNCIONALIDADES,
  paginaPorSlug,
  rutaFuncionalidad,
  type ClavePantalla,
  type PaginaFuncionalidad,
} from '../catalogo';
import { DESCRIPCION_PANTALLA, PANTALLAS } from '../../pantallas';

const SLUGS = [
  'ficha-del-deportista',
  'seguimientos-medicos',
  'triage-deportivo',
  'turnos',
  'presentismo',
  'convocatorias',
  'viandas',
  'calendario',
  'insights',
  'branding-del-club',
];

const pantallasDe = (p: PaginaFuncionalidad): ClavePantalla[] => [
  p.pantallaHero,
  ...p.bloques.map((b) => b.pantalla),
];

describe('catálogo de funcionalidades', () => {
  it('tiene las 10 páginas, en orden y con los slugs del plan', () => {
    expect(PAGINAS_FUNCIONALIDAD.map((p) => p.slug)).toEqual(SLUGS);
  });

  it('los slugs son únicos y kebab-case', () => {
    const slugs = PAGINAS_FUNCIONALIDAD.map((p) => p.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const slug of slugs) expect(slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  it('las claves de pantalla son únicas', () => {
    expect(new Set(CLAVES_PANTALLA).size).toBe(CLAVES_PANTALLA.length);
  });

  it('paginaPorSlug encuentra cada página y no inventa las que no existen', () => {
    for (const p of PAGINAS_FUNCIONALIDAD) expect(paginaPorSlug(p.slug)).toBe(p);
    expect(paginaPorSlug('no-existe')).toBeUndefined();
    expect(paginaPorSlug('')).toBeUndefined();
  });

  it('arma las rutas bajo /funcionalidades', () => {
    expect(RUTA_FUNCIONALIDADES).toBe('/funcionalidades');
    expect(rutaFuncionalidad('turnos')).toBe('/funcionalidades/turnos');
  });

  it.each(PAGINAS_FUNCIONALIDAD.map((p) => [p.slug, p] as const))(
    '%s: SEO dentro de los largos',
    (_, p) => {
      expect(p.seo.titulo.length).toBeLessThanOrEqual(60);
      expect(p.seo.descripcion.length).toBeGreaterThanOrEqual(70);
      expect(p.seo.descripcion.length).toBeLessThanOrEqual(160);
    },
  );

  it('los H1 y los títulos SEO no se repiten entre páginas', () => {
    const h1s = PAGINAS_FUNCIONALIDAD.map((p) => p.h1);
    const titulos = PAGINAS_FUNCIONALIDAD.map((p) => p.seo.titulo);
    expect(new Set(h1s).size).toBe(h1s.length);
    expect(new Set(titulos).size).toBe(titulos.length);
  });

  it.each(PAGINAS_FUNCIONALIDAD.map((p) => [p.slug, p] as const))(
    '%s: pantallas distintas y todas del contrato',
    (_, p) => {
      const pantallas = pantallasDe(p);
      expect(new Set(pantallas).size).toBe(3);
      for (const clave of pantallas) expect(CLAVES_PANTALLA).toContain(clave);
    },
  );

  it('ninguna página usa la pantalla del dashboard (es del índice)', () => {
    for (const p of PAGINAS_FUNCIONALIDAD) expect(pantallasDe(p)).not.toContain('dashboard');
  });

  it.each(PAGINAS_FUNCIONALIDAD.map((p) => [p.slug, p] as const))(
    '%s: estructura del contenido',
    (_, p) => {
      expect(Object.keys(ICON_MAP)).toContain(p.icono);
      expect(p.beneficios).toHaveLength(3);
      for (const b of p.beneficios) {
        expect(b.items.length).toBeGreaterThanOrEqual(2);
        expect(b.items.length).toBeLessThanOrEqual(4);
      }
      expect(p.pasos).toHaveLength(3);
      expect(p.bloques).toHaveLength(2);
      expect(p.faqs.length).toBeGreaterThanOrEqual(4);
      expect(p.faqs.length).toBeLessThanOrEqual(5);
      for (const texto of [p.nombre, p.resumen, p.eyebrow, p.h1, p.bajada]) {
        expect(texto.trim()).not.toBe('');
      }
    },
  );

  it.each(PAGINAS_FUNCIONALIDAD.map((p) => [p.slug, p] as const))(
    '%s: resumenRespuesta autocontenido y dentro del largo',
    (_, p) => {
      expect(p.resumenRespuesta.length).toBeGreaterThanOrEqual(160);
      expect(p.resumenRespuesta.length).toBeLessThanOrEqual(420);
      expect(p.resumenRespuesta).toContain('BioTeam');
      const oraciones = p.resumenRespuesta.split(/(?<=\.)\s+/);
      expect(oraciones.length).toBeGreaterThanOrEqual(2);
      expect(oraciones.length).toBeLessThanOrEqual(3);
    },
  );

  it('los resúmenes-respuesta no se repiten entre páginas', () => {
    const resumenes = PAGINAS_FUNCIONALIDAD.map((p) => p.resumenRespuesta);
    expect(new Set(resumenes).size).toBe(resumenes.length);
  });

  it('las respuestas de las FAQ no arrancan con un pronombre sin referente', () => {
    for (const p of PAGINAS_FUNCIONALIDAD) {
      for (const faq of p.faqs) expect(faq.respuesta).not.toMatch(/^(Lo|Esto|Eso|Acá|Ahí)\s/);
    }
  });

  it('ACTUALIZADO es una fecha ISO válida', () => {
    expect(ACTUALIZADO).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(new Date(ACTUALIZADO).toISOString().slice(0, 10)).toBe(ACTUALIZADO);
  });

  it('no nombra a clubes cliente en ningún texto', () => {
    expect(JSON.stringify(PAGINAS_FUNCIONALIDAD)).not.toMatch(/gimnasia|esgrima|la plata|lobo/i);
  });

  it('todas las claves del contrato tienen pantalla y descripción implementadas', () => {
    for (const clave of CLAVES_PANTALLA) {
      expect(typeof PANTALLAS[clave]).toBe('function');
      expect(DESCRIPCION_PANTALLA[clave]?.trim()).toBeTruthy();
    }
  });

  it('cada pantalla que usa una página existe en PANTALLAS y en DESCRIPCION_PANTALLA', () => {
    const usadas = new Set(['dashboard' as const, ...PAGINAS_FUNCIONALIDAD.flatMap(pantallasDe)]);
    for (const clave of usadas) {
      expect(Object.keys(PANTALLAS)).toContain(clave);
      expect(Object.keys(DESCRIPCION_PANTALLA)).toContain(clave);
    }
  });
});
