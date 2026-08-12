'use client';

import { useState, useTransition, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Search, CheckCheck, CalendarX } from 'lucide-react';
import { CustomSelect } from '@/app/components/ui/custom-select';
import {
  createConvocatoria,
  updateConvocatoria,
  getProximoPartidoAction,
  getDeportistasParaConvocarAction,
} from '@/lib/actions/convocatorias';
import type {
  ConvocatoriaFormData,
  ProximoPartido,
  DeportistaConvocable,
} from '@/lib/types/convocatorias';
import type { DisciplinaConCategorias } from '@/lib/queries/disciplinas';

const ESTADO_LABELS: Record<string, string> = {
  PROGRAMADO: 'Programado',
  REPROGRAMADO: 'Reprogramado',
  SUSPENDIDO: 'Suspendido',
};

const ESTADO_STYLES: Record<string, string> = {
  PROGRAMADO: 'bg-green-100 text-green-700',
  REPROGRAMADO: 'bg-amber-100 text-amber-700',
  SUSPENDIDO: 'bg-red-100 text-red-700',
};

export interface ConvocatoriaInitialData {
  id: string;
  disciplinaId: string;
  categoriaId: string;
  eventoTorneoId: string;
  horaCitacion?: string;
  lugar?: string;
  observaciones?: string;
  convocados: string[];
  partido: ProximoPartido;
}

interface Props {
  mode: 'create' | 'edit';
  disciplinas: DisciplinaConCategorias[];
  initialData?: ConvocatoriaInitialData;
}

const schema = z.object({
  disciplinaId: z.string().min(1, 'La disciplina es requerida'),
  categoriaId: z.string().min(1, 'La categoría es requerida'),
  horaCitacion: z.string().optional(),
  lugar: z.string().optional(),
  observaciones: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

function formatDate(dateStr: string) {
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(dateStr + 'T00:00:00'));
}

export default function ConvocatoriaForm({ mode, disciplinas, initialData }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isLoadingPartido, startPartidoTransition] = useTransition();
  const [isLoadingRoster, startRosterTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);

  const [partido, setPartido] = useState<ProximoPartido | null>(
    initialData?.partido ?? null,
  );
  const [roster, setRoster] = useState<DeportistaConvocable[]>([]);
  const [citados, setCitados] = useState<Set<string>>(
    () => new Set(initialData?.convocados ?? []),
  );
  const [rosterSearch, setRosterSearch] = useState('');

  const {
    control,
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      disciplinaId: initialData?.disciplinaId ?? '',
      categoriaId: initialData?.categoriaId ?? '',
      horaCitacion: initialData?.horaCitacion ?? '',
      lugar: initialData?.lugar ?? '',
      observaciones: initialData?.observaciones ?? '',
    },
  });

  const disciplinaId = watch('disciplinaId');
  const categoriaId = watch('categoriaId');

  const categorias = useMemo(
    () => disciplinas.find((d) => d.id === disciplinaId)?.categorias ?? [],
    [disciplinas, disciplinaId],
  );

  const initialDisciplinaId = initialData?.disciplinaId ?? '';
  const initialCategoriaId = initialData?.categoriaId ?? '';

  // Buscar el próximo partido cuando disciplina + categoría estén elegidos.
  useEffect(() => {
    if (!disciplinaId || !categoriaId) {
      setPartido(null);
      return;
    }
    if (
      mode === 'edit' &&
      disciplinaId === initialDisciplinaId &&
      categoriaId === initialCategoriaId
    ) {
      setPartido(initialData?.partido ?? null);
      return;
    }
    startPartidoTransition(async () => {
      const p = await getProximoPartidoAction(disciplinaId, categoriaId);
      setPartido(p);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disciplinaId, categoriaId]);

  // Cargar plantel convocable cuando hay partido.
  useEffect(() => {
    if (!disciplinaId || !categoriaId || !partido) {
      setRoster([]);
      return;
    }
    startRosterTransition(async () => {
      const deportistas = await getDeportistasParaConvocarAction(
        disciplinaId,
        categoriaId,
      );
      setRoster(deportistas);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disciplinaId, categoriaId, partido?.eventoTorneoId]);

  function handleDisciplinaChange(value: string) {
    setValue('disciplinaId', value, { shouldValidate: true });
    setValue('categoriaId', '', { shouldValidate: false });
  }

  function toggleCitado(deportistaId: string) {
    setCitados((prev) => {
      const next = new Set(prev);
      if (next.has(deportistaId)) next.delete(deportistaId);
      else next.add(deportistaId);
      return next;
    });
  }

  const allSelected = roster.length > 0 && roster.every((d) => citados.has(d.id));

  function toggleAll() {
    setCitados((prev) => {
      if (allSelected) {
        const next = new Set(prev);
        for (const d of roster) next.delete(d.id);
        return next;
      }
      const next = new Set(prev);
      for (const d of roster) next.add(d.id);
      return next;
    });
  }

  const convocadosCount = useMemo(
    () => roster.filter((d) => citados.has(d.id)).length,
    [roster, citados],
  );

  const filteredRoster = useMemo(() => {
    const q = rosterSearch.trim().toLowerCase();
    if (!q) return roster;
    return roster.filter((d) =>
      `${d.apellido} ${d.nombre}`.toLowerCase().includes(q),
    );
  }, [roster, rosterSearch]);

  function onSubmit(values: FormValues) {
    setServerError(null);

    if (!partido) {
      setServerError('No hay próximo partido programado para esta categoría.');
      return;
    }

    const convocados = roster.filter((d) => citados.has(d.id)).map((d) => d.id);
    if (convocados.length === 0) {
      setServerError('Debe convocar al menos un deportista.');
      return;
    }

    const data: ConvocatoriaFormData = {
      eventoTorneoId: partido.eventoTorneoId,
      disciplinaId: values.disciplinaId,
      categoriaId: values.categoriaId,
      horaCitacion: values.horaCitacion?.trim() || undefined,
      lugar: values.lugar?.trim() || undefined,
      observaciones: values.observaciones?.trim() || undefined,
      convocados,
    };

    startTransition(async () => {
      const result =
        mode === 'create'
          ? await createConvocatoria(data)
          : await updateConvocatoria(initialData!.id, data);

      if (!result.success) {
        setServerError(result.error);
        return;
      }
      router.push('/convocatorias');
    });
  }

  const bothSelected = !!disciplinaId && !!categoriaId;
  const canSave = !!partido && convocadosCount > 0;

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="max-w-3xl mx-auto pb-24">
      {serverError && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {serverError}
        </div>
      )}

      {/* Card 1 — Partido */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 space-y-5">
        <h2
          className="text-lg font-semibold text-[#121A61]"
          style={{ fontFamily: 'Oswald, sans-serif' }}
        >
          Partido
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

        {!bothSelected ? (
          <div className="px-4 py-8 text-center text-sm text-[#6B7280] bg-[#F9FAFB] border border-dashed border-gray-200 rounded-lg">
            Seleccioná disciplina y categoría para buscar el próximo partido.
          </div>
        ) : isLoadingPartido ? (
          <div className="px-4 py-8 text-center text-sm text-[#6B7280] flex items-center justify-center gap-2">
            <Loader2 size={16} className="animate-spin" />
            Buscando próximo partido...
          </div>
        ) : partido ? (
          <div className="rounded-lg border border-gray-100 bg-[#F9FAFB] px-4 py-4">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <span className="text-xs font-medium uppercase tracking-wide text-[#6B7280]">
                Próximo partido
              </span>
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                  ESTADO_STYLES[partido.estado] ?? 'bg-gray-100 text-gray-700'
                }`}
              >
                {ESTADO_LABELS[partido.estado] ?? partido.estado}
              </span>
            </div>
            <p className="text-sm font-semibold text-[#1C1C1C]">
              {partido.local} vs {partido.visitante}
            </p>
            <p className="text-sm text-[#6B7280] mt-0.5">{formatDate(partido.fecha)}</p>
          </div>
        ) : (
          <div className="flex items-start gap-2 px-4 py-4 rounded-lg border border-amber-200 bg-amber-50 text-sm text-amber-800">
            <CalendarX size={16} className="shrink-0 mt-0.5" />
            No hay próximo partido programado para esta categoría.
          </div>
        )}
      </div>

      {/* Card 2 — Datos de la citación */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 space-y-5 mt-5">
        <h2
          className="text-lg font-semibold text-[#121A61]"
          style={{ fontFamily: 'Oswald, sans-serif' }}
        >
          Datos de la citación
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-[#1C1C1C] mb-1.5">
              Hora de citación
            </label>
            <input
              type="time"
              {...register('horaCitacion')}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3346CC]/30"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#1C1C1C] mb-1.5">
              Lugar / punto de encuentro
            </label>
            <input
              type="text"
              {...register('lugar')}
              placeholder="Ej: Sede central"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3346CC]/30"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-[#1C1C1C] mb-1.5">
            Observaciones
          </label>
          <textarea
            {...register('observaciones')}
            rows={3}
            placeholder="Indicaciones para el plantel..."
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-[#3346CC]/30"
          />
        </div>
      </div>

      {/* Card 3 — Plantel convocado */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 space-y-5 mt-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2
            className="text-lg font-semibold text-[#121A61]"
            style={{ fontFamily: 'Oswald, sans-serif' }}
          >
            Plantel convocado
          </h2>
          {partido && roster.length > 0 && (
            <span className="text-xs font-medium bg-gray-100 text-[#6B7280] px-2.5 py-1 rounded-full">
              Convocados: {convocadosCount} / {roster.length}
            </span>
          )}
        </div>

        {!partido ? (
          <div className="px-4 py-10 text-center text-sm text-[#6B7280] bg-[#F9FAFB] border border-dashed border-gray-200 rounded-lg">
            Elegí un partido para cargar el plantel convocable.
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
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={toggleAll}
                className="flex items-center justify-center gap-1.5 text-sm text-[#121A61] border border-gray-200 rounded-lg px-3 py-2 hover:bg-[#F3F4F6] transition-colors shrink-0"
              >
                <CheckCheck size={15} />
                {allSelected ? 'Deseleccionar todos' : 'Seleccionar todos'}
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

            <ul className="divide-y divide-gray-100 border border-gray-100 rounded-lg overflow-hidden">
              {filteredRoster.length === 0 ? (
                <li className="px-4 py-8 text-center text-sm text-[#6B7280]">
                  Sin resultados para la búsqueda.
                </li>
              ) : (
                filteredRoster.map((d) => (
                  <li key={d.id} className="px-4 py-3">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={citados.has(d.id)}
                        onChange={() => toggleCitado(d.id)}
                        className="h-4 w-4 rounded border-gray-300 text-[#121A61] focus:ring-[#3346CC]/30"
                      />
                      <span className="flex-1 min-w-0">
                        <span className="text-sm font-medium text-[#1C1C1C]">
                          {d.apellido}, {d.nombre}
                        </span>
                        {d.posicion && (
                          <span className="ml-2 text-xs text-[#6B7280]">{d.posicion}</span>
                        )}
                      </span>
                    </label>
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
            onClick={() => router.push('/convocatorias')}
            disabled={isPending}
            className="text-sm text-[#6B7280] hover:text-[#1C1C1C] border border-gray-200 rounded-lg px-4 py-2 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isPending || !canSave}
            className="flex items-center gap-2 bg-[#121A61] text-white text-sm font-medium px-5 py-2 rounded-lg hover:bg-[#1E2A8A] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isPending ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                {mode === 'create' ? 'Guardando...' : 'Actualizando...'}
              </>
            ) : mode === 'create' ? (
              'Guardar convocatoria'
            ) : (
              'Actualizar convocatoria'
            )}
          </button>
        </div>
      </div>
    </form>
  );
}
