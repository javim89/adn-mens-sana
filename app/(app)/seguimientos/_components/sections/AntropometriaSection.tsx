import type { UseFormRegister, UseFormWatch, FieldErrors } from 'react-hook-form';
import { Sparkles } from 'lucide-react';
import { computeAntropometriaSumatorias } from '@/lib/utils/antropometria';
import type { SeguimientoExtendedFormValues } from '../SeguimientoForm';

interface Props {
  register: UseFormRegister<SeguimientoExtendedFormValues>;
  watch: UseFormWatch<SeguimientoExtendedFormValues>;
  errors: FieldErrors<SeguimientoExtendedFormValues>;
}

const inputClass =
  'w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3346CC]/30';

const labelClass = 'block text-sm font-medium text-[#1C1C1C] mb-1.5';

const blockTitleClass = 'text-xs font-semibold uppercase text-[#6B7280] tracking-wide mb-3';

function NumericFieldWithSuffix({
  id,
  label,
  unidad,
  field,
  register,
  error,
}: {
  id: string;
  label: string;
  unidad: string;
  field: keyof SeguimientoExtendedFormValues;
  register: UseFormRegister<SeguimientoExtendedFormValues>;
  error?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className={labelClass}>
        {label}{' '}
        <span className="text-xs text-[#6B7280] font-normal">({unidad})</span>
      </label>
      <input
        id={id}
        type="number"
        min={0}
        step="0.1"
        {...register(field, { valueAsNumber: true })}
        className={inputClass}
        placeholder="0"
      />
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

function SumatoriaCard({
  label,
  value,
  suffix,
}: {
  label: string;
  value: number | null | undefined;
  suffix?: string;
}) {
  const hasValue = value !== null && value !== undefined && !Number.isNaN(value);
  return (
    <div className="rounded-lg border border-gray-100 bg-[#F3F4F6] px-4 py-3">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-[#6B7280]">{label}</span>
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-[#6B7280]">
          <Sparkles size={11} className="text-[#3346CC]" aria-hidden />
          auto
        </span>
      </div>
      <p className="font-mono text-2xl font-semibold leading-none text-[#121A61]">
        {hasValue ? value : <span className="text-[#6B7280]">—</span>}
        {hasValue && suffix ? (
          <span className="ml-1 text-sm font-normal text-[#6B7280]">{suffix}</span>
        ) : null}
      </p>
    </div>
  );
}

function toNumberOrUndefined(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

export function AntropometriaSection({ register, watch, errors }: Props) {
  const { imc, sumatoriaPliegues } = computeAntropometriaSumatorias({
    peso: toNumberOrUndefined(watch('antropometria_peso')),
    talla: toNumberOrUndefined(watch('antropometria_talla')),
    pliegueTriceps: toNumberOrUndefined(watch('antropometria_pliegueTriceps')),
    pliegueSubescapular: toNumberOrUndefined(watch('antropometria_pliegueSubescapular')),
    pliegueSupraespinal: toNumberOrUndefined(watch('antropometria_pliegueSupraespinal')),
    pliegueAbdominal: toNumberOrUndefined(watch('antropometria_pliegueAbdominal')),
    pliegueMuslo: toNumberOrUndefined(watch('antropometria_pliegueMuslo')),
    plieguePantorrilla: toNumberOrUndefined(watch('antropometria_plieguePantorrilla')),
  });

  return (
    <div className="space-y-5">
      {/* BÁSICOS */}
      <div>
        <p className={blockTitleClass}>Básicos</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <NumericFieldWithSuffix
            id="antropometria_peso"
            label="Peso"
            unidad="kg"
            field="antropometria_peso"
            register={register}
            error={errors.antropometria_peso?.message}
          />
          <NumericFieldWithSuffix
            id="antropometria_talla"
            label="Talla"
            unidad="cm"
            field="antropometria_talla"
            register={register}
            error={errors.antropometria_talla?.message}
          />
          <NumericFieldWithSuffix
            id="antropometria_tsen"
            label="Tsen"
            unidad="cm"
            field="antropometria_tsen"
            register={register}
            error={errors.antropometria_tsen?.message}
          />
        </div>
      </div>

      <hr className="border-gray-100" />

      {/* PERÍMETROS */}
      <div>
        <p className={blockTitleClass}>Perímetros</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <NumericFieldWithSuffix
            id="antropometria_perimetroBrazo"
            label="Brazo"
            unidad="cm"
            field="antropometria_perimetroBrazo"
            register={register}
            error={errors.antropometria_perimetroBrazo?.message}
          />
          <NumericFieldWithSuffix
            id="antropometria_perimetroMusloMedio"
            label="Muslo Medio"
            unidad="cm"
            field="antropometria_perimetroMusloMedio"
            register={register}
            error={errors.antropometria_perimetroMusloMedio?.message}
          />
          <NumericFieldWithSuffix
            id="antropometria_perimetroPantorrilla"
            label="Pantorrilla"
            unidad="cm"
            field="antropometria_perimetroPantorrilla"
            register={register}
            error={errors.antropometria_perimetroPantorrilla?.message}
          />
          <NumericFieldWithSuffix
            id="antropometria_cinturaMinima"
            label="Cintura Mínima"
            unidad="cm"
            field="antropometria_cinturaMinima"
            register={register}
            error={errors.antropometria_cinturaMinima?.message}
          />
          <NumericFieldWithSuffix
            id="antropometria_caderaMaxima"
            label="Cadera Máxima"
            unidad="cm"
            field="antropometria_caderaMaxima"
            register={register}
            error={errors.antropometria_caderaMaxima?.message}
          />
        </div>
      </div>

      <hr className="border-gray-100" />

      {/* PLIEGUES */}
      <div>
        <p className={blockTitleClass}>Pliegues</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <NumericFieldWithSuffix
            id="antropometria_pliegueTriceps"
            label="Tríceps"
            unidad="mm"
            field="antropometria_pliegueTriceps"
            register={register}
            error={errors.antropometria_pliegueTriceps?.message}
          />
          <NumericFieldWithSuffix
            id="antropometria_pliegueSubescapular"
            label="Subescapular"
            unidad="mm"
            field="antropometria_pliegueSubescapular"
            register={register}
            error={errors.antropometria_pliegueSubescapular?.message}
          />
          <NumericFieldWithSuffix
            id="antropometria_pliegueSupraespinal"
            label="Supraespinal"
            unidad="mm"
            field="antropometria_pliegueSupraespinal"
            register={register}
            error={errors.antropometria_pliegueSupraespinal?.message}
          />
          <NumericFieldWithSuffix
            id="antropometria_pliegueAbdominal"
            label="Abdominal"
            unidad="mm"
            field="antropometria_pliegueAbdominal"
            register={register}
            error={errors.antropometria_pliegueAbdominal?.message}
          />
          <NumericFieldWithSuffix
            id="antropometria_pliegueMuslo"
            label="Muslo"
            unidad="mm"
            field="antropometria_pliegueMuslo"
            register={register}
            error={errors.antropometria_pliegueMuslo?.message}
          />
          <NumericFieldWithSuffix
            id="antropometria_plieguePantorrilla"
            label="Pantorrilla"
            unidad="mm"
            field="antropometria_plieguePantorrilla"
            register={register}
            error={errors.antropometria_plieguePantorrilla?.message}
          />
        </div>
      </div>

      <hr className="border-gray-100" />

      {/* SUMATORIAS (AUTO-CALCULADAS) */}
      <div>
        <p className={blockTitleClass}>Sumatorias (auto-calculadas)</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <SumatoriaCard label="IMC" value={imc} />
          <SumatoriaCard label="Sumatoria de Pliegues" value={sumatoriaPliegues} suffix="mm" />
        </div>
      </div>
    </div>
  );
}
