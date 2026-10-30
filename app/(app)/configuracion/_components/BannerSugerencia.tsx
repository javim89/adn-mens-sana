'use client';

import { Info, Sparkles, Undo2, X } from 'lucide-react';
import type { PaletaDetectada } from '@/lib/branding/paleta';

interface BannerSugerenciaProps {
  /** `null` si el logo no tiene colores (monocromo). */
  paleta: PaletaDetectada | null;
  onDeshacer: () => void;
  onCerrar: () => void;
}

const ROLES = [
  ['primario', 'Primario'],
  ['secundario', 'Secundario'],
  ['acento', 'Acento'],
] as const;

/** Aviso que aparece al elegir un logo: qué colores se tomaron y cómo volver atrás. */
export default function BannerSugerencia({ paleta, onDeshacer, onCerrar }: BannerSugerenciaProps) {
  if (!paleta) {
    return (
      <div
        role="status"
        className="flex items-start gap-3 rounded-xl border border-border bg-subtle px-4 py-3 text-sm text-foreground"
      >
        <Info aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
        <p className="flex-1">No encontramos colores en el logo (es blanco y negro). Dejamos los colores como estaban.</p>
        <button
          type="button"
          onClick={onCerrar}
          aria-label="Cerrar aviso"
          className="rounded p-0.5 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secundario/40"
        >
          <X aria-hidden className="h-4 w-4" />
        </button>
      </div>
    );
  }

  const ajustados = paleta.ajustados.map((r) => (r === 'primario' ? 'el primario' : 'el secundario')).join(' y ');

  return (
    <div
      role="status"
      data-banner-sugerencia=""
      className="flex flex-col gap-3 rounded-xl border border-primario/20 bg-primario-suave px-4 py-3 text-sm text-foreground sm:flex-row sm:items-center"
    >
      <Sparkles aria-hidden className="hidden h-5 w-5 shrink-0 text-primario sm:block" />
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-primario">Tomamos los colores del logo. Podés cambiarlos.</p>
        <ul className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1">
          {ROLES.map(([rol, etiqueta]) => {
            const hex = paleta[rol];
            if (!hex) return null;
            return (
              <li key={rol} className="flex items-center gap-1.5 text-xs">
                <span aria-hidden className="h-3.5 w-3.5 rounded-full border border-black/10" style={{ backgroundColor: hex }} />
                {etiqueta} <span className="font-mono uppercase text-muted-foreground">{hex}</span>
              </li>
            );
          })}
        </ul>
        {ajustados && (
          <p className="mt-1 text-xs text-muted-foreground">
            Oscurecimos {ajustados} para que el texto blanco encima se lea bien.
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={onDeshacer}
        className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-md border border-primario/30 bg-white px-3 py-1.5 text-xs font-semibold text-primario hover:bg-primario-suave focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secundario/40 sm:self-center"
      >
        <Undo2 aria-hidden className="h-3.5 w-3.5" />
        Deshacer
      </button>
    </div>
  );
}
