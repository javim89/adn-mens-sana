'use client';

import { useState, useTransition, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Search, CheckCheck } from 'lucide-react';
import { CustomSelect } from '@/app/components/ui/custom-select';
import {
  createEntrenamiento,
  updateEntrenamiento,
  getDeportistasParaAsistenciaAction,
} from '@/lib/actions/presentismo';
import { TIPO_SESION_LABELS } from '@/lib/utils/asistencia';
import type {
  EntrenamientoFormData,
  Entrenador,
  EstadoAsistencia,
  TipoSesion,
} from '@/lib/types/presentismo';
import type { DisciplinaConCategorias } from '@/lib/queries/disciplinas';
import AsistenciaEstadoControl from './AsistenciaEstadoControl';

interface RosterItem {
  id: string;
  nombre: string;
  apellido: string;
}

interface Props {
  mode: 'create' | 'edit';
  isAdmin: boolean;
  entrenadores: Entrenador[];
  currentEntrenadorNombre: string;
  disciplinas: DisciplinaConCategorias[];
  initialData?: EntrenamientoFormData & {
    id: string;
    roster: RosterItem[];
  };
}

function buildSchema(isAdmin: boolean) {
  return z
    .object({
      entrenadorId: z.string().optional(),
      fecha: z.string().min(1, 'La fecha es requerida'),
      tipoSesion: z.string().min(1, 'El tipo de sesión es requerido'),
      objetivos: z.string().optional(),
      disciplinaId: z.string().min(1, 'La disciplina es requerida'),
      categoriaId: z.string().min(1, 'La categoría es requerida'),
    })
    .superRefine((data, ctx) => {
      if (isAdmin && !data.entrenadorId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'El entrenador es requerido',
          path: ['entrenadorId'],
        });
      }
    });
}

type FormValues = {
  entrenadorId?: string;
  fecha: string;
  tipoSesion: string;
  objetivos?: string;
  disciplinaId: string;
  categoriaId: string;
};

const TIPO_SESION_OPTIONS = Object.entries(TIPO_SESION_LABELS).map(([value, label]) => ({
  value,
  label,
}));

function today() {
  return new Date().toISOString().split('T')[0];
}

export default function PresentismoForm({
  mode,
  isAdmin,
  entrenadores,
  currentEntrenadorNombre,
  disciplinas,
  initialData,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isLoadingRoster, startRosterTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const [rosterError, setRosterError] = useState<string | null>(null);

  const [roster, setRoster] = useState<RosterItem[]>(initialData?.roster ?? []);
  const [estados, setEstados] = useState<Record<string, EstadoAsistencia>>(() => {
    if (!initialData) return {};
    return Object.fromEntries(
      initialData.asistencias.map((a) => [a.deportistaId, a.estado]),
    );
  });
  const [rosterSearch, setRosterSearch] = useState('');

  const schema = useMemo(() => buildSchema(isAdmin), [isAdmin]);

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      entrenadorId: initialData?.entrenadorId ?? '',
      fecha: initialData?.fecha ?? (mode === 'create' ? today() : ''),
      tipoSesion: initialData?.tipoSesion ?? '',
      objetivos: initialData?.objetivos ?? '',
      disciplinaId: initialData?.disciplinaId ?? '',
      categoriaId: initialData?.categoriaId ?? '',
    },
  });

  const disciplinaId = watch('disciplinaId');
  const categoriaId = watch('categoriaId');

  const categorias = useMemo(
    () => disciplinas.find((d) => d.id === disciplinaId)?.categorias ?? [],
    [disciplinas, disciplinaId],
  );

  // Cargar plantel cuando disciplina + categoría estén ambos seteados.
  // En edit mode el roster ya viene precargado desde initialData; solo recargamos
  // cuando el usuario cambia la selección.
  const initialDisciplinaId = initialData?.disciplinaId ?? '';
  const initialCategoriaId = initialData?.categoriaId ?? '';

  useEffect(() => {
    if (!disciplinaId || !categoriaId) {
      setRoster([]);
      return;
    }
    // No recargar si es la selección inicial de edit (ya tenemos roster + estados).
    if (
      mode === 'edit' &&
      disciplinaId === initialDisciplinaId &&
      categoriaId === initialCategoriaId
    ) {
      return;
    }
    startRosterTransition(async () => {
      const deportistas = await getDeportistasParaAsistenciaAction(disciplinaId, categoriaId);
      setRoster(deportistas);
      setEstados((prev) => {
        const next: Record<string, EstadoAsistencia> = {};
        for (const d of deportistas) {
          next[d.id] = prev[d.id] ?? 'PRESENTE';
        }
        return next;
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disciplinaId, categoriaId]);

  function handleDisciplinaChange(value: string) {
    setValue('disciplinaId', value, { shouldValidate: true });
    setValue('categoriaId', '', { shouldValidate: false });
  }

  function setEstado(deportistaId: string, estado: EstadoAsistencia) {
    setEstados((prev) => ({ ...prev, [deportistaId]: estado }));
  }

  function marcarTodosPresentes() {
    setEstados((prev) => {
      const next = { ...prev };
      for (const d of roster) next[d.id] = 'PRESENTE';
      return next;
    });
  }

  const counts = useMemo(() => {
    const c = { PRESENTE: 0, AUSENTE: 0, LLEGO_TARDE: 0, SE_RETIRO_ANTES: 0 };
    for (const d of roster) {
      const estado = estados[d.id] ?? 'PRESENTE';
      c[estado]++;
    }
    return c;
  }, [roster, estados]);

  const filteredRoster = useMemo(() => {
    const q = rosterSearch.trim().toLowerCase();
    if (!q) return roster;
    return roster.filter((d) =>
      `${d.apellido} ${d.nombre}`.toLowerCase().includes(q),
    );
  }, [roster, rosterSearch]);

  function onSubmit(values: FormValues) {
    setServerError(null);
    setRosterError(null);

    if (roster.length === 0) {
      setRosterError('Debe seleccionar disciplina y categoría con deportistas activos.');
      return;
    }

    const data: EntrenamientoFormData = {
      fecha: values.fecha,
      entrenadorId: isAdmin ? values.entrenadorId : undefined,
      tipoSesion: values.tipoSesion as TipoSesion,
      objetivos: values.objetivos?.trim() || undefined,
      disciplinaId: values.disciplinaId,
      categoriaId: values.categoriaId,
      asistencias: roster.map((d) => ({
        deportistaId: d.id,
        estado: estados[d.id] ?? 'PRESENTE',
      })),
    };

    startTransition(async () => {
      const result =
        mode === 'create'
          ? await createEntrenamiento(data)
          : await updateEntrenamiento(initialData!.id, data);

      if (!result.success) {
        setServerError(result.error);
        return;
      }
      router.push('/presentismo');
    });
  }

  const bothSelected = !!disciplinaId && !!categoriaId;

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="max-w-3xl mx-auto pb-24">
      {serverError && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {serverError}
        </div>
      )}

      {/* Card 1 — Datos del entrenamiento */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 space-y-5">
        <h2
          className="text-lg font-semibold text-[#121A61]"
          style={{ fontFamily: 'Oswald, sans-serif' }}
        >
          Datos del entrenamiento
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-[#1C1C1C] mb-1.5">
              Fecha <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              {...register('fecha')}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3346CC]/30 aria-[invalid=true]:border-red-400"
              aria-invalid={errors.fecha ? 'true' : 'false'}
            />
            {errors.fecha && (
              <p className="mt-1 text-xs text-red-600">{errors.fecha.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-[#1C1C1C] mb-1.5">
              Entrenador {isAdmin && <span className="text-red-500">*</span>}
            </label>
            {isAdmin ? (
              <>
                <Controller
                  name="entrenadorId"
                  control={control}
                  render={({ field }) => (
                    <CustomSelect
                      value={field.value ?? ''}
                      onChange={field.onChange}
                      searchable
                      placeholder="Seleccionar entrenador..."
                      options={entrenadores.map((e) => ({
                        value: e.id,
                        label: `${e.apellido} ${e.nombre}`.trim() || e.id,
                      }))}
                    />
                  )}
                />
                {errors.entrenadorId && (
                  <p className="mt-1 text-xs text-red-600">{errors.entrenadorId.message}</p>
                )}
              </>
            ) : (
              <p className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-[#F3F4F6] text-[#1C1C1C]">
                {currentEntrenadorNombre}
              </p>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-[#1C1C1C] mb-1.5">
            Tipo de sesión <span className="text-red-500">*</span>
          </label>
          <Controller
            name="tipoSesion"
            control={control}
            render={({ field }) => (
              <CustomSelect
                value={field.value ?? ''}
                onChange={field.onChange}
                placeholder="Seleccionar tipo..."
                options={TIPO_SESION_OPTIONS}
              />
            )}
          />
          {errors.tipoSesion && (
            <p className="mt-1 text-xs text-red-600">{errors.tipoSesion.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-[#1C1C1C] mb-1.5">Objetivos</label>
          <textarea
            {...register('objetivos')}
            rows={3}
            placeholder="Objetivos de la sesión..."
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-[#3346CC]/30"
          />
        </div>
      </div>

      {/* Card 2 — Presentismo */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 space-y-5 mt-5">
        <h2
          className="text-lg font-semibold text-[#121A61]"
          style={{ fontFamily: 'Oswald, sans-serif' }}
        >
          Presentismo
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-[#1C1C1C] mb-1.5">
              Disciplina <span className="text-red-500">*</span>
            </label>
            <Controller
              name="disciplinaId"
              control={control}
              render={({ field }) => (
                <CustomSelect
                  value={field.value ?? ''}
                  onChange={handleDisciplinaChange}
                  searchable
                  placeholder="Seleccionar disciplina..."
                  options={disciplinas.map((d) => ({ value: d.id, label: d.nombre }))}
                />
              )}
            />
            {errors.disciplinaId && (
              <p className="mt-1 text-xs text-red-600">{errors.disciplinaId.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-[#1C1C1C] mb-1.5">
              Categoría <span className="text-red-500">*</span>
            </label>
            <Controller
              name="categoriaId"
              control={control}
              render={({ field }) => (
                <CustomSelect
                  value={field.value ?? ''}
                  onChange={field.onChange}
                  searchable
                  disabled={!disciplinaId}
                  placeholder="Seleccionar categoría..."
                  options={categorias.map((c) => ({ value: c.id, label: c.nombre }))}
                />
              )}
            />
            {errors.categoriaId && (
              <p className="mt-1 text-xs text-red-600">{errors.categoriaId.message}</p>
            )}
          </div>
        </div>

        {rosterError && (
          <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {rosterError}
          </div>
        )}

        {!bothSelected ? (
          <div className="px-4 py-10 text-center text-sm text-[#6B7280] bg-[#F9FAFB] border border-dashed border-gray-200 rounded-lg">
            Seleccioná disciplina y categoría para cargar el plantel.
          </div>
        ) : isLoadingRoster ? (
          <div className="px-4 py-10 text-center text-sm text-[#6B7280] flex items-center justify-center gap-2">
            <Loader2 size={16} className="animate-spin" />
            Cargando plantel...
          </div>
        ) : roster.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-[#6B7280] bg-[#F9FAFB] border border-dashed border-gray-200 rounded-lg">
            No hay deportistas activos en esta disciplina y categoría.
          </div>
        ) : (
          <>
            {/* Summary counter bar */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="inline-flex items-center gap-1 font-medium bg-green-100 text-green-700 px-2.5 py-1 rounded-full">
                Presentes {counts.PRESENTE}
              </span>
              <span className="inline-flex items-center gap-1 font-medium bg-red-100 text-red-700 px-2.5 py-1 rounded-full">
                Ausentes {counts.AUSENTE}
              </span>
              <span className="inline-flex items-center gap-1 font-medium bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full">
                Tarde {counts.LLEGO_TARDE}
              </span>
              <span className="inline-flex items-center gap-1 font-medium bg-gray-100 text-[#6B7280] px-2.5 py-1 rounded-full">
                Se retiró {counts.SE_RETIRO_ANTES}
              </span>
            </div>

            {/* Actions: marcar todos + buscador */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={marcarTodosPresentes}
                className="flex items-center justify-center gap-1.5 text-sm text-[#121A61] border border-gray-200 rounded-lg px-3 py-2 hover:bg-[#F3F4F6] transition-colors shrink-0"
              >
                <CheckCheck size={15} />
                Marcar todos presentes
              </button>
              <div className="relative flex-1">
                <Search
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7280]"
                />
                <input
                  type="text"
                  value={rosterSearch}
                  onChange={(e) => setRosterSearch(e.target.value)}
                  placeholder="Buscar deportista..."
                  className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3346CC]/30"
                />
              </div>
            </div>

            {/* Roster list */}
            <ul className="divide-y divide-gray-100 border border-gray-100 rounded-lg overflow-hidden">
              {filteredRoster.length === 0 ? (
                <li className="px-4 py-8 text-center text-sm text-[#6B7280]">
                  Sin resultados para la búsqueda.
                </li>
              ) : (
                filteredRoster.map((d) => (
                  <li
                    key={d.id}
                    className="px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
                  >
                    <span className="text-sm font-medium text-[#1C1C1C]">
                      {d.apellido}, {d.nombre}
                    </span>
                    <AsistenciaEstadoControl
                      value={estados[d.id] ?? 'PRESENTE'}
                      onChange={(estado) => setEstado(d.id, estado)}
                    />
                  </li>
                ))
              )}
            </ul>
          </>
        )}
      </div>

      {/* Sticky bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => router.push('/presentismo')}
            disabled={isPending}
            className="text-sm text-[#6B7280] hover:text-[#1C1C1C] border border-gray-200 rounded-lg px-4 py-2 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="flex items-center gap-2 bg-[#121A61] text-white text-sm font-medium px-5 py-2 rounded-lg hover:bg-[#1E2A8A] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isPending ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                {mode === 'create' ? 'Guardando...' : 'Actualizando...'}
              </>
            ) : mode === 'create' ? (
              'Guardar entrenamiento'
            ) : (
              'Actualizar entrenamiento'
            )}
          </button>
        </div>
      </div>
    </form>
  );
}
