// Client-safe: no importa el AWS SDK, así el frontend puede validar antes de subir.

export const FOTO_TIPOS = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
} as const;

export type FotoContentType = keyof typeof FOTO_TIPOS;

// Aplica al archivo que se sube (ya recortado por el editor). El servidor valida este mismo límite.
export const FOTO_MAX_BYTES = 5 * 1024 * 1024;

// Aplica a la foto original que se elige para recortar: las de celular suelen superar los 5 MB.
export const FOTO_ORIGINAL_MAX_BYTES = 20 * 1024 * 1024;

export function isFotoContentType(value: string): value is FotoContentType {
  return Object.hasOwn(FOTO_TIPOS, value);
}
