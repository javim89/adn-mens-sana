// Client-safe: no importa el AWS SDK, así el frontend puede validar antes de subir.

export const FOTO_TIPOS = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
} as const;

export type FotoContentType = keyof typeof FOTO_TIPOS;

export const FOTO_MAX_BYTES = 5 * 1024 * 1024;

export function isFotoContentType(value: string): value is FotoContentType {
  return Object.hasOwn(FOTO_TIPOS, value);
}
