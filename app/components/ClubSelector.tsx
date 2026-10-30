'use client';

import { useId, useTransition } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cambiarClubActivo } from '@/lib/actions/club-activo';

export interface ClubOpcion {
  id: string;
  nombre: string;
}

interface ClubSelectorProps {
  /** Clubes donde el usuario tiene una membresía activa. */
  clubes: ClubOpcion[];
  /** Club activo de la sesión. Puede no estar en `clubes` si un superadmin entró a otro. */
  clubActual: ClubOpcion;
}

/**
 * Selector del club activo. Solo aparece con más de una membresía: con una sola
 * no hay nada que elegir. Es un `<select>` nativo a propósito: teclado, lector de
 * pantalla y mobile resueltos por el navegador.
 */
export default function ClubSelector({ clubes, clubActual }: ClubSelectorProps) {
  const id = useId();
  const [isPending, startTransition] = useTransition();

  if (clubes.length <= 1) return null;

  const actualEsMembresia = clubes.some((c) => c.id === clubActual.id);

  function handleChange(clubId: string) {
    if (clubId === clubActual.id) return;
    startTransition(async () => {
      // Con éxito la action redirige a /dashboard y no vuelve.
      const resultado = await cambiarClubActivo(clubId);
      if (resultado && !resultado.ok) toast.error(resultado.error);
    });
  }

  return (
    <div className="px-4 py-3 border-b border-white/10">
      <label htmlFor={id} className="block text-[11px] font-medium uppercase tracking-wide text-white/50 mb-1.5">
        Club
      </label>
      <div className="relative">
        <select
          id={id}
          value={clubActual.id}
          onChange={(e) => handleChange(e.target.value)}
          disabled={isPending}
          aria-busy={isPending}
          className="w-full appearance-none rounded-lg border border-white/20 bg-white/10 py-2 pl-3 pr-8 text-sm font-medium text-white transition-colors hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acento/70 disabled:opacity-60"
        >
          {!actualEsMembresia && (
            <option value={clubActual.id} disabled className="text-muted-foreground">
              {clubActual.nombre}
            </option>
          )}
          {clubes.map((club) => (
            <option key={club.id} value={club.id} className="text-foreground">
              {club.nombre}
            </option>
          ))}
        </select>
        <span className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-white/60" aria-hidden="true">
          {isPending ? <Loader2 size={14} className="animate-spin" /> : '▾'}
        </span>
      </div>
    </div>
  );
}
