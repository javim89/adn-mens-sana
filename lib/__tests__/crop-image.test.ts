import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { getCroppedImage, rotatedSize } from '../crop-image';

let failLoad = false;

class FakeImage {
  naturalWidth = 400;
  naturalHeight = 200;
  crossOrigin: string | null = null;
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  set src(_: string) {
    queueMicrotask(() => (failLoad ? this.onerror?.() : this.onload?.()));
  }
}

function fakeContext() {
  return {
    scale: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    drawImage: vi.fn(),
    fillRect: vi.fn(),
    fillStyle: '',
    imageSmoothingQuality: 'low',
  };
}

describe('getCroppedImage', () => {
  let contexts: ReturnType<typeof fakeContext>[];
  let canvases: HTMLCanvasElement[];
  let toBlobArgs: unknown[][];

  beforeEach(() => {
    failLoad = false;
    contexts = [];
    canvases = [];
    toBlobArgs = [];
    vi.stubGlobal('Image', FakeImage);
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (
      this: HTMLCanvasElement,
    ) {
      const ctx = fakeContext();
      contexts.push(ctx);
      canvases.push(this);
      return ctx as unknown as CanvasRenderingContext2D;
    } as never);
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((cb, type, quality) => {
      toBlobArgs.push([type, quality]);
      cb(new Blob(['jpg'], { type: type ?? 'image/png' }));
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  test('genera un JPEG de 512x512 con calidad 0.9 y fondo blanco', async () => {
    const file = await getCroppedImage('blob:x', { x: 10, y: 20, width: 150, height: 150 });

    expect(file).toBeInstanceOf(File);
    expect(file.type).toBe('image/jpeg');
    expect(file.name).toBe('foto.jpg');
    expect(toBlobArgs).toEqual([['image/jpeg', 0.9]]);

    const output = canvases[0];
    expect(output.width).toBe(512);
    expect(output.height).toBe(512);
    expect(contexts[0].fillStyle).toBe('white');
    expect(contexts[0].fillRect).toHaveBeenCalledWith(0, 0, 512, 512);
  });

  // Regresión: un canvas intermedio del tamaño de la foto rotada supera el límite de iOS Safari (~16,7 MP).
  test('dibuja sobre un único canvas del tamaño final, aunque la foto sea grande y esté rotada', async () => {
    await getCroppedImage('blob:x', { x: 0, y: 0, width: 200, height: 200 }, 45);
    expect(canvases).toHaveLength(1);
    expect(canvases[0].width).toBe(512);
    expect(canvases[0].height).toBe(512);
  });

  test('sin rotación lleva el área al origen escalada al tamaño final', async () => {
    await getCroppedImage('blob:x', { x: 10, y: 20, width: 128, height: 128 });

    const ctx = contexts[0];
    expect(ctx.scale).toHaveBeenCalledWith(4, 4);
    expect(ctx.translate).toHaveBeenNthCalledWith(1, -10, -20);
    // Centro del bounding box (= la imagen de 400x200 sin rotar).
    expect(ctx.translate).toHaveBeenNthCalledWith(2, 200, 100);
    expect(ctx.rotate).toHaveBeenCalledWith(0);
    expect(ctx.drawImage).toHaveBeenCalledWith(expect.any(FakeImage), -200, -100);
  });

  test('aplica la rotación sobre el bounding box rotado', async () => {
    await getCroppedImage('blob:x', { x: 0, y: 0, width: 200, height: 200 }, 90);

    // 400x200 rotado 90° → bounding box 200x400, centro (100, 200)
    const ctx = contexts[0];
    const [cx, cy] = ctx.translate.mock.calls[1];
    expect(cx).toBeCloseTo(100);
    expect(cy).toBeCloseTo(200);
    expect(ctx.rotate).toHaveBeenCalledWith(Math.PI / 2);
    expect(ctx.drawImage).toHaveBeenCalledWith(expect.any(FakeImage), -200, -100);
  });

  test('respeta tamaño y tipo personalizados (PNG sin fondo)', async () => {
    const file = await getCroppedImage(
      'blob:x',
      { x: 0, y: 0, width: 100, height: 100 },
      0,
      { size: 256, type: 'image/png' },
    );
    expect(file.type).toBe('image/png');
    expect(canvases[0].width).toBe(256);
    expect(contexts[0].scale).toHaveBeenCalledWith(2.56, 2.56);
    expect(contexts[0].fillRect).not.toHaveBeenCalled();
  });

  test('rechaza si la imagen no carga', async () => {
    failLoad = true;
    await expect(
      getCroppedImage('blob:roto', { x: 0, y: 0, width: 1, height: 1 }),
    ).rejects.toThrow('No se pudo cargar la imagen.');
  });

  test('rechaza si el canvas no genera el blob', async () => {
    vi.mocked(HTMLCanvasElement.prototype.toBlob).mockImplementation((cb) => cb(null));
    await expect(
      getCroppedImage('blob:x', { x: 0, y: 0, width: 1, height: 1 }),
    ).rejects.toThrow('No se pudo generar la imagen recortada.');
  });
});

describe('rotatedSize', () => {
  test('90° intercambia ancho y alto', () => {
    const { width, height } = rotatedSize(400, 200, 90);
    expect(width).toBeCloseTo(200);
    expect(height).toBeCloseTo(400);
  });
});
