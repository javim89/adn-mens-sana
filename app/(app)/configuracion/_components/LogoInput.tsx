'use client';

import { useId, useRef } from 'react';
import { ImageUp, Loader2, RotateCcw, Trash2 } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { inicialesDelClub } from '@/lib/branding/marca';
import { LOGO_TIPOS_ENTRADA } from '@/lib/branding/imagen-logo';

/** `actual` = sin cambios; `nuevo` = PNG procesado pendiente de subir; `quitar` = se borra al guardar. */
export type EstadoLogo = { tipo: 'actual' } | { tipo: 'nuevo'; archivo: File } | { tipo: 'quitar' };

interface LogoInputProps {
  nombreClub: string;
  estado: EstadoLogo;
  /** Lo que se ve ahora: el logo guardado, el nuevo (object URL) o `null`. */
  src: string | null;
  tieneLogoGuardado: boolean;
  procesando: boolean;
  error: string | null;
  disabled?: boolean;
  onElegir: (file: File) => void;
  onQuitar: () => void;
  onRestaurar: () => void;
}

const ACCEPT = LOGO_TIPOS_ENTRADA.join(',');

function Vista({ src, nombreClub, fondo, etiqueta }: { src: string | null; nombreClub: string; fondo: string; etiqueta: string }) {
  return (
    <figure className="flex flex-col items-center gap-1.5">
      <div className={`flex h-24 w-24 items-center justify-center rounded-xl p-3 ${fondo}`}>
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element -- object URL o ruta propia con ?v=
          <img src={src} alt="" className="max-h-full max-w-full object-contain" />
        ) : (
          <span
            aria-hidden
            className="flex h-12 w-12 items-center justify-center rounded-lg bg-white font-[family-name:var(--font-oswald)] text-lg font-bold text-primario shadow-sm"
          >
            {inicialesDelClub(nombreClub)}
          </span>
        )}
      </div>
      <figcaption className="text-xs text-muted-foreground">{etiqueta}</figcaption>
    </figure>
  );
}

export default function LogoInput({
  nombreClub,
  estado,
  src,
  tieneLogoGuardado,
  procesando,
  error,
  disabled = false,
  onElegir,
  onQuitar,
  onRestaurar,
}: LogoInputProps) {
  const inputId = useId();
  const ayudaId = useId();
  const errorId = useId();
  const elegirRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) onElegir(file);
  }

  const hayLogo = src !== null;
  // Quitar/Restaurar desaparecen al hacer click: el foco vuelve al botón principal.
  const conFoco = (fn: () => void) => () => {
    fn();
    elegirRef.current?.focus();
  };

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
      <div className="flex gap-3" aria-label="Vista previa del logo" role="group">
        <Vista src={src} nombreClub={nombreClub} fondo="border border-border bg-white" etiqueta="Sobre blanco" />
        <Vista src={src} nombreClub={nombreClub} fondo="bg-primario" etiqueta="Sobre el primario" />
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept={ACCEPT}
          className="sr-only"
          tabIndex={-1}
          aria-hidden
          onChange={handleChange}
          disabled={disabled || procesando}
          data-testid="logo-input"
        />
        <div className="flex flex-wrap gap-2">
          <Button
            ref={elegirRef}
            type="button"
            variant="outline"
            onClick={() => inputRef.current?.click()}
            disabled={disabled || procesando}
            aria-describedby={`${ayudaId}${error ? ` ${errorId}` : ''}`}
          >
            {procesando ? <Loader2 aria-hidden className="animate-spin" /> : <ImageUp aria-hidden />}
            {procesando ? 'Procesando…' : hayLogo ? 'Cambiar logo' : 'Elegir logo'}
          </Button>
          {estado.tipo !== 'actual' && (
            <Button type="button" variant="ghost" onClick={conFoco(onRestaurar)} disabled={disabled || procesando}>
              <RotateCcw aria-hidden />
              {tieneLogoGuardado ? 'Volver al logo guardado' : 'Descartar logo'}
            </Button>
          )}
          {estado.tipo === 'actual' && hayLogo && (
            <Button
              type="button"
              variant="ghost"
              onClick={conFoco(onQuitar)}
              disabled={disabled || procesando}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 aria-hidden />
              Quitar logo
            </Button>
          )}
        </div>
        <p id={ayudaId} className="text-xs text-muted-foreground">
          PNG, JPG, WebP o SVG de hasta 5 MB. Se guarda como PNG de hasta 512 px, con el fondo transparente si lo
          tiene.
        </p>
        {estado.tipo === 'quitar' && (
          <p className="text-xs font-medium text-amber-800">El logo se va a quitar cuando guardes.</p>
        )}
        {error && (
          <p id={errorId} role="alert" className="text-xs text-destructive">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
