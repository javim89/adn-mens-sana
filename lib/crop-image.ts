// Client-only: usa <canvas> e Image del navegador.

export interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CropOptions {
  size?: number;
  type?: 'image/jpeg' | 'image/png' | 'image/webp';
  quality?: number;
  fileName?: string;
}

const EXTENSION = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' } as const;

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    // Necesario para leer del canvas una foto ya guardada en S3 (URL prefirmada de otro origen).
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('No se pudo cargar la imagen.'));
    img.src = src;
  });
}

/** Bounding box de un rectángulo de `width`×`height` rotado `rotation` grados. */
export function rotatedSize(width: number, height: number, rotation: number) {
  const rad = (rotation * Math.PI) / 180;
  return {
    width: Math.abs(Math.cos(rad) * width) + Math.abs(Math.sin(rad) * height),
    height: Math.abs(Math.sin(rad) * width) + Math.abs(Math.cos(rad) * height),
  };
}

/**
 * Recorta `area` (en píxeles de la imagen rotada, como lo entrega react-easy-crop)
 * y lo escala a un cuadrado de `size`×`size`.
 */
export async function getCroppedImage(
  src: string,
  area: CropArea,
  rotation = 0,
  { size = 512, type = 'image/jpeg', quality = 0.9, fileName = 'foto' }: CropOptions = {},
): Promise<File> {
  const image = await loadImage(src);
  const bbox = rotatedSize(image.naturalWidth, image.naturalHeight, rotation);

  const output = document.createElement('canvas');
  output.width = size;
  output.height = size;
  const ctx = output.getContext('2d');
  if (!ctx) throw new Error('El navegador no soporta canvas.');

  // JPEG no tiene alfa: fondo blanco para PNG/WebP transparentes.
  if (type === 'image/jpeg') {
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, size, size);
  }
  ctx.imageSmoothingQuality = 'high';

  // Se dibuja directo sobre el canvas final (sin uno intermedio del tamaño de la foto rotada):
  // en iOS Safari un canvas de más de ~16,7 MP falla, y una foto de 12 MP rotada 45° ya lo supera.
  // Transformación: escalar el área al tamaño final → llevar el área al origen →
  // centro del bounding box rotado → rotar → dibujar la imagen centrada.
  ctx.scale(size / area.width, size / area.height);
  ctx.translate(-area.x, -area.y);
  ctx.translate(bbox.width / 2, bbox.height / 2);
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.drawImage(image, -image.naturalWidth / 2, -image.naturalHeight / 2);

  const blob = await new Promise<Blob | null>((resolve) => output.toBlob(resolve, type, quality));
  if (!blob) throw new Error('No se pudo generar la imagen recortada.');

  return new File([blob], `${fileName}.${EXTENSION[type]}`, { type });
}
