// @vitest-environment node
import { describe, it, expect } from 'vitest';
import path from 'node:path';
import sharp from 'sharp';
import { extraerPaleta } from '../paleta';
import { contraste, hexAOklch, hexARgb } from '../colores';

const BLANCO = '#ffffff';
type Px = [number, number, number, number];

/** Imagen de `ancho × alto` donde cada píxel lo decide `color(x, y)`. */
function imagen(ancho: number, alto: number, color: (x: number, y: number) => Px): Uint8ClampedArray {
  const data = new Uint8ClampedArray(ancho * alto * 4);
  for (let y = 0; y < alto; y++) {
    for (let x = 0; x < ancho; x++) data.set(color(x, y), (y * ancho + x) * 4);
  }
  return data;
}

function px(hex: string, alfa = 255): Px {
  const { r, g, b } = hexARgb(hex);
  return [r, g, b, alfa];
}

function deltaTono(a: string, b: string): number {
  const d = Math.abs(hexAOklch(a).h - hexAOklch(b).h) % 360;
  return d > 180 ? 360 - d : d;
}

describe('extraerPaleta: casos sintéticos', () => {
  it('bandera de dos colores: el más oscuro es el primario y el otro el secundario', () => {
    // Mitad azul oscuro, mitad rojo.
    const data = imagen(40, 20, (x) => (x < 20 ? px('#1a237e') : px('#e53935')));
    const p = extraerPaleta(data, 40, 20)!;
    expect(p).not.toBeNull();
    expect(deltaTono(p.primario, '#1a237e')).toBeLessThan(5);
    expect(deltaTono(p.secundario!, '#e53935')).toBeLessThan(5);
    expect(p.acento).toBeNull();
    expect(p.candidatos).toHaveLength(2);
    expect(contraste(p.primario, BLANCO)).toBeGreaterThanOrEqual(4.5);
    expect(contraste(p.secundario!, BLANCO)).toBeGreaterThanOrEqual(4.5);
  });

  it('ignora el fondo transparente aunque sus píxeles tengan color', () => {
    // Círculo verde sobre fondo rojo con alfa 0 (lo que suele quedar en un PNG exportado).
    const data = imagen(32, 32, (x, y) =>
      (x - 16) ** 2 + (y - 16) ** 2 < 100 ? px('#1b5e20') : px('#ff0000', 0),
    );
    const p = extraerPaleta(data, 32, 32)!;
    expect(p.candidatos).toHaveLength(1);
    expect(deltaTono(p.primario, '#1b5e20')).toBeLessThan(5);
  });

  it('ignora el fondo casi blanco, como el del escudo de Gimnasia', () => {
    const data = imagen(30, 30, (x) => (x < 10 ? px('#0d47a1') : px('#fdfdfd')));
    const p = extraerPaleta(data, 30, 30)!;
    expect(p.candidatos).toHaveLength(1);
  });

  it('un logo monocromo (blanco, negro y grises) devuelve null', () => {
    const grises = ['#000000', '#ffffff', '#808080', '#333333', '#cccccc'];
    const data = imagen(25, 25, (x) => px(grises[x % grises.length]));
    expect(extraerPaleta(data, 25, 25)).toBeNull();
  });

  it('una imagen totalmente transparente devuelve null', () => {
    expect(extraerPaleta(imagen(8, 8, () => [0, 0, 0, 0]), 8, 8)).toBeNull();
  });

  it('un solo color: primario sin secundario ni acento', () => {
    const p = extraerPaleta(imagen(10, 10, () => px('#6a1b9a')), 10, 10)!;
    expect(p.primario).toBe('#6a1b9a');
    expect(p.secundario).toBeNull();
    expect(p.acento).toBeNull();
    expect(p.ajustados).toEqual([]);
  });

  it('un color claro se oscurece hasta 4.5:1 y queda marcado como ajustado', () => {
    // Amarillo (mucho) + azul: el azul es el más oscuro (primario), el amarillo pasa a secundario oscurecido.
    const data = imagen(30, 10, (x) => (x < 20 ? px('#fdd835') : px('#1565c0')));
    const p = extraerPaleta(data, 30, 10)!;
    expect(p.candidatos[0]).toBe('#fdd835');
    expect(deltaTono(p.primario, '#1565c0')).toBeLessThan(5);
    expect(p.ajustados).toContain('secundario');
    expect(contraste(p.secundario!, BLANCO)).toBeGreaterThanOrEqual(4.5);
    expect(deltaTono(p.secundario!, '#fdd835')).toBeLessThan(8);
  });

  it('tres colores: el tercero es el acento, tal cual', () => {
    const colores = ['#0d47a1', '#c62828', '#ffb300'];
    const data = imagen(30, 30, (x) => px(colores[Math.floor(x / 10)]));
    const p = extraerPaleta(data, 30, 30)!;
    expect(p.candidatos).toHaveLength(3);
    expect(p.acento).toBe(p.candidatos[2]);
  });

  it('agrupa los bordes suavizados con su color y descarta el ruido', () => {
    const data = imagen(100, 10, (x, y) => {
      if (x === 0 && y === 0) return px('#00ff00'); // un píxel suelto
      return x % 2 === 0 ? px('#1a237e') : px('#1c2580'); // casi el mismo azul
    });
    const p = extraerPaleta(data, 100, 10)!;
    expect(p.candidatos).toHaveLength(1);
  });

  it('nunca devuelve más de 5 candidatos', () => {
    const tonos = ['#c62828', '#ef6c00', '#2e7d32', '#00838f', '#1565c0', '#6a1b9a', '#ad1457'];
    const data = imagen(70, 10, (x) => px(tonos[Math.floor(x / 10)]));
    expect(extraerPaleta(data, 70, 10)!.candidatos).toHaveLength(5);
  });
});

describe('extraerPaleta: escudo real de Gimnasia (public/logo.png)', () => {
  async function paletaDelEscudo(lado?: number) {
    let img = sharp(path.resolve(__dirname, '../../../public/logo.png')).ensureAlpha();
    // Igual que el canvas de muestra de `imagen-logo.ts`: vecino más cercano.
    if (lado) img = img.resize(lado, lado, { fit: 'inside', kernel: 'nearest' });
    const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
    return extraerPaleta(data, info.width, info.height);
  }

  it.each([undefined, 64])('primario azul oscuro, secundario de otro tono, todo ≥4.5:1 (muestra %s)', async (lado) => {
    const p = (await paletaDelEscudo(lado))!;
    expect(p).not.toBeNull();

    const primario = hexAOklch(p.primario);
    expect(primario.h).toBeGreaterThanOrEqual(250);
    expect(primario.h).toBeLessThanOrEqual(285);
    expect(primario.l).toBeLessThan(0.4);

    expect(p.secundario).not.toBeNull();
    expect(deltaTono(p.primario, p.secundario!)).toBeGreaterThanOrEqual(30);

    expect(contraste(p.primario, BLANCO)).toBeGreaterThanOrEqual(4.5);
    expect(contraste(p.secundario!, BLANCO)).toBeGreaterThanOrEqual(4.5);
    expect(p.candidatos.length).toBeGreaterThanOrEqual(2);
    expect(p.candidatos.length).toBeLessThanOrEqual(5);
  });
});
