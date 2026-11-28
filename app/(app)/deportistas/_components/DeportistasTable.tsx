'use client';

import { useCallback, useState, useTransition, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Eye, Plus, Search, X } from 'lucide-react';
import { Avatar } from '@/app/components/ui/avatar';
import { Button } from '@/app/components/ui/button';
import { EncabezadoPagina } from '@/app/components/ui/encabezado-pagina';
import { FiltroChip } from '@/app/components/ui/filtro-chip';
import { Input } from '@/app/components/ui/input';
import { LayoutConLateral } from '@/app/components/ui/layout-con-lateral';
import { Panel } from '@/app/components/ui/panel';
import { fetchDeportistas, fetchDisciplinas } from '@/lib/api/deportistas';
import type { DeportistaListAttributes, FetchDeportistasParams } from '@/lib/api/deportistas';
import {
  ESTADO_BADGE,
  ESTADO_LABELS,
  NIVEL_TRIAGE_BADGE,
  NIVEL_TRIAGE_LABELS,
} from '@/lib/utils/enum-labels';
import { EstadoDeportista, NivelTriage } from '@/lib/generated/prisma/enums';
import VistaRapidaPanel, { type DeportistaSeleccionado } from './VistaRapidaPanel';

const BADGE = 'inline-flex w-fit items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap';

const OPCIONES_TRIAGE = [
  ...Object.values(NivelTriage).map((n) => ({ value: n, label: NIVEL_TRIAGE_LABELS[n] })),
  { value: 'SIN_CALCULAR', label: 'Sin calcular' },
];

const OPCIONES_ESTADO = Object.values(EstadoDeportista).map((e) => ({
  value: e,
  label: ESTADO_LABELS[e],
}));

type FiltroUrl =
  | 'filter[search]'
  | 'filter[disciplina]'
  | 'filter[categoriaId]'
  | 'filter[estado]'
  | 'filter[nivelTriage]'
  | 'page[number]';

function iniciales(a: DeportistaListAttributes): string {
  return `${a.nombre.charAt(0)}${a.apellido.charAt(0)}`;
}

function EstadoBadge({ estado }: { estado: EstadoDeportista }) {
  return (
    <span className={`${BADGE} ${ESTADO_BADGE[estado] ?? 'bg-gray-100 text-muted-foreground'}`}>
      {ESTADO_LABELS[estado]}
    </span>
  );
}

function TriageBadge({ nivel }: { nivel: NivelTriage | null }) {
  if (!nivel) return <span className="text-sm text-muted-foreground">—</span>;
  return <span className={`${BADGE} ${NIVEL_TRIAGE_BADGE[nivel]}`}>{NIVEL_TRIAGE_LABELS[nivel]}</span>;
}

export default function DeportistasTable({
  canCreate = true,
  lateral,
}: {
  canCreate?: boolean;
  lateral?: ReactNode;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const pageNumber = Number(searchParams.get('page[number]') ?? '1');
  const pageSize = Number(searchParams.get('page[size]') ?? '20');
  const filterSearch = searchParams.get('filter[search]') ?? '';
  const filterDisciplina = searchParams.get('filter[disciplina]') ?? '';
  const filterCategoria = searchParams.get('filter[categoriaId]') ?? '';
  const filterEstado = searchParams.get('filter[estado]') ?? '';
  const filterNivelTriage = searchParams.get('filter[nivelTriage]') ?? '';

  const [localSearch, setLocalSearch] = useState(filterSearch);
  const [seleccionado, setSeleccionado] = useState<DeportistaSeleccionado | null>(null);

  const queryParams: FetchDeportistasParams = {
    'page[number]': pageNumber,
    'page[size]': pageSize,
    ...(filterSearch ? { 'filter[search]': filterSearch } : {}),
    ...(filterDisciplina ? { 'filter[disciplina]': filterDisciplina } : {}),
    ...(filterCategoria ? { 'filter[categoriaId]': filterCategoria } : {}),
    ...(filterEstado ? { 'filter[estado]': filterEstado } : {}),
    ...(filterNivelTriage ? { 'filter[nivelTriage]': filterNivelTriage } : {}),
  };

  const { data, isLoading, isError } = useQuery({
    queryKey: ['deportistas', queryParams],
    queryFn: () => fetchDeportistas(queryParams),
  });

  const { data: disciplinas = [] } = useQuery({
    queryKey: ['disciplinas'],
    queryFn: fetchDisciplinas,
    staleTime: Infinity,
  });

  const categoriasFiltro =
    disciplinas.find((d) => d.id === filterDisciplina)?.categorias ?? [];

  const deportistas = data?.data ?? [];
  const total = data?.meta.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (pageNumber - 1) * pageSize + 1;
  const to = Math.min(total, (pageNumber - 1) * pageSize + deportistas.length);

  const hasFilters = !!(
    filterSearch ||
    filterDisciplina ||
    filterCategoria ||
    filterEstado ||
    filterNivelTriage
  );

  const pushFilters = useCallback(
    (overrides: Partial<Record<FiltroUrl, string | undefined>>) => {
      const params = new URLSearchParams();
      const merged: Record<FiltroUrl, string | undefined> = {
        'filter[search]': filterSearch,
        'filter[disciplina]': filterDisciplina,
        'filter[categoriaId]': filterCategoria,
        'filter[estado]': filterEstado,
        'filter[nivelTriage]': filterNivelTriage,
        'page[number]': String(pageNumber),
        ...overrides,
      };
      for (const clave of [
        'filter[search]',
        'filter[disciplina]',
        'filter[categoriaId]',
        'filter[estado]',
        'filter[nivelTriage]',
      ] as const) {
        const valor = merged[clave];
        if (valor) params.set(clave, valor);
      }
      params.set('page[number]', merged['page[number]'] ?? '1');
      params.set('page[size]', String(pageSize));
      startTransition(() => {
        router.push('/deportistas?' + params.toString());
      });
    },
    [
      filterSearch,
      filterDisciplina,
      filterCategoria,
      filterEstado,
      filterNivelTriage,
      pageNumber,
      pageSize,
      router,
    ],
  );

  function handleSearchKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      pushFilters({ 'filter[search]': localSearch, 'page[number]': '1' });
    }
  }

  function handleClear() {
    setLocalSearch('');
    startTransition(() => {
      router.push('/deportistas');
    });
  }

  function seleccionar(id: string, a: DeportistaListAttributes) {
    setSeleccionado({
      id,
      nombre: a.nombre,
      apellido: a.apellido,
      disciplina: a.disciplina?.nombre ?? null,
      categoria: a.categoria?.nombre ?? null,
      nivelTriage: a.nivelTriage,
      fotoUrl: a.fotoUrl,
    });
  }

  const vacio = (
    <>
      No se encontraron deportistas
      {hasFilters && (
        <button
          type="button"
          onClick={handleClear}
          className="ml-2 text-primario underline hover:no-underline"
        >
          Limpiar filtros
        </button>
      )}
    </>
  );

  return (
    <div className="flex flex-col gap-6">
      <EncabezadoPagina
        titulo="Deportistas"
        contador={total > 0 ? total : undefined}
        contadorLabel={`${total} ${total === 1 ? 'deportista' : 'deportistas'}`}
        subtitulo="Gestión del plantel deportivo"
        accion={
          canCreate && (
            <Button asChild>
              <Link href="/deportistas/nuevo">
                <Plus aria-hidden />
                Nuevo deportista
              </Link>
            </Button>
          )
        }
      >
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-full sm:w-72">
            <Search
              aria-hidden
              className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              type="search"
              aria-label="Buscar deportistas"
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder="Buscar por nombre, apellido o DNI..."
              className="h-9 rounded-full bg-background pl-9"
            />
          </div>
          <FiltroChip
            label="Triage"
            opciones={OPCIONES_TRIAGE}
            valor={filterNivelTriage || null}
            onChange={(v) => pushFilters({ 'filter[nivelTriage]': v ?? undefined, 'page[number]': '1' })}
          />
          <FiltroChip
            label="Estado"
            opciones={OPCIONES_ESTADO}
            valor={filterEstado || null}
            onChange={(v) => pushFilters({ 'filter[estado]': v ?? undefined, 'page[number]': '1' })}
          />
          <FiltroChip
            label="Disciplina"
            todosLabel="Todas"
            buscar
            opciones={disciplinas.map((d) => ({ value: d.id, label: d.nombre }))}
            valor={filterDisciplina || null}
            onChange={(v) =>
              pushFilters({
                'filter[disciplina]': v ?? undefined,
                'filter[categoriaId]': undefined,
                'page[number]': '1',
              })
            }
          />
          <FiltroChip
            label="Categoría"
            todosLabel="Todas"
            buscar
            disabled={!filterDisciplina}
            opciones={categoriasFiltro.map((c) => ({ value: c.id, label: c.nombre }))}
            valor={filterCategoria || null}
            onChange={(v) => pushFilters({ 'filter[categoriaId]': v ?? undefined, 'page[number]': '1' })}
          />
          {hasFilters && (
            <Button type="button" variant="ghost" size="sm" onClick={handleClear} className="rounded-full">
              <X aria-hidden />
              Limpiar
            </Button>
          )}
        </div>
      </EncabezadoPagina>

      <LayoutConLateral
        lateralLabel="Resumen del plantel"
        lateral={
          <>
            {seleccionado && (
              <VistaRapidaPanel deportista={seleccionado} onCerrar={() => setSeleccionado(null)} />
            )}
            {lateral}
          </>
        }
      >
        <Panel
          relleno={false}
          className={`overflow-hidden ${isPending || isLoading ? 'pointer-events-none opacity-60' : ''}`}
        >
          {isError && (
            <div className="px-5 py-6 text-center text-sm text-red-600">
              Error al cargar los deportistas. Por favor, intentá de nuevo.
            </div>
          )}

          {!isError && (
            <ul className="divide-y divide-border lg:hidden">
              {deportistas.length === 0 && !isLoading ? (
                <li className="px-4 py-12 text-center text-sm text-muted-foreground">{vacio}</li>
              ) : (
                deportistas.map((item) => {
                  const a = item.attributes;
                  return (
                    <li key={item.id}>
                      <Link
                        href={`/deportistas/${item.id}`}
                        className="flex items-center gap-3 px-4 py-3 hover:bg-muted"
                      >
                        <Avatar
                          src={a.fotoUrl}
                          alt={`${a.apellido}, ${a.nombre}`}
                          iniciales={iniciales(a)}
                          className="size-9 text-xs"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-foreground">
                            {a.apellido}, {a.nombre}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {a.disciplina && <span>{a.disciplina.nombre}</span>}
                            {a.disciplina && a.categoria && ' · '}
                            {a.categoria && <span>{a.categoria.nombre}</span>}
                            {!a.disciplina && !a.categoria && `DNI ${a.dni}`}
                          </p>
                          <div className="mt-1.5 flex flex-wrap gap-1.5">
                            <EstadoBadge estado={a.estado} />
                            <TriageBadge nivel={a.nivelTriage} />
                          </div>
                        </div>
                        <ChevronRight aria-hidden className="size-4 shrink-0 text-muted-foreground" />
                      </Link>
                    </li>
                  );
                })
              )}
            </ul>
          )}

          {!isError && (
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted text-xs uppercase text-muted-foreground">
                    <th className="px-4 py-3 text-left font-medium">Nombre</th>
                    <th className="px-4 py-3 text-left font-medium">Categoría</th>
                    <th className="px-4 py-3 text-left font-medium">Triage</th>
                    <th className="px-4 py-3 text-left font-medium">Estado</th>
                    <th className="px-4 py-3 text-left font-medium">DNI</th>
                    <th className="px-4 py-3">
                      <span className="sr-only">Acciones</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {deportistas.length === 0 && !isLoading ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center text-sm text-muted-foreground">
                        {vacio}
                      </td>
                    </tr>
                  ) : (
                    deportistas.map((item) => {
                      const a = item.attributes;
                      const nombre = `${a.apellido}, ${a.nombre}`;
                      const activo = seleccionado?.id === item.id;
                      return (
                        <tr
                          key={item.id}
                          data-seleccionado={activo || undefined}
                          className={`border-b border-border last:border-0 transition-colors hover:bg-muted ${activo ? 'bg-primario-suave' : ''}`}
                        >
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-2.5">
                              <Avatar
                                src={a.fotoUrl}
                                alt={nombre}
                                iniciales={iniciales(a)}
                                className="size-8 text-xs"
                              />
                              <Link
                                href={`/deportistas/${item.id}`}
                                className="text-sm font-medium text-foreground hover:text-primario hover:underline"
                              >
                                {nombre}
                              </Link>
                            </div>
                          </td>
                          <td className="px-4 py-2.5">
                            <p className="text-sm text-foreground">{a.categoria?.nombre ?? '—'}</p>
                            {a.disciplina && (
                              <p className="text-xs text-muted-foreground">{a.disciplina.nombre}</p>
                            )}
                          </td>
                          <td className="px-4 py-2.5">
                            <TriageBadge nivel={a.nivelTriage} />
                          </td>
                          <td className="px-4 py-2.5">
                            <EstadoBadge estado={a.estado} />
                          </td>
                          <td className="px-4 py-2.5 font-mono text-xs tabular-nums text-muted-foreground">
                            {a.dni}
                          </td>
                          <td className="px-4 py-2.5">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="size-8"
                                aria-label={`Vista rápida de ${nombre}`}
                                aria-pressed={activo}
                                onClick={() => (activo ? setSeleccionado(null) : seleccionar(item.id, a))}
                              >
                                <Eye aria-hidden />
                              </Button>
                              <Link
                                href={`/deportistas/${item.id}`}
                                aria-label={`Ver ficha de ${nombre}`}
                                className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                              >
                                <ChevronRight aria-hidden className="size-4" />
                              </Link>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-muted px-4 py-3">
              <span className="text-xs text-muted-foreground">
                Mostrando {from}–{to} de {total}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={pageNumber <= 1}
                  onClick={() => pushFilters({ 'page[number]': String(pageNumber - 1) })}
                  aria-label="Página anterior"
                >
                  <ChevronLeft aria-hidden />
                  Anterior
                </Button>
                <span className="whitespace-nowrap text-xs text-muted-foreground">
                  Página {pageNumber} de {totalPages}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={pageNumber >= totalPages}
                  onClick={() => pushFilters({ 'page[number]': String(pageNumber + 1) })}
                  aria-label="Página siguiente"
                >
                  Siguiente
                  <ChevronRight aria-hidden />
                </Button>
              </div>
            </div>
          )}
        </Panel>
      </LayoutConLateral>
    </div>
  );
}
