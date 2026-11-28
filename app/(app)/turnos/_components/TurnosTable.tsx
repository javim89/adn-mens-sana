'use client';

import { useEffect, useRef, useState, useTransition, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Plus, Pencil, Search, ChevronLeft, ChevronRight, MapPin, Users } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { EncabezadoPagina } from '@/app/components/ui/encabezado-pagina';
import { FiltroChip } from '@/app/components/ui/filtro-chip';
import { Input } from '@/app/components/ui/input';
import { LayoutConLateral } from '@/app/components/ui/layout-con-lateral';
import { Panel } from '@/app/components/ui/panel';
import { sumarDiasClave } from '@/lib/utils/fecha';
import type { TurnoDeportistaItem, TurnoListItem } from '@/lib/types/turnos';
import TileFecha from '../../dashboard/_components/TileFecha';
import { ACENTOS } from '../../dashboard/_lib/acentos';
import { diaYMesCortoDb, rangoSemana } from '../../dashboard/_lib/formato';
import { diaDelTile, resumenCategorias } from '../_lib/formato';
import DeleteTurnoModal from './DeleteTurnoModal';
import TurnosPorProfesional, { type ProfesionalConTurnos } from './TurnosPorProfesional';

export interface TurnoFila extends TurnoListItem {
  deportistas: (TurnoDeportistaItem & { categoria?: { id: string; nombre: string } | null })[];
}

export type VistaTurnos = 'lista' | 'profesional';

interface ProfesionalOption {
  id: string;
  nombre: string;
}

interface Props {
  initialTurnos: TurnoFila[];
  total: number;
  page: number; // 0-based
  pageSize: number;
  isAdmin: boolean;
  profesionales: ProfesionalOption[];
  currentArea: string;
  currentSearch: string;
  /** Semana mostrada (lunes y domingo, `'YYYY-MM-DD'`); `null` = "Todos". */
  semana?: { desdeClave: string; hastaClave: string } | null;
  vista?: VistaTurnos;
  porProfesional?: ProfesionalConTurnos[];
  lateral?: ReactNode;
}

function cortoDeClave(clave: string): string {
  return diaYMesCortoDb(new Date(`${clave}T00:00:00.000Z`));
}

function nombresDeportistas(t: TurnoFila): string {
  return t.deportistas.map((d) => `${d.apellido}, ${d.nombre}`).join(', ');
}

export default function TurnosTable({
  initialTurnos,
  total,
  page,
  pageSize,
  isAdmin,
  profesionales,
  currentArea,
  currentSearch,
  semana = null,
  vista = 'lista',
  porProfesional = [],
  lateral,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // Se sincroniza con la URL sin useEffect: si `currentSearch` cambia por navegación
  // externa, se resetea el estado local durante el render.
  const [searchInput, setSearchInput] = useState(currentSearch);
  const [lastSyncedSearch, setLastSyncedSearch] = useState(currentSearch);
  if (currentSearch !== lastSyncedSearch) {
    setLastSyncedSearch(currentSearch);
    setSearchInput(currentSearch);
  }
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const turnos = initialTurnos;
  const porProfesionalVista = isAdmin && vista === 'profesional';

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, totalPages - 1);

  function buildUrl(updates: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams?.toString() ?? '');
    for (const [key, value] of Object.entries(updates)) {
      if (value === null || value === '') params.delete(key);
      else params.set(key, value);
    }
    const qs = params.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  }

  function navigate(url: string, replace = false) {
    startTransition(() => {
      if (replace) router.replace(url);
      else router.push(url);
    });
  }

  function handleAreaChange(value: string | null) {
    navigate(buildUrl({ area: value, page: null }));
  }

  function handleSearchChange(value: string) {
    setSearchInput(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      navigate(buildUrl({ q: value.trim() || null, page: null }), true);
    }, 350);
  }

  function irASemana(desplazamiento: number) {
    if (!semana) return;
    navigate(buildUrl({ semana: sumarDiasClave(semana.desdeClave, desplazamiento), page: null }));
  }

  function toggleTodos() {
    navigate(buildUrl({ semana: semana ? 'todos' : null, page: null }));
  }

  function cambiarVista(v: VistaTurnos) {
    navigate(buildUrl({ vista: v === 'profesional' ? 'profesional' : null, page: null }));
  }

  function goToPage(target: number) {
    const clamped = Math.max(0, Math.min(target, totalPages - 1));
    navigate(buildUrl({ page: clamped === 0 ? null : String(clamped) }));
  }

  function handleDeleted() {
    startTransition(() => router.refresh());
  }

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const from = total === 0 ? 0 : currentPage * pageSize + 1;
  const to = Math.min(total, currentPage * pageSize + turnos.length);
  const eligioSemana = Boolean(searchParams?.get('semana')) && semana !== null;

  const contador = porProfesionalVista
    ? porProfesional.reduce((acc, p) => acc + p.cantidad, 0)
    : total;

  const vacio = (
    <>
      {semana ? 'No hay turnos en esta semana.' : 'No hay turnos cargados.'}{' '}
      <Link href="/turnos/nuevo" className="text-primario underline hover:no-underline">
        Crear uno
      </Link>
    </>
  );

  const lista = (
    <>
      <Panel
        relleno={false}
        className={`overflow-hidden transition-opacity ${isPending ? 'opacity-60' : ''}`}
      >
        {/* Cards: debajo de lg */}
        <ul className="lg:hidden divide-y divide-border">
          {turnos.length === 0 ? (
            <li className="px-4 py-12 text-center text-sm text-muted-foreground">{vacio}</li>
          ) : (
            turnos.map((t) => (
              <li key={t.id} className="flex items-start gap-3 px-4 py-4">
                <TileFecha arriba={diaDelTile(t.fecha)} abajo={t.hora} fondo={ACENTOS.turnos.tileFecha} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">{t.titulo}</p>
                  <p className="truncate text-xs text-muted-foreground">{t.profesionalNombre}</p>
                  <p className="mt-1 flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="size-3.5 shrink-0" aria-hidden />
                    <span className="truncate">{t.lugar}</span>
                  </p>
                  <p
                    className="flex min-w-0 items-center gap-1 text-xs text-muted-foreground"
                    title={nombresDeportistas(t)}
                  >
                    <Users className="size-3.5 shrink-0" aria-hidden />
                    <span className="truncate">{resumenCategorias(t.deportistas)}</span>
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Link
                    href={`/turnos/${t.id}/editar`}
                    className="text-muted-foreground hover:text-primario transition-colors p-1"
                    title="Editar turno"
                  >
                    <Pencil size={15} />
                  </Link>
                  <DeleteTurnoModal turnoId={t.id} turnoTitulo={t.titulo} onDeleted={handleDeleted} />
                </div>
              </li>
            ))
          )}
        </ul>

        {/* Tabla: lg+ */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-xs uppercase text-muted-foreground bg-muted border-b border-border">
                <th className="px-5 py-3 text-left">Fecha</th>
                <th className="px-5 py-3 text-left">Turno</th>
                <th className="px-5 py-3 text-left">Lugar</th>
                <th className="px-5 py-3 text-left">Deportista/s</th>
                <th className="hidden xl:table-cell px-5 py-3 text-left">Descripción</th>
                <th className="px-5 py-3">
                  <span className="sr-only">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {turnos.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-sm text-muted-foreground">
                    {vacio}
                  </td>
                </tr>
              ) : (
                turnos.map((t) => (
                  <tr key={t.id} className="border-b border-border last:border-0 hover:bg-muted transition-colors">
                    <td className="px-5 py-3">
                      <TileFecha arriba={diaDelTile(t.fecha)} abajo={t.hora} fondo={ACENTOS.turnos.tileFecha} />
                    </td>
                    <td className="px-5 py-3 max-w-[220px]">
                      <p className="truncate text-sm font-semibold text-foreground" title={t.titulo}>
                        {t.titulo}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">{t.profesionalNombre}</p>
                    </td>
                    <td className="px-5 py-3 text-sm text-foreground max-w-[160px]">
                      <span className="block truncate" title={t.lugar}>
                        {t.lugar}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-sm text-foreground max-w-[220px]">
                      <span className="block truncate" title={nombresDeportistas(t)}>
                        {resumenCategorias(t.deportistas)}
                      </span>
                    </td>
                    <td className="hidden xl:table-cell px-5 py-3 text-sm text-muted-foreground max-w-[200px]">
                      {t.descripcion ? (
                        <span className="block truncate" title={t.descripcion}>
                          {t.descripcion}
                        </span>
                      ) : (
                        <span aria-hidden>—</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <Link
                          href={`/turnos/${t.id}/editar`}
                          className="text-muted-foreground hover:text-primario transition-colors p-1"
                          title="Editar turno"
                        >
                          <Pencil size={15} />
                        </Link>
                        <DeleteTurnoModal turnoId={t.id} turnoTitulo={t.titulo} onDeleted={handleDeleted} />
                      </div>
                    </td>
                  </tr>
                ))
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
    </>
  );

  return (
    <div className="flex flex-col gap-4">
      <EncabezadoPagina
        titulo="Turnos"
        contador={contador > 0 ? contador : undefined}
        contadorLabel={`${contador} ${contador === 1 ? 'turno' : 'turnos'}`}
        subtitulo={
          semana ? `Semana ${rangoSemana(semana.desdeClave, semana.hastaClave)}` : 'Todos los turnos'
        }
        accion={
          <Button asChild>
            <Link href="/turnos/nuevo">
              <Plus />
              Nuevo turno
            </Link>
          </Button>
        }
      >
        <div className="flex flex-wrap items-center gap-2">
          <div
            role="group"
            aria-label="Semana"
            className="inline-flex h-9 items-center rounded-full border border-border bg-background"
          >
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full"
              onClick={() => irASemana(-7)}
              disabled={!semana || isPending}
              aria-label="Semana anterior"
            >
              <ChevronLeft />
            </Button>
            <span className="px-1 text-sm font-medium text-foreground whitespace-nowrap tabular-nums">
              {semana ? `${cortoDeClave(semana.desdeClave)} – ${cortoDeClave(semana.hastaClave)}` : 'Todas las fechas'}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full"
              onClick={() => irASemana(7)}
              disabled={!semana || isPending}
              aria-label="Semana siguiente"
            >
              <ChevronRight />
            </Button>
          </div>
          {eligioSemana && (
            <Button
              variant="outline"
              size="sm"
              className="h-9 rounded-full"
              onClick={() => navigate(buildUrl({ semana: null, page: null }))}
            >
              Esta semana
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            aria-pressed={!semana}
            onClick={toggleTodos}
            className={`h-9 rounded-full ${semana ? '' : 'border-primario/30 bg-primario-suave text-primario'}`}
          >
            Todos
          </Button>

          {!porProfesionalVista && (
            <>
              <div className="relative min-w-[180px] flex-1">
                <Search
                  size={14}
                  aria-hidden
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  type="search"
                  value={searchInput}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  placeholder="Buscar por título, lugar o deportista..."
                  aria-label="Buscar turnos"
                  className="pl-8 bg-background"
                />
              </div>
              {isAdmin && profesionales.length > 0 && (
                <FiltroChip
                  label="Profesional"
                  todosLabel="Todos los profesionales"
                  buscar
                  opciones={profesionales.map((p) => ({ value: p.id, label: p.nombre }))}
                  valor={currentArea || null}
                  onChange={handleAreaChange}
                />
              )}
            </>
          )}

          {isAdmin && (
            <div role="group" aria-label="Vista" className="inline-flex rounded-full border border-border bg-background p-0.5">
              {(['lista', 'profesional'] as const).map((v) => {
                const activa = (porProfesionalVista ? 'profesional' : 'lista') === v;
                return (
                  <Button
                    key={v}
                    variant="ghost"
                    size="sm"
                    aria-pressed={activa}
                    onClick={() => cambiarVista(v)}
                    className={`rounded-full ${
                      activa ? 'bg-primario-suave text-primario hover:bg-primario-suave' : 'text-muted-foreground'
                    }`}
                  >
                    {v === 'lista' ? 'Lista' : 'Por profesional'}
                  </Button>
                );
              })}
            </div>
          )}
        </div>
      </EncabezadoPagina>

      <LayoutConLateral lateral={lateral} lateralLabel="Próximos turnos">
        {porProfesionalVista ? (
          <TurnosPorProfesional
            profesionales={porProfesional}
            hrefDe={(id) => buildUrl({ area: id, vista: null, page: null })}
          />
        ) : (
          lista
        )}
      </LayoutConLateral>
    </div>
  );
}
