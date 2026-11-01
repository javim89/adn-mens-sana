import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  LOGO_ORIGINAL_MAX_BYTES,
  medidasEscaladas,
  procesarLogo,
  validarArchivoLogo,
} from '../imagen-logo';

describe('validarArchivoLogo', () => {
  it.each(['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'])('acepta %s', (type) => {
    expect(validarArchivoLogo({ type, size: 1000 })).toBeNull();
  });

  it.each(['image/gif', 'application/pdf', 'text/html', ''])('rechaza %s', (type) => {
    expect(validarArchivoLogo({ type, size: 1000 })).toMatch(/Formato no permitido/);
  });

  it('rechaza más de 5 MB y archivos vacíos', () => {
    expect(validarArchivoLogo({ type: 'image/png', size: LOGO_ORIGINAL_MAX_BYTES })).toBeNull();
    expect(validarArchivoLogo({ type: 'image/png', size: LOGO_ORIGINAL_MAX_BYTES + 1 })).toMatch(/5 MB/);
    expect(validarArchivoLogo({ type: 'image/png', size: 0 })).toMatch(/vacío/);
  });
});

describe('medidasEscaladas', () => {
  it('achica conservando la proporción', () => {
    expect(medidasEscaladas(1024, 768, 512)).toEqual({ ancho: 512, alto: 384 });
    expect(medidasEscaladas(300, 1200, 512)).toEqual({ ancho: 128, alto: 512 });
  });

  it('no agranda una imagen chica', () => {
    expect(medidasEscaladas(225, 225, 512)).toEqual({ ancho: 225, alto: 225 });
  });

  it('nunca da 0 ni medidas inválidas', () => {
    expect(medidasEscaladas(4000, 1, 64)).toEqual({ ancho: 64, alto: 1 });
    expect(medidasEscaladas(0, 0, 64)).toEqual({ ancho: 64, alto: 64 });
  });
});

describe('procesarLogo (canvas simulado)', () => {
  const dibujados: { width: number; height: number; smoothing: boolean }[] = [];
  let tamanioPng = 1234;
  let naturales = { w: 1024, h: 512 };
  let falla = false;

  beforeEach(() => {
    dibujados.length = 0;
    tamanioPng = 1234;
    naturales = { w: 1024, h: 512 };
    falla = false;
    vi.stubGlobal('URL', { ...URL, createObjectURL: vi.fn(() => 'blob:x'), revokeObjectURL: vi.fn() });

    class ImagenFalsa {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      decoding = '';
      get naturalWidth() {
        return naturales.w;
      }
      get naturalHeight() {
        return naturales.h;
      }
      set src(_: string) {
        queueMicrotask(() => (falla ? this.onerror?.() : this.onload?.()));
      }
    }
    vi.stubGlobal('Image', ImagenFalsa);

    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (this: HTMLCanvasElement) {
      const ctx = {
        imageSmoothingEnabled: true,
        imageSmoothingQuality: 'low',
        drawImage: vi.fn(() => dibujados.push({ width: this.width, height: this.height, smoothing: ctx.imageSmoothingEnabled })),
        // Mitad azul, mitad rojo: lo que "ve" la muestra.
        getImageData: (_x: number, _y: number, w: number, h: number) => {
          const data = new Uint8ClampedArray(w * h * 4);
          for (let i = 0; i < w * h; i++) data.set(i % w < w / 2 ? [26, 35, 126, 255] : [229, 57, 53, 255], i * 4);
          return { data };
        },
      };
      return ctx as unknown as CanvasRenderingContext2D;
    } as never);
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(function (cb, type) {
      cb(new Blob([new Uint8Array(tamanioPng)], { type }));
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  const archivo = (type = 'image/svg+xml', nombre = 'escudo.svg') => new File(['<svg/>'], nombre, { type });

  it('devuelve un PNG de ≤512px y la paleta de la muestra de 64px sin suavizado', async () => {
    const r = await procesarLogo(archivo());
    expect(r.archivo.type).toBe('image/png');
    expect(r.archivo.name).toBe('escudo.png');
    expect(r.archivo.size).toBe(1234);
    expect({ ancho: r.ancho, alto: r.alto }).toEqual({ ancho: 512, alto: 256 });
    expect(dibujados).toEqual([
      { width: 512, height: 256, smoothing: true },
      { width: 64, height: 32, smoothing: false },
    ]);
    expect(r.paleta?.candidatos).toHaveLength(2);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:x');
  });

  it('un SVG sin tamaño intrínseco se rasteriza a 512px', async () => {
    naturales = { w: 0, h: 0 };
    const r = await procesarLogo(archivo());
    expect({ ancho: r.ancho, alto: r.alto }).toEqual({ ancho: 512, alto: 512 });
  });

  it('rechaza un formato no permitido sin tocar el canvas', async () => {
    await expect(procesarLogo(archivo('image/gif', 'a.gif'))).rejects.toThrow(/Formato no permitido/);
    expect(dibujados).toEqual([]);
  });

  it('una imagen que no se puede leer da un error legible', async () => {
    falla = true;
    await expect(procesarLogo(archivo('image/png', 'roto.png'))).rejects.toThrow('No se pudo leer la imagen.');
    expect(URL.revokeObjectURL).toHaveBeenCalled();
  });

  it('rechaza un PNG procesado de más de 2 MB', async () => {
    tamanioPng = 2 * 1024 * 1024 + 1;
    await expect(procesarLogo(archivo('image/png', 'enorme.png'))).rejects.toThrow(/2 MB/);
  });
});
