'use client';

import { useId } from 'react';
import { AlertTriangle, Check, Wand2 } from 'lucide-react';
import { Input } from '@/app/components/ui/input';
import { asegurarContraste, contraste, foregroundPara, normalizarHex } from '@/lib/branding/colores';
import { BLANCO, CONTRASTE_MIN_TEXTO } from '@/lib/branding/tokens';

interface SelectorColorProps {
  etiqueta: string;
  /** Dónde se ve el color en la app. */
  uso: string;
  /** Lo que tipeó el admin: `''` = predeterminado. Puede ser un hex a medio escribir. */
  texto: string;
  /** El color que efectivamente usa el tema (el ingresado ajustado, o el default). */
  efectivo: string;
  onTexto: (texto: string) => void;
  /** Primario y secundario llevan texto blanco encima: exigen 4.5:1. */
  exigeContraste: boolean;
  /** Colores del logo para elegir con un click. */
  sugeridos?: string[];
}

function nivel(ratio: number): string {
  if (ratio >= 7) return 'AAA';
  if (ratio >= CONTRASTE_MIN_TEXTO) return 'AA';
  return 'Bajo';
}

export function hexInvalido(texto: string): boolean {
  return texto.trim() !== '' && normalizarHex(texto) === null;
}

/** El hex ingresado tiene menos de 4.5:1 contra blanco. */
export function contrasteBajo(texto: string): boolean {
  const hex = normalizarHex(texto);
  return hex !== null && contraste(hex, BLANCO) < CONTRASTE_MIN_TEXTO;
}

export default function SelectorColor({
  etiqueta,
  uso,
  texto,
  efectivo,
  onTexto,
  exigeContraste,
  sugeridos = [],
}: SelectorColorProps) {
  const id = useId();
  const hexId = `${id}-hex`;
  const usoId = `${id}-uso`;
  const errorId = `${id}-error`;
  const avisoId = `${id}-aviso`;
  const badgeId = `${id}-badge`;

  const ingresado = normalizarHex(texto);
  const invalido = hexInvalido(texto);
  const muestra = ingresado ?? efectivo;
  // Primario/secundario: contra el texto blanco. Acento: contra el texto que se le elige encima.
  const ratio = exigeContraste ? contraste(muestra, BLANCO) : contraste(muestra, foregroundPara(muestra));
  const bajo = exigeContraste && ingresado !== null && ratio < CONTRASTE_MIN_TEXTO;
  const ok = ratio >= CONTRASTE_MIN_TEXTO;

  const descripcion = [usoId, badgeId, invalido && errorId, bajo && avisoId].filter(Boolean).join(' ');

  return (
    <div className="flex flex-col gap-2 border-b border-border py-4 last:border-b-0" data-selector-color={etiqueta}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <label htmlFor={hexId} className="text-sm font-semibold text-foreground">
            {etiqueta}
          </label>
          <p id={usoId} className="text-xs text-muted-foreground">
            {uso}
          </p>
        </div>
        <span
          id={badgeId}
          className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
            ok ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'
          }`}
        >
          {ok ? <Check aria-hidden className="h-3 w-3" /> : <AlertTriangle aria-hidden className="h-3 w-3" />}
          <span className="sr-only">Contraste </span>
          {ratio.toFixed(1)}:1 · {nivel(ratio)}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="color"
          value={muestra}
          onChange={(e) => onTexto(e.target.value)}
          aria-label={`${etiqueta}: selector de color`}
          aria-describedby={usoId}
          className="h-9 w-12 shrink-0 cursor-pointer rounded-md border border-input bg-white p-0.5"
        />
        <Input
          id={hexId}
          value={texto}
          onChange={(e) => onTexto(e.target.value)}
          placeholder={`Predeterminado (${efectivo})`}
          spellCheck={false}
          autoComplete="off"
          maxLength={7}
          aria-invalid={invalido || bajo}
          aria-describedby={descripcion}
          className={`max-w-56 font-mono uppercase placeholder:normal-case ${invalido ? 'border-destructive' : ''}`}
        />
        {texto !== '' && (
          <button
            type="button"
            onClick={() => onTexto('')}
            className="text-xs font-medium text-secundario underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secundario/40 rounded"
          >
            Usar predeterminado
          </button>
        )}
      </div>

      {invalido && (
        <p id={errorId} className="text-xs text-destructive">
          Ingresá un color en formato #rrggbb.
        </p>
      )}

      {bajo && ingresado && (
        <div
          id={avisoId}
          className="flex flex-wrap items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900"
        >
          <AlertTriangle aria-hidden className="h-4 w-4 shrink-0" />
          <span className="min-w-0 flex-1">
            Poco contraste con el texto blanco ({ratio.toFixed(1)}:1). Para guardarlo tiene que llegar a{' '}
            {CONTRASTE_MIN_TEXTO}:1.
          </span>
          <button
            type="button"
            onClick={() => onTexto(asegurarContraste(ingresado, BLANCO, CONTRASTE_MIN_TEXTO))}
            className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-1 font-semibold text-amber-900 shadow-sm hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
          >
            <Wand2 aria-hidden className="h-3.5 w-3.5" />
            Ajustar automáticamente
          </button>
        </div>
      )}

      {sugeridos.length > 0 && (
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label={`Colores del logo para ${etiqueta}`}>
          <span className="text-xs text-muted-foreground">Del logo:</span>
          {sugeridos.map((hex) => {
            const elegido = ingresado === hex;
            return (
              <button
                key={hex}
                type="button"
                onClick={() => onTexto(hex)}
                aria-pressed={elegido}
                aria-label={`Usar ${hex} como ${etiqueta.toLowerCase()}`}
                title={hex}
                style={{ backgroundColor: hex }}
                className={`h-7 w-7 rounded-full border border-black/10 shadow-sm transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secundario focus-visible:ring-offset-2 ${
                  elegido ? 'ring-2 ring-foreground ring-offset-2' : ''
                }`}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
