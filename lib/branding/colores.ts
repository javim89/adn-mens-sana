/**
 * Utilidades de color puras (sin DOM): validación de hex, conversión sRGB ↔ OKLab/OKLCH,
 * contraste WCAG y ajustes que conservan el tono.
 *
 * OKLab (Björn Ottosson, 2020) es perceptualmente uniforme: subir o bajar la L cambia
 * la claridad sin correr el tono, que es lo que se busca al oscurecer un color de marca
 * para que el texto blanco encima sea legible.
 */
import { BLANCO, CONTRASTE_MIN_TEXTO, TEXTO_OSCURO } from './tokens';

export type Rgb = { r: number; g: number; b: number }; // 0–255
export type Oklab = { l: number; a: number; b: number };
export type Oklch = { l: number; c: number; h: number }; // h en grados [0, 360)

const HEX6 = /^#[0-9a-f]{6}$/;
const HEX_ENTRADA = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/;

/** `#rrggbb` en minúscula: el único formato que acepta el resto del módulo y la DB. */
export function esHex6(valor: unknown): valor is string {
  return typeof valor === 'string' && HEX6.test(valor);
}

/**
 * Lleva un hex de 3 o 6 dígitos, con o sin `#`, en mayúscula o minúscula y con espacios
 * alrededor, a `#rrggbb` en minúscula. Cualquier otra cosa (nombres de color, funciones
 * de color, texto con `;` o `}`) devuelve `null`: así nada que no sea un hex llega al CSS.
 */
export function normalizarHex(valor: unknown): string | null {
  if (typeof valor !== 'string') return null;
  const limpio = valor.trim().toLowerCase();
  const m = HEX_ENTRADA.exec(limpio);
  if (!m) return null;
  const digitos =
    m[1].length === 3
      ? m[1]
          .split('')
          .map((d) => d + d)
          .join('')
      : m[1];
  return `#${digitos}`;
}

function hexValido(hex: string): string {
  const n = normalizarHex(hex);
  if (!n) throw new Error(`Color inválido: ${hex}`);
  return n;
}

export function hexARgb(hex: string): Rgb {
  const n = hexValido(hex);
  return {
    r: parseInt(n.slice(1, 3), 16),
    g: parseInt(n.slice(3, 5), 16),
    b: parseInt(n.slice(5, 7), 16),
  };
}

export function rgbAHex({ r, g, b }: Rgb): string {
  const canal = (v: number) =>
    Math.round(Math.min(255, Math.max(0, v)))
      .toString(16)
      .padStart(2, '0');
  return `#${canal(r)}${canal(g)}${canal(b)}`;
}

/** sRGB gamma → lineal (0–1). */
function aLineal(v: number): number {
  const c = v / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/** Lineal (0–1) → sRGB gamma (0–255, sin clamp). */
function aGamma(v: number): number {
  const c = v <= 0.0031308 ? 12.92 * v : 1.055 * Math.sign(v) * Math.abs(v) ** (1 / 2.4) - 0.055;
  return c * 255;
}

export function rgbAOklab({ r, g, b }: Rgb): Oklab {
  const lr = aLineal(r);
  const lg = aLineal(g);
  const lb = aLineal(b);
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
  return {
    l: 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    a: 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    b: 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  };
}

/** OKLab → sRGB lineal, sin clamp (puede salir del gamut). */
function oklabALineal({ l: L, a, b }: Oklab): [number, number, number] {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

const EPS_GAMUT = 1e-4;

function enGamut(lineal: [number, number, number]): boolean {
  return lineal.every((v) => v >= -EPS_GAMUT && v <= 1 + EPS_GAMUT);
}

/** OKLab → sRGB (clamp por canal: para colores ya en gamut es exacto). */
export function oklabARgb(lab: Oklab): Rgb {
  const [r, g, b] = oklabALineal(lab);
  return { r: aGamma(r), g: aGamma(g), b: aGamma(b) };
}

export function oklabAOklch({ l, a, b }: Oklab): Oklch {
  const c = Math.hypot(a, b);
  const h = ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360;
  return { l, c, h };
}

export function oklchAOklab({ l, c, h }: Oklch): Oklab {
  const rad = (h * Math.PI) / 180;
  return { l, a: c * Math.cos(rad), b: c * Math.sin(rad) };
}

export function hexAOklch(hex: string): Oklch {
  return oklabAOklch(rgbAOklab(hexARgb(hex)));
}

/**
 * OKLCH → hex. Si el color cae fuera de sRGB se baja el croma (búsqueda binaria)
 * conservando L y tono: recortar canal por canal correría el tono.
 */
export function oklchAHex({ l, c, h }: Oklch): string {
  const L = Math.min(1, Math.max(0, l));
  let croma = Math.max(0, c);
  if (!enGamut(oklabALineal(oklchAOklab({ l: L, c: croma, h })))) {
    let bajo = 0;
    let alto = croma;
    for (let i = 0; i < 24; i++) {
      const medio = (bajo + alto) / 2;
      if (enGamut(oklabALineal(oklchAOklab({ l: L, c: medio, h })))) bajo = medio;
      else alto = medio;
    }
    croma = bajo;
  }
  return rgbAHex(oklabARgb(oklchAOklab({ l: L, c: croma, h })));
}

/** Luminancia relativa WCAG 2.x (0 = negro, 1 = blanco). */
export function luminanciaRelativa(hex: string): number {
  const { r, g, b } = hexARgb(hex);
  return 0.2126 * aLineal(r) + 0.7152 * aLineal(g) + 0.0722 * aLineal(b);
}

/** Ratio de contraste WCAG entre dos colores (1–21). */
export function contraste(a: string, b: string): number {
  const la = luminanciaRelativa(a);
  const lb = luminanciaRelativa(b);
  const [claro, oscuro] = la > lb ? [la, lb] : [lb, la];
  return (claro + 0.05) / (oscuro + 0.05);
}

/** El texto (blanco o el oscuro de la app) que mejor se lee sobre `bg`. */
export function foregroundPara(bg: string): string {
  return contraste(bg, BLANCO) >= contraste(bg, TEXTO_OSCURO) ? BLANCO : TEXTO_OSCURO;
}

/**
 * Devuelve `hex` si ya tiene `min` de contraste contra `contra`. Si no, mueve solo la L
 * de OKLCH (hacia oscuro si `contra` es claro, hacia claro si es oscuro) hasta el valor
 * más cercano al original que cumple. El tono y el croma se conservan salvo el recorte
 * de gamut.
 */
export function asegurarContraste(
  hex: string,
  contra: string = BLANCO,
  min: number = CONTRASTE_MIN_TEXTO,
): string {
  const base = hexValido(hex);
  if (contraste(base, contra) >= min) return base;

  const { l, c, h } = hexAOklch(base);
  const oscurecer = luminanciaRelativa(contra) > 0.5;
  // `ok` siempre cumple; `mal` no. Se acerca `ok` hacia la L original.
  let ok = oscurecer ? 0 : 1;
  let mal = l;
  for (let i = 0; i < 30; i++) {
    const medio = (ok + mal) / 2;
    if (contraste(oklchAHex({ l: medio, c, h }), contra) >= min) ok = medio;
    else mal = medio;
  }
  const candidato = oklchAHex({ l: ok, c, h });
  // El redondeo a 8 bits puede dejarlo apenas debajo: un paso más.
  if (contraste(candidato, contra) >= min) return candidato;
  return oklchAHex({ l: oscurecer ? ok - 0.005 : ok + 0.005, c, h });
}

/** Mezcla en OKLab: `t = 0` es `a`, `t = 1` es `b`. */
export function mezclar(a: string, b: string, t: number): string {
  const la = rgbAOklab(hexARgb(a));
  const lb = rgbAOklab(hexARgb(b));
  const k = Math.min(1, Math.max(0, t));
  return rgbAHex(
    oklabARgb({
      l: la.l + (lb.l - la.l) * k,
      a: la.a + (lb.a - la.a) * k,
      b: la.b + (lb.b - la.b) * k,
    }),
  );
}

/**
 * Tinte claro de `hex`: mismo tono, con la L fijada en `l` y el croma escalado por
 * `factorCroma`. Mezclar con blanco lo deslava más de lo que hace la paleta BioTeam
 * (su primario-suave es `tinte(primario, 0.957, 0.12)`).
 */
export function tinte(hex: string, l: number, factorCroma: number): string {
  const { c, h } = hexAOklch(hex);
  return oklchAHex({ l, c: c * factorCroma, h });
}
