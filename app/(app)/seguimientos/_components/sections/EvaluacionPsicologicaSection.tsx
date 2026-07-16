import type { UseFormRegister, FieldErrors } from 'react-hook-form';
import type { SeguimientoExtendedFormValues } from '../SeguimientoForm';

interface Props {
  register: UseFormRegister<SeguimientoExtendedFormValues>;
  errors: FieldErrors<SeguimientoExtendedFormValues>;
}

const inputClass =
  'w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3346CC]/30';

const labelClass = 'block text-sm font-medium text-[#1C1C1C] mb-1.5';

const sectionTitleClass = 'text-xs font-semibold uppercase text-[#6B7280] tracking-wide mb-3';

function NumericFieldWithSuffix({
  id,
  label,
  suffix,
  field,
  min,
  max,
  register,
  error,
}: {
  id: string;
  label: string;
  suffix: string;
  field: keyof SeguimientoExtendedFormValues;
  min: number;
  max: number;
  register: UseFormRegister<SeguimientoExtendedFormValues>;
  error?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className={labelClass}>
        {label}{' '}
        <span className="text-xs text-[#6B7280] font-normal">{suffix}</span>
      </label>
      <input
        id={id}
        type="number"
        min={min}
        max={max}
        {...register(field, { valueAsNumber: true })}
        className={inputClass}
        placeholder={`0–${max}`}
      />
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

export function EvaluacionPsicologicaSection({ register, errors }: Props) {
  return (
    <div className="space-y-5">
      {/* CPRD */}
      <div>
        <p className={sectionTitleClass}>CPRD – Características Psicológicas</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <NumericFieldWithSuffix
            id="psicologica_cprdControlEstres"
            label="Control de Estrés"
            suffix="/36"
            field="psicologica_cprdControlEstres"
            min={0}
            max={36}
            register={register}
            error={errors.psicologica_cprdControlEstres?.message}
          />
          <NumericFieldWithSuffix
            id="psicologica_cprdInfluenciaEvaluacion"
            label="Influencia de evaluación en rendimiento"
            suffix="/36"
            field="psicologica_cprdInfluenciaEvaluacion"
            min={0}
            max={36}
            register={register}
            error={errors.psicologica_cprdInfluenciaEvaluacion?.message}
          />
          <NumericFieldWithSuffix
            id="psicologica_cprdMotivacion"
            label="Motivación"
            suffix="/36"
            field="psicologica_cprdMotivacion"
            min={0}
            max={36}
            register={register}
            error={errors.psicologica_cprdMotivacion?.message}
          />
          <NumericFieldWithSuffix
            id="psicologica_cprdHabilidadMental"
            label="Habilidad Mental"
            suffix="/36"
            field="psicologica_cprdHabilidadMental"
            min={0}
            max={36}
            register={register}
            error={errors.psicologica_cprdHabilidadMental?.message}
          />
          <NumericFieldWithSuffix
            id="psicologica_cprdCohesionEquipo"
            label="Cohesión de equipo"
            suffix="/36"
            field="psicologica_cprdCohesionEquipo"
            min={0}
            max={36}
            register={register}
            error={errors.psicologica_cprdCohesionEquipo?.message}
          />
        </div>
      </div>

      <hr className="border-gray-100" />

      <div>
        <label htmlFor="psicologica_sociograma" className={labelClass}>Sociograma</label>
        <textarea
          id="psicologica_sociograma"
          {...register('psicologica_sociograma')}
          rows={3}
          placeholder="Descripción del sociograma..."
          className={`${inputClass} resize-none`}
        />
      </div>

      <div>
        <label htmlFor="psicologica_poms" className={labelClass}>POMS</label>
        <textarea
          id="psicologica_poms"
          {...register('psicologica_poms')}
          rows={3}
          placeholder="Perfil de estados de ánimo..."
          className={`${inputClass} resize-none`}
        />
      </div>

      <hr className="border-gray-100" />

      {/* STAI */}
      <div>
        <p className={sectionTitleClass}>STAI – Ansiedad Estado-Rasgo</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <NumericFieldWithSuffix
            id="psicologica_staiRasgo"
            label="STAI-AR Rasgo"
            suffix="/80"
            field="psicologica_staiRasgo"
            min={0}
            max={80}
            register={register}
            error={errors.psicologica_staiRasgo?.message}
          />
          <NumericFieldWithSuffix
            id="psicologica_staiEstado"
            label="STAI-AE Estado"
            suffix="/80"
            field="psicologica_staiEstado"
            min={0}
            max={80}
            register={register}
            error={errors.psicologica_staiEstado?.message}
          />
        </div>
      </div>

      <div>
        <label htmlFor="psicologica_observaciones" className={labelClass}>Observaciones (Psicología)</label>
        <textarea
          id="psicologica_observaciones"
          {...register('psicologica_observaciones')}
          rows={3}
          placeholder="Notas adicionales del área de psicología..."
          className={`${inputClass} resize-none`}
        />
      </div>
    </div>
  );
}
