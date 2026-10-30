/**
 * Procesa el logo que elige el admin en `/configuracion`, en el navegador.
 *
 * Cualquier formato aceptado se rasteriza a un canvas y se guarda SIEMPRE como PNG:
 * un SVG nunca llega a S3 (no hay riesgo de un SVG con scripts servido desde la app).
 * Un segundo canvas chico alimenta `extraerPaleta` para proponer los colores.
 */
import { LOGO_CONTENT_TYPE, LOGO_MAX_BYTES } from '@/lib/foto-constants';
import { extraerPaleta, type PaletaDetectada } from './paleta';

export const LOGO_TIPOS_ENTRADA = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'] as const;
export const LOGO_ORIGINAL_MAX_BYTES = 5 * 1024 * 1024;
/** Lado máximo del PNG que se guarda: alcanza para el sidebar, el login y los íconos. */
export const LOGO_LADO_MAX = 512;
/** Lado de la muestra para detectar colores: 4096 píxeles sobran para un logo. */
export const MUESTRA_LADO = 64;
/** Un SVG sin `width`/`height` no tiene tamaño intrínseco: se rasteriza a este lado. */
const LADO_SVG_SIN_TAMANIO = LOGO_LADO_MAX;

export interface LogoProcesado {
  /** El PNG listo para subir. */
  archivo: File;
  ancho: number;
  alto: number;
  /** `null` si el logo es monocromo. */
  paleta: PaletaDetectada | null;
}

/** Mensaje de error si el archivo no se acepta, o `null` si está bien. */
export function validarArchivoLogo(file: { type: string; size: number }): string | null {
  if (!(LOGO_TIPOS_ENTRADA as readonly string[]).includes(file.type)) {
    return 'Formato no permitido. Usá PNG, JPG, WebP o SVG.';
  }
  if (file.size === 0) return 'El archivo está vacío.';
  if (file.size > LOGO_ORIGINAL_MAX_BYTES) return 'El logo no puede superar los 5 MB.';
  return null;
}

/** Escala `ancho × alto` para que el lado mayor no pase de `max`, sin agrandar. */
export function medidasEscaladas(ancho: number, alto: number, max: number): { ancho: number; alto: number } {
  if (ancho <= 0 || alto <= 0) return { ancho: max, alto: max };
  const k = Math.min(1, max / Math.max(ancho, alto));
  return { ancho: Math.max(1, Math.round(ancho * k)), alto: Math.max(1, Math.round(alto * k)) };
}

function cargarImagen(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('No se pudo leer la imagen.'));
    img.src = url;
  });
}

function canvas(ancho: number, alto: number): { el: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const el = document.createElement('canvas');
  el.width = ancho;
  el.height = alto;
  const ctx = el.getContext('2d');
  if (!ctx) throw new Error('El navegador no permite procesar la imagen.');
  return { el, ctx };
}

function aPng(el: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    el.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('No se pudo convertir el logo.'))), LOGO_CONTENT_TYPE);
  });
}

/**
 * Valida, rasteriza a PNG de ≤512px (conservando la transparencia: el canvas arranca
 * transparente y no se le pinta fondo) y detecta la paleta. Tira `Error` con un mensaje
 * para mostrar al usuario.
 */
export async function procesarLogo(file: File): Promise<LogoProcesado> {
  const error = validarArchivoLogo(file);
  if (error) throw new Error(error);

  const url = URL.createObjectURL(file);
  try {
    const img = await cargarImagen(url);
    const esSvg = file.type === 'image/svg+xml';
    const anchoOrig = img.naturalWidth || (esSvg ? LADO_SVG_SIN_TAMANIO : 0);
    const altoOrig = img.naturalHeight || (esSvg ? LADO_SVG_SIN_TAMANIO : 0);
    if (!anchoOrig || !altoOrig) throw new Error('No se pudo leer la imagen.');

    const { ancho, alto } = medidasEscaladas(anchoOrig, altoOrig, LOGO_LADO_MAX);
    const grande = canvas(ancho, alto);
    grande.ctx.imageSmoothingQuality = 'high';
    grande.ctx.drawImage(img, 0, 0, ancho, alto);
    const blob = await aPng(grande.el);
    if (blob.size > LOGO_MAX_BYTES) throw new Error('El logo procesado supera los 2 MB. Probá con una imagen más simple.');

    // Vecino más cercano: el suavizado mezcla los trazos finos con el fondo y crea
    // colores intermedios (un navy fino sobre blanco se vuelve celeste grisáceo).
    const muestra = medidasEscaladas(anchoOrig, altoOrig, MUESTRA_LADO);
    const chico = canvas(muestra.ancho, muestra.alto);
    chico.ctx.imageSmoothingEnabled = false;
    chico.ctx.drawImage(img, 0, 0, muestra.ancho, muestra.alto);
    const { data } = chico.ctx.getImageData(0, 0, muestra.ancho, muestra.alto);

    const nombre = `${file.name.replace(/\.[^.]+$/, '') || 'logo'}.png`;
    return {
      archivo: new File([blob], nombre, { type: LOGO_CONTENT_TYPE }),
      ancho,
      alto,
      paleta: extraerPaleta(data, muestra.ancho, muestra.alto),
    };
  } finally {
    URL.revokeObjectURL(url);
  }
}
