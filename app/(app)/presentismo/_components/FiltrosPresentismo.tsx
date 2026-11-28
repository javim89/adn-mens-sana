'use client';

import { useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { FiltroChip } from '@/app/components/ui/filtro-chip';
import { TIPO_SESION_LABELS } from '@/lib/utils/asistencia';
import type { DisciplinaConCategorias } from '@/lib/queries/disciplinas';

const TIPOS = Object.entries(TIPO_SESION_LABELS).map(([value, label]) => ({ value, label }));

interface Props {
  disciplinas: DisciplinaConCategorias[];
  disciplinaId: string | null;
  categoriaId: string | null;
  tipoSesion: string | null;
}

/** Filtros de la página, en la URL: los leen tanto las estadísticas como la lista. */
export default function FiltrosPresentismo({
  disciplinas,
  disciplinaId,
  categoriaId,
  tipoSesion,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const categorias = disciplinas.find((d) => d.id === disciplinaId)?.categorias ?? [];

  function navegar(updates: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams?.toString() ?? '');
    for (const [key, value] of Object.entries(updates)) {
      if (value === null || value === '') params.delete(key);
      else params.set(key, value);
    }
    params.delete('page');
    const qs = params.toString();
    startTransition(() => router.push(qs ? `${pathname}?${qs}` : pathname));
  }

  return (
    <div
      role="group"
      aria-label="Filtros"
      aria-busy={isPending}
      className={`flex flex-wrap items-center gap-2 transition-opacity ${isPending ? 'opacity-60' : ''}`}
    >
      <FiltroChip
        label="Disciplina"
        todosLabel="Todas las disciplinas"
        buscar
        opciones={disciplinas.map((d) => ({ value: d.id, label: d.nombre }))}
        valor={disciplinaId}
        onChange={(v) => navegar({ disciplina: v, categoria: null })}
      />
      <FiltroChip
        label="Categoría"
        todosLabel="Todas las categorías"
        buscar
        disabled={!disciplinaId}
        opciones={categorias.map((c) => ({ value: c.id, label: c.nombre }))}
        valor={categoriaId}
        onChange={(v) => navegar({ categoria: v })}
      />
      <FiltroChip
        label="Tipo de sesión"
        opciones={TIPOS}
        valor={tipoSesion}
        onChange={(v) => navegar({ tipo: v })}
      />
    </div>
  );
}
