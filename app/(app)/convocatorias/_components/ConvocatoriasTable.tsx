'use client';

import { useMemo, useTransition } from 'react';
import Link from 'next/link';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Plus, Pencil, Eye, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { EncabezadoPagina } from '@/app/components/ui/encabezado-pagina';
import { FiltroChip } from '@/app/components/ui/filtro-chip';
import { Panel } from '@/app/components/ui/panel';
import type { DisciplinaConCategorias } from '@/lib/queries/disciplinas';
import type { EstadoEvento } from '@/lib/generated/prisma/enums';
import type { CondicionPartido } from '@/lib/utils/partido';
import { ESTADO_EVENTO_BADGE, ESTADO_EVENTO_LABELS } from '@/lib/utils/enum-labels';
import TileFecha from '../../dashboard/_components/TileFecha';
import { BADGE, textoConvocados, tileDeClave, tituloPartido } from '../_lib/formato';
import DeleteConvocatoriaModal from './DeleteConvocatoriaModal';

export interface ConvocatoriaListItem {
  id: string;
  fecha: string;
  disciplinaNombre: string;
  categoriaNombre: string;
  local: string;
  visitante: string;
  /** El equipo que no es el propio; `null` si ninguno lo es. */
  rival: string | null;
  condicion: CondicionPartido | null;
  estado: EstadoEvento;
  horaCitacion: string | null;
  totalConvocados: number;
}

interface Props {
  items: ConvocatoriaListItem[];
  total: number;
  page: number; // 0-based
  pageSize: number;
  disciplinas: DisciplinaConCategorias[];
  currentDisciplina: string;
  currentCategoria: string;
}

function formatDate(dateStr: string) {
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(dateStr + 'T00:00:00'));
}

function ChipsPartido({ c }: { c: ConvocatoriaListItem }) {
  return (
    <div className="mt-1 flex flex-wrap gap-1.5">
      {c.condicion && (
        <span className={`${BADGE} bg-primario-suave text-primario`}>{c.condicion}</span>
      )}
      <span className={`${BADGE} ${ESTADO_EVENTO_BADGE[c.estado]}`}>
        {ESTADO_EVENTO_LABELS[c.estado]}
      </span>
    </div>
  );
}

function Citacion({ hora }: { hora: string | null }) {
  if (!hora) return null;
  return (
    <p className="text-xs text-muted-foreground whitespace-nowrap">
      Citación <span className="font-medium text-foreground">{hora}</span>
    </p>
  );
}

function Acciones({ c, onDeleted }: { c: ConvocatoriaListItem; onDeleted: () => void }) {
  return (
    <>
      <Link
        href={`/convocatorias/${c.id}`}
        className="text-muted-foreground hover:text-primario transition-colors p-1"
        title="Ver convocatoria"
        aria-label={`Ver convocatoria ${tituloPartido(c)}`}
      >
        <Eye size={15} />
      </Link>
      <Link
        href={`/convocatorias/${c.id}/editar`}
        className="text-muted-foreground hover:text-primario transition-colors p-1"
        title="Editar convocatoria"
        aria-label={`Editar convocatoria ${tituloPartido(c)}`}
      >
        <Pencil size={15} />
      </Link>
      <DeleteConvocatoriaModal
        convocatoriaId={c.id}
        convocatoriaLabel={`${formatDate(c.fecha)} — ${tituloPartido(c)}`}
        onDeleted={onDeleted}
      />
    </>
  );
}

export default function ConvocatoriasTable({
  items,
  total,
  page,
  pageSize,
  disciplinas,
  currentDisciplina,
  currentCategoria,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, totalPages - 1);

  const categorias = useMemo(
    () => disciplinas.find((d) => d.id === currentDisciplina)?.categorias ?? [],
    [disciplinas, currentDisciplina],
  );

  function buildUrl(updates: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams?.toString() ?? '');
    for (const [key, value] of Object.entries(updates)) {
      if (value === null || value === '') params.delete(key);
      else params.set(key, value);
    }
    const qs = params.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  }

  function navigate(url: string) {
    startTransition(() => router.push(url));
  }

  function handleDisciplinaChange(value: string | null) {
    navigate(buildUrl({ disciplina: value, categoria: null, page: null }));
  }

  function handleCategoriaChange(value: string | null) {
    navigate(buildUrl({ categoria: value, page: null }));
  }

  function goToPage(target: number) {
    const clamped = Math.max(0, Math.min(target, totalPages - 1));
    navigate(buildUrl({ page: clamped === 0 ? null : String(clamped) }));
  }

  function handleDeleted() {
    startTransition(() => router.refresh());
  }

  const from = total === 0 ? 0 : currentPage * pageSize + 1;
  const to = Math.min(total, currentPage * pageSize + items.length);

  const vacio = (
    <>
      No hay convocatorias cargadas.{' '}
      <Link href="/convocatorias/nuevo" className="text-primario underline hover:no-underline">
        Crear la primera
      </Link>
    </>
  );

  return (
    <div className="flex flex-col gap-4">
      <EncabezadoPagina
        titulo="Convocatorias"
        contador={total > 0 ? total : undefined}
        contadorLabel={`${total} ${total === 1 ? 'convocatoria' : 'convocatorias'}`}
        subtitulo="Citaciones de plantel para los próximos partidos"
        accion={
          <Button asChild>
            <Link href="/convocatorias/nuevo">
              <Plus />
              Nueva convocatoria
            </Link>
          </Button>
        }
      >
        <div className="flex flex-wrap gap-2">
          <FiltroChip
            label="Disciplina"
            todosLabel="Todas las disciplinas"
            buscar
            opciones={disciplinas.map((d) => ({ value: d.id, label: d.nombre }))}
            valor={currentDisciplina || null}
            onChange={handleDisciplinaChange}
          />
          <FiltroChip
            label="Categoría"
            todosLabel="Todas las categorías"
            buscar
            disabled={!currentDisciplina}
            opciones={categorias.map((c) => ({ value: c.id, label: c.nombre }))}
            valor={currentCategoria || null}
            onChange={handleCategoriaChange}
          />
        </div>
      </EncabezadoPagina>

      <Panel
        relleno={false}
        className={`overflow-hidden transition-opacity ${isPending ? 'opacity-60' : ''}`}
      >
        {/* Cards: debajo de lg */}
        <ul className="lg:hidden divide-y divide-border">
          {items.length === 0 ? (
            <li className="px-4 py-12 text-center text-sm text-muted-foreground">{vacio}</li>
          ) : (
            items.map((c) => {
              const tile = tileDeClave(c.fecha);
              return (
                <li key={c.id} className="flex items-start gap-3 px-4 py-4">
                  <TileFecha arriba={tile.arriba} abajo={tile.abajo} />
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/convocatorias/${c.id}`}
                      className="block truncate text-sm font-semibold text-foreground hover:text-primario"
                    >
                      {tituloPartido(c)}
                    </Link>
                    <ChipsPartido c={c} />
                    <p className="mt-1 truncate text-xs text-muted-foreground">
                      {c.disciplinaNombre} · {c.categoriaNombre} · {textoConvocados(c.totalConvocados)}
                    </p>
                    <Citacion hora={c.horaCitacion} />
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Acciones c={c} onDeleted={handleDeleted} />
                  </div>
                </li>
              );
            })
          )}
        </ul>

        {/* Tabla: lg+ */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-xs uppercase text-muted-foreground bg-muted border-b border-border">
                <th className="px-5 py-3 text-left">Fecha</th>
                <th className="px-5 py-3 text-left">Partido</th>
                <th className="px-5 py-3 text-left">Categoría</th>
                <th className="px-5 py-3 text-left">Convocados</th>
                <th className="px-5 py-3">
                  <span className="sr-only">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-sm text-muted-foreground">
                    {vacio}
                  </td>
                </tr>
              ) : (
                items.map((c) => {
                  const tile = tileDeClave(c.fecha);
                  return (
                    <tr
                      key={c.id}
                      className="border-b border-border last:border-0 hover:bg-muted transition-colors"
                    >
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <TileFecha arriba={tile.arriba} abajo={tile.abajo} />
                          <Citacion hora={c.horaCitacion} />
                        </div>
                      </td>
                      <td className="px-5 py-3 max-w-[280px]">
                        <Link
                          href={`/convocatorias/${c.id}`}
                          className="block truncate text-sm font-semibold text-foreground hover:text-primario hover:underline"
                        >
                          {tituloPartido(c)}
                        </Link>
                        <ChipsPartido c={c} />
                      </td>
                      <td className="px-5 py-3 text-sm text-foreground">
                        {c.disciplinaNombre} · {c.categoriaNombre}
                      </td>
                      <td className="px-5 py-3">
                        <span className="font-mono text-sm font-semibold tabular-nums text-primario">
                          {c.totalConvocados}
                        </span>
                        <span className="sr-only">
                          {c.totalConvocados === 1 ? ' convocado' : ' convocados'}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-1 justify-end">
                          <Acciones c={c} onDeleted={handleDeleted} />
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Panel>

      {total > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            Mostrando {from}–{to} de {total}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage <= 0 || isPending}
              aria-label="Página anterior"
            >
              <ChevronLeft />
              Anterior
            </Button>
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              Página {currentPage + 1} de {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage >= totalPages - 1 || isPending}
              aria-label="Página siguiente"
            >
              Siguiente
              <ChevronRight />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
