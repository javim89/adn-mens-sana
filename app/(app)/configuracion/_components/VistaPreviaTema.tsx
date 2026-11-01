import { CalendarDays, LayoutDashboard, Users } from 'lucide-react';
import MarcaClub from '@/app/components/branding/MarcaClub';

/**
 * Maqueta chica de la app con los tokens del tema. Mientras hay cambios sin guardar,
 * el form pisa las `--club-*` en `<html>`, así que esta maqueta (y la app real alrededor)
 * muestran los colores elegidos. Es decorativa: no tiene foco ni texto accesible.
 */
export default function VistaPreviaTema({ nombre, logoSrc }: { nombre: string; logoSrc: string | null }) {
  return (
    <div
      aria-hidden
      inert
      data-vista-previa=""
      className="flex overflow-hidden rounded-xl border border-border bg-muted text-left shadow-sm select-none"
    >
      <div className="flex w-36 shrink-0 flex-col bg-primario text-white">
        <div className="border-b border-white/10 px-2.5 py-3">
          <MarcaClub nombre={nombre || 'Tu club'} logoSrc={logoSrc} tamanio="sm" />
        </div>
        <div className="flex flex-col gap-1 px-1.5 py-3 text-[11px] font-medium">
          <span className="flex items-center gap-2 rounded-md border-l-2 border-acento bg-white/15 px-2 py-1.5">
            <LayoutDashboard className="h-3.5 w-3.5" /> Dashboard
          </span>
          <span className="flex items-center gap-2 px-2 py-1.5 text-white/70">
            <Users className="h-3.5 w-3.5" /> Deportistas
          </span>
          <span className="flex items-center gap-2 px-2 py-1.5 text-white/70">
            <CalendarDays className="h-3.5 w-3.5" /> Calendario
          </span>
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-3 p-3">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate font-[family-name:var(--font-oswald)] text-lg font-bold text-primario">
            Deportistas
          </span>
          <span className="shrink-0 rounded-full bg-acento px-2 py-0.5 text-[10px] font-semibold text-acento-foreground">
            Destacado
          </span>
        </div>
        <div className="rounded-lg border border-border bg-white p-2.5 text-[11px] text-foreground shadow-sm">
          <span className="mb-1 block text-muted-foreground">Buscar</span>
          <span className="block rounded-md border border-secundario px-2 py-1 ring-2 ring-secundario/30">
            Juan Pérez
          </span>
          <span className="mt-2 block">
            Ver <span className="font-medium text-secundario underline">historia deportiva</span>
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-lg bg-primario px-3 py-1.5 text-[11px] font-medium text-primario-foreground">
            Nuevo deportista
          </span>
          <span className="rounded-lg bg-primario-suave px-3 py-1.5 text-[11px] font-medium text-primario">
            Filtrar
          </span>
        </div>
      </div>
    </div>
  );
}
