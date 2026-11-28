import type { UseFormRegister, UseFormWatch, FieldErrors } from 'react-hook-form';
import { Calculator } from 'lucide-react';
import { computeAntropometriaSumatorias } from '@/lib/utils/antropometria';
import { ROTULO_CLASES } from '@/app/components/ui/panel';
import type { SeguimientoExtendedFormValues } from '../SeguimientoForm';

interface Props {
  register: UseFormRegister<SeguimientoExtendedFormValues>;
  watch: UseFormWatch<SeguimientoExtendedFormValues>;
  errors: FieldErrors<SeguimientoExtendedFormValues>;
}

const inputClass =
  'w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-secundario/30';

const labelClass = 'block text-sm font-medium text-foreground mb-1.5';

const blockTitleClass = `${ROTULO_CLASES} mb-2`;

const gridClass = 'grid grid-cols-2 gap-3 sm:grid-cols-4';

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
    <div className="min-w-0">
      <label htmlFor={id} className={labelClass}>
        {label}
        <span className="sr-only"> ({unidad})</span>
      </label>
      <div className="relative">
        <input
          id={id}
          type="number"
          inputMode="decimal"
          min={0}
          step="0.1"
          {...register(field, { valueAsNumber: true })}
          className={`${inputClass} pr-10 font-mono tabular-nums`}
          placeholder="0"
          aria-invalid={error ? 'true' : 'false'}
        />
        <span
          className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted-foreground"
          aria-hidden
        >
          {unidad}
        </span>
      </div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

function Calculado({
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
    <div className="min-w-0">
      <div className="flex items-center gap-1 text-xs font-medium text-secundario">
        <Calculator size={13} aria-hidden />
        <span>{label}</span>
      </div>
      <p className="mt-0.5 font-mono text-xl font-semibold leading-tight tabular-nums text-primario">
        {hasValue ? value : <span className="text-muted-foreground">—</span>}
        {hasValue && suffix ? (
          <span className="ml-1 text-sm font-normal text-muted-foreground">{suffix}</span>
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
    <div className="space-y-4">
      {/* BÁSICOS */}
      <div>
        <p className={blockTitleClass}>Básicos</p>
        <div className={gridClass}>
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

      {/* PERÍMETROS */}
      <div>
        <p className={blockTitleClass}>Perímetros</p>
        <div className={gridClass}>
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

      {/* PLIEGUES */}
      <div>
        <p className={blockTitleClass}>Pliegues (mm)</p>
        <div className={gridClass}>
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

      {/* Calculados en vivo a partir de los campos: no son inputs. */}
      <div
        role="group"
        aria-label="Cálculos automáticos"
        className="grid grid-cols-2 gap-3 rounded-lg bg-primario-suave p-3"
      >
        <Calculado label="IMC" value={imc} />
        <Calculado label="Suma de pliegues" value={sumatoriaPliegues} suffix="mm" />
      </div>
    </div>
  );
}
