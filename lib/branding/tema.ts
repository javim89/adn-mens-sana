/**
 * Tema de un club: de los 3 colores que elige el admin (primario, secundario, acento)
 * se derivan el hover, el texto encima y los tintes. Funciones puras: se usan en el
 * servidor (CSS inyectado, Clerk) y en el cliente (vista previa de /configuracion).
 */
import {
  asegurarContraste,
  contraste,
  foregroundPara,
  hexAOklch,
  normalizarHex,
  oklchAHex,
  tinte,
} from './colores';
import { BLANCO, CONTRASTE_MIN_TEXTO, TEMA_BIOTEAM, VARS_TEMA, type Tema } from './tokens';

export interface ColoresClub {
  primario?: string | null;
  secundario?: string | null;
  acento?: string | null;
}

/** Los campos del modelo `Club` que definen el tema. */
export interface ClubConColores {
  colorPrimario?: string | null;
  colorSecundario?: string | null;
  colorAcento?: string | null;
}

const DELTA_HOVER = 0.06;
/** El secundario derivado del primario: más claro y más saturado (como #121a61 → #3346cc). */
const DELTA_SECUNDARIO = 0.2;
const CROMA_MIN_SECUNDARIO = 0.12;
// L y factor de croma que llevan la paleta BioTeam a sus "suave" (#eef0fb, #eaddb5).
const SUAVE_PRIMARIO = { l: 0.957, croma: 0.12 };
const SUAVE_ACENTO = { l: 0.898, croma: 0.465 };

/** Hover del primario: un poco más claro; si eso rompe el contraste con blanco, más oscuro. */
function hoverDe(primario: string): string {
  const { l, c, h } = hexAOklch(primario);
  const claro = oklchAHex({ l: l + DELTA_HOVER, c, h });
  if (contraste(claro, BLANCO) >= CONTRASTE_MIN_TEXTO) return claro;
  return oklchAHex({ l: l - DELTA_HOVER, c, h });
}

function secundarioDesde(primario: string): string {
  const { l, c, h } = hexAOklch(primario);
  const derivado = oklchAHex({ l: l + DELTA_SECUNDARIO, c: Math.max(c, CROMA_MIN_SECUNDARIO), h });
  return asegurarContraste(derivado, BLANCO, CONTRASTE_MIN_TEXTO);
}

/**
 * Tema completo a partir de los colores del club.
 *
 * - Todo nulo (o inválido) → `TEMA_BIOTEAM`.
 * - Primario y secundario se oscurecen si hace falta para tener ≥4.5:1 contra blanco:
 *   `text-white` sobre ellos siempre se lee.
 * - Si un color coincide con el de BioTeam se usan sus derivados exactos, así un club
 *   que guardó la paleta default se ve idéntico al tema default.
 * - Sin secundario, se deriva del primario. Sin acento, queda el dorado.
 */
export function derivarTema(colores: ColoresClub): Tema {
  const primario = normalizarHex(colores.primario);
  const secundario = normalizarHex(colores.secundario);
  const acento = normalizarHex(colores.acento);
  const tema: Tema = { ...TEMA_BIOTEAM };

  if (primario && primario !== TEMA_BIOTEAM.primario) {
    const p = asegurarContraste(primario, BLANCO, CONTRASTE_MIN_TEXTO);
    tema.primario = p;
    tema.primarioHover = hoverDe(p);
    tema.primarioForeground = BLANCO;
    tema.primarioSuave = tinte(p, SUAVE_PRIMARIO.l, SUAVE_PRIMARIO.croma);
  }

  if (secundario && secundario !== TEMA_BIOTEAM.secundario) {
    tema.secundario = asegurarContraste(secundario, BLANCO, CONTRASTE_MIN_TEXTO);
    tema.secundarioForeground = BLANCO;
  } else if (!secundario && primario && primario !== TEMA_BIOTEAM.primario) {
    tema.secundario = secundarioDesde(tema.primario);
    tema.secundarioForeground = BLANCO;
  }

  if (acento && acento !== TEMA_BIOTEAM.acento) {
    tema.acento = acento;
    tema.acentoForeground = foregroundPara(acento);
    tema.acentoSuave = tinte(acento, SUAVE_ACENTO.l, SUAVE_ACENTO.croma);
  }

  return tema;
}

export function temaDelClub(club: ClubConColores | null | undefined): Tema {
  return derivarTema({
    primario: club?.colorPrimario,
    secundario: club?.colorSecundario,
    acento: club?.colorAcento,
  });
}

/**
 * `:root{--club-…}` listo para un `<style>`. Cada valor pasa por `normalizarHex` y, si no
 * es un hex, cae al default de BioTeam: nada que no sea `#rrggbb` llega al CSS (sin
 * inyección aunque el tema venga de un input).
 */
export function cssDelTema(tema: Tema): string {
  const claves = Object.keys(VARS_TEMA) as (keyof Tema)[];
  const decl = claves
    .map((k) => `${VARS_TEMA[k]}:${normalizarHex(tema[k]) ?? TEMA_BIOTEAM[k]};`)
    .join('');
  return `:root{${decl}}`;
}

/** FNV-1a de 32 bits en base 36: corto, estable y suficiente para cache-busting. */
function hashCorto(texto: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}

/** Cambia cuando cambian los colores o el logo del club (`?v=` de íconos y logo). */
export function versionTema(club: ClubConColores & { logoKey?: string | null }): string {
  return hashCorto(
    [
      normalizarHex(club.colorPrimario) ?? '',
      normalizarHex(club.colorSecundario) ?? '',
      normalizarHex(club.colorAcento) ?? '',
      club.logoKey ?? '',
    ].join('|'),
  );
}

/** Variables de `appearance` para los componentes de Clerk (`<SignIn>`, `<SignUp>`). */
export function appearanceClerk(tema: Tema) {
  return {
    variables: {
      colorPrimary: tema.primario,
      colorBackground: BLANCO,
      fontFamily: 'Inter, sans-serif',
    },
  };
}
