import type { DeportistaWithRelations } from '@/lib/types/deportistas';
import type {
  Genero,
  Disciplina,
  EstadoDeportista,
  ActividadComplementaria,
  NivelEstudio,
  SituacionLaboral,
  MedioTransporte,
  CondicionVivienda,
  DificultadAlimentacion,
  EnfermedadPreexistente,
  AntecedenteEnfermedadFamiliar,
} from '@/lib/generated/prisma/enums';
import {
  DISCIPLINA_LABELS,
  ESTADO_LABELS,
  GENERO_LABELS,
  ACTIVIDAD_COMPLEMENTARIA_LABELS,
  NIVEL_ESTUDIO_LABELS,
  SITUACION_LABORAL_LABELS,
  MEDIO_TRANSPORTE_LABELS,
  CONDICION_VIVIENDA_LABELS,
  DIFICULTAD_ALIMENTACION_LABELS,
  TIPO_APOYO_LABELS,
  SERVICIO_LABELS,
  ENFERMEDAD_PREEXISTENTE_LABELS,
  ANTECEDENTE_ENFERMEDAD_FAMILIAR_LABELS,
} from '@/lib/utils/enum-labels';

// ---------------------------------------------------------------------------
// Helpers compartidos (reutilizados por las secciones de cada tab)
// ---------------------------------------------------------------------------

export function formatDate(date: Date | null | undefined): string {
  if (!date) return '—';
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(date));
}

export function calcEdad(fechaNacimiento: Date): number {
  const hoy = new Date();
  const nac = new Date(fechaNacimiento);
  let edad = hoy.getFullYear() - nac.getFullYear();
  const m = hoy.getMonth() - nac.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) edad--;
  return edad;
}

export function boolLabel(val: boolean | null | undefined): string {
  if (val == null) return '—';
  return val ? 'Sí' : 'No';
}

export function val(v: string | null | undefined): string {
  return v && v.trim() ? v : '—';
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="col-span-1 sm:col-span-2 text-sm font-semibold uppercase tracking-wide text-[#6B7280] border-b border-gray-100 pb-2 mb-2">
      {children}
    </h3>
  );
}

export function FieldRow({
  label,
  value,
  className = '',
}: {
  label: string;
  value: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="text-xs uppercase tracking-wide text-[#6B7280] mb-0.5">{label}</p>
      <p className="text-sm text-[#1C1C1C]">{value || '—'}</p>
    </div>
  );
}

export const ESTADO_BADGE: Record<string, string> = {
  ACTIVO: 'bg-green-100 text-green-700',
  INACTIVO: 'bg-gray-100 text-[#6B7280]',
  LESIONADO: 'bg-amber-100 text-amber-700',
  SUSPENDIDO: 'bg-red-100 text-red-700',
};

/** Estado vacío para tabs cuya relación de datos no existe. */
export function EmptySection({ label }: { label?: string }) {
  return (
    <p className="text-sm text-[#6B7280] py-8 text-center">
      {label ?? 'Sin datos cargados'}
    </p>
  );
}

/** Envoltorio de grilla para las secciones de datos. */
function SectionGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">{children}</div>
  );
}

interface SectionProps {
  deportista: DeportistaWithRelations;
}

// ---------------------------------------------------------------------------
// Secciones por tab
// ---------------------------------------------------------------------------

export function DatosPersonalesSection({ deportista: d }: SectionProps) {
  return (
    <SectionGrid>
      <SectionTitle>Datos Personales</SectionTitle>

      <FieldRow label="DNI" value={val(d.dni)} />
      <FieldRow
        label="Fecha de nacimiento / Edad"
        value={`${formatDate(d.fechaNacimiento)} (${calcEdad(d.fechaNacimiento)} años)`}
      />
      <FieldRow label="Género" value={d.genero ? GENERO_LABELS[d.genero as Genero] : '—'} />
      <FieldRow label="Teléfono" value={val(d.telefono)} />
      <FieldRow label="Email" value={val(d.email)} />
      <FieldRow label="Domicilio" value={val(d.domicilioActual)} className="sm:col-span-2" />
      <FieldRow label="Provincia" value={val(d.provincia)} />
      <FieldRow label="Ciudad" value={val(d.ciudad)} />
      <FieldRow label="Nacionalidad" value={val(d.nacionalidad)} />
      <FieldRow label="Contacto de emergencia" value={val(d.contactoEmergencia)} />
      <FieldRow label="Pensión del club" value={boolLabel(d.vivePensionClub)} />
      <FieldRow label="Pensión externa" value={boolLabel(d.vivePensionExterna)} />
      {d.observaciones && (
        <FieldRow label="Observaciones" value={d.observaciones} className="sm:col-span-2" />
      )}
    </SectionGrid>
  );
}

export function DatosDeportivosSection({ deportista: d }: SectionProps) {
  return (
    <SectionGrid>
      <SectionTitle>Datos Deportivos</SectionTitle>

      <FieldRow label="Disciplina" value={d.disciplina ? DISCIPLINA_LABELS[d.disciplina as Disciplina] : '—'} />
      <FieldRow label="Categoría" value={d.categoria ? d.categoria.nombre : '—'} />
      <FieldRow label="Posición" value={val(d.posicion)} />
      <div>
        <p className="text-xs uppercase tracking-wide text-[#6B7280] mb-1">Estado</p>
        <span
          className={[
            'text-xs font-medium px-2.5 py-1 rounded-full',
            ESTADO_BADGE[d.estado as EstadoDeportista] ?? 'bg-gray-100 text-[#6B7280]',
          ].join(' ')}
        >
          {ESTADO_LABELS[d.estado as EstadoDeportista]}
        </span>
      </div>
      <FieldRow
        label="Actividad complementaria"
        value={d.actividadComplementaria ? ACTIVIDAD_COMPLEMENTARIA_LABELS[d.actividadComplementaria as ActividadComplementaria] : '—'}
      />
      <FieldRow label="Fecha de ingreso" value={formatDate(d.fechaIngreso)} />
      <FieldRow label="Es representante" value={boolLabel(d.esRepresentante)} />

      {d.clubesAnteriores.length > 0 && (
        <div className="sm:col-span-2">
          <p className="text-xs uppercase tracking-wide text-[#6B7280] mb-2">Clubes anteriores</p>
          <div className="border border-gray-100 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-xs text-[#6B7280] uppercase">
                  <th className="px-4 py-2 text-left">Club</th>
                  <th className="px-4 py-2 text-left">Período</th>
                </tr>
              </thead>
              <tbody>
                {d.clubesAnteriores.map((c: { id: string; nombre: string; periodo?: string | null }) => (
                  <tr key={c.id} className="border-t border-gray-50">
                    <td className="px-4 py-2">{c.nombre}</td>
                    <td className="px-4 py-2 text-[#6B7280]">{c.periodo ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </SectionGrid>
  );
}

export function DatosEscolaresSection({ deportista: d }: SectionProps) {
  if (!d.datosEscolares && !d.datosFamiliares) {
    return <EmptySection />;
  }
  return (
    <SectionGrid>
      {d.datosEscolares && (
        <>
          <SectionTitle>Datos Escolares</SectionTitle>
          <FieldRow
            label="Nivel de estudio"
            value={d.datosEscolares.nivelEstudio ? NIVEL_ESTUDIO_LABELS[d.datosEscolares.nivelEstudio as NivelEstudio] : '—'}
          />
          <FieldRow
            label="Año que cursa"
            value={d.datosEscolares.anoCursa != null ? String(d.datosEscolares.anoCursa) : '—'}
          />
          <FieldRow
            label="Nombre del colegio"
            value={val(d.datosEscolares.nombreColegio)}
            className="sm:col-span-2"
          />
          {d.datosEscolares.materiasAdeudadas && (
            <FieldRow
              label="Materias adeudadas"
              value={d.datosEscolares.materiasAdeudadas}
              className="sm:col-span-2"
            />
          )}
        </>
      )}

      {d.datosFamiliares && (
        <>
          <SectionTitle>Datos Familiares</SectionTitle>
          <div>
            <p className="text-xs font-semibold text-[#1C1C1C] mb-2 uppercase tracking-wide">Padre</p>
            <div className="space-y-1 text-sm text-[#1C1C1C]">
              <p>{val(d.datosFamiliares.padreNombre)} {val(d.datosFamiliares.padreApellido) !== '—' ? d.datosFamiliares.padreApellido : ''}</p>
              <p className="text-[#6B7280]">{val(d.datosFamiliares.padreNacionalidad)} — {val(d.datosFamiliares.padreOcupacion)}</p>
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-[#1C1C1C] mb-2 uppercase tracking-wide">Madre</p>
            <div className="space-y-1 text-sm text-[#1C1C1C]">
              <p>{val(d.datosFamiliares.madreNombre)} {val(d.datosFamiliares.madreApellido) !== '—' ? d.datosFamiliares.madreApellido : ''}</p>
              <p className="text-[#6B7280]">{val(d.datosFamiliares.madreNacionalidad)} — {val(d.datosFamiliares.madreOcupacion)}</p>
            </div>
          </div>
        </>
      )}
    </SectionGrid>
  );
}

export function DatosSocialesSection({ deportista: d }: SectionProps) {
  if (!d.datosSociales && !d.viviendaFamiliar && !d.necesidadesApoyo) {
    return <EmptySection />;
  }
  return (
    <SectionGrid>
      {d.datosSociales && (
        <>
          <SectionTitle>Datos Sociales</SectionTitle>
          <FieldRow label="Trabaja" value={boolLabel(d.datosSociales.trabaja)} />
          <FieldRow
            label="Situación laboral del hogar"
            value={d.datosSociales.situacionLaboralHogar ? SITUACION_LABORAL_LABELS[d.datosSociales.situacionLaboralHogar as SituacionLaboral] : '—'}
          />
          <FieldRow label="Con quién vive" value={val(d.datosSociales.conQuienVive)} />
          <FieldRow
            label="Composición del grupo familiar"
            value={val(d.datosSociales.composicionGrupoFamiliar)}
            className="sm:col-span-2"
          />
        </>
      )}

      {d.viviendaFamiliar && (
        <>
          <SectionTitle>Vivienda Familiar</SectionTitle>
          <FieldRow
            label="Personas dependientes"
            value={d.viviendaFamiliar.personasDependientes != null ? String(d.viviendaFamiliar.personasDependientes) : '—'}
          />
          <FieldRow
            label="Medio de transporte"
            value={d.viviendaFamiliar.medioTransporte ? MEDIO_TRANSPORTE_LABELS[d.viviendaFamiliar.medioTransporte as MedioTransporte] : '—'}
          />
          <FieldRow
            label="Condición de vivienda"
            value={d.viviendaFamiliar.condicionVivienda ? CONDICION_VIVIENDA_LABELS[d.viviendaFamiliar.condicionVivienda as CondicionVivienda] : '—'}
          />
          <FieldRow label="Cuenta con habitaciones" value={boolLabel(d.viviendaFamiliar.cuentaConHabitaciones)} />
          {d.viviendaFamiliar.servicios.length > 0 && (
            <div className="sm:col-span-2">
              <p className="text-xs uppercase tracking-wide text-[#6B7280] mb-2">Servicios</p>
              <div className="flex flex-wrap gap-2">
                {d.viviendaFamiliar.servicios.map((s: { id: string; servicio: import('@/lib/generated/prisma/enums').Servicio }) => (
                  <span
                    key={s.id}
                    className="text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full"
                  >
                    {SERVICIO_LABELS[s.servicio]}
                  </span>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {d.necesidadesApoyo && (
        <>
          <SectionTitle>Necesidades de Apoyo</SectionTitle>
          <FieldRow
            label="Dificultad de alimentación"
            value={d.necesidadesApoyo.dificultadAlimentacion ? DIFICULTAD_ALIMENTACION_LABELS[d.necesidadesApoyo.dificultadAlimentacion as DificultadAlimentacion] : '—'}
          />
          <FieldRow label="Recibe vianda" value={boolLabel(d.necesidadesApoyo.recibeVianda)} />
          <FieldRow label="Es socio" value={boolLabel(d.necesidadesApoyo.esSocio)} />
          {d.necesidadesApoyo.apoyosRequeridos.length > 0 && (
            <div className="sm:col-span-2">
              <p className="text-xs uppercase tracking-wide text-[#6B7280] mb-2">Apoyos requeridos</p>
              <div className="flex flex-wrap gap-2">
                {d.necesidadesApoyo.apoyosRequeridos.map((a: { id: string; tipo: import('@/lib/generated/prisma/enums').TipoApoyo }) => (
                  <span
                    key={a.id}
                    className="text-xs bg-purple-50 text-purple-700 px-2.5 py-1 rounded-full"
                  >
                    {TIPO_APOYO_LABELS[a.tipo]}
                  </span>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </SectionGrid>
  );
}

export function DatosSaludSection({ deportista: d }: SectionProps) {
  if (!d.datosSalud) {
    return <EmptySection />;
  }
  return (
    <SectionGrid>
      <SectionTitle>Datos de Salud</SectionTitle>

      <FieldRow label="Grupo y factor sanguíneo" value={val(d.datosSalud.grupoSanguineo)} />
      <FieldRow label="Horas de sueño promedio" value={val(d.datosSalud.horasSuenio)} />
      <FieldRow
        label="Obra social y nº de afiliado"
        value={val(d.datosSalud.obraSocial)}
        className="sm:col-span-2"
      />

      {d.datosSalud.enfermedadesPreexistentes.length > 0 && (
        <div className="sm:col-span-2">
          <p className="text-xs uppercase tracking-wide text-[#6B7280] mb-2">Enfermedades preexistentes</p>
          <div className="flex flex-wrap gap-2">
            {d.datosSalud.enfermedadesPreexistentes.map(
              (e: { id: string; enfermedad: EnfermedadPreexistente }) => (
                <span key={e.id} className="text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full">
                  {ENFERMEDAD_PREEXISTENTE_LABELS[e.enfermedad]}
                </span>
              ),
            )}
          </div>
        </div>
      )}

      {d.datosSalud.antecedentesEnfermedadesFam.length > 0 && (
        <div className="sm:col-span-2">
          <p className="text-xs uppercase tracking-wide text-[#6B7280] mb-2">
            Antecedentes de enfermedades familiares
          </p>
          <div className="flex flex-wrap gap-2">
            {d.datosSalud.antecedentesEnfermedadesFam.map(
              (a: { id: string; antecedente: AntecedenteEnfermedadFamiliar }) => (
                <span key={a.id} className="text-xs bg-purple-50 text-purple-700 px-2.5 py-1 rounded-full">
                  {ANTECEDENTE_ENFERMEDAD_FAMILIAR_LABELS[a.antecedente]}
                </span>
              ),
            )}
          </div>
        </div>
      )}

      <div>
        <p className="text-xs uppercase tracking-wide text-[#6B7280] mb-1">
          Antecedente familiar de muerte súbita
        </p>
        {d.datosSalud.antecedenteMuerteSubitaFamiliar == null ? (
          <p className="text-sm text-[#1C1C1C]">—</p>
        ) : d.datosSalud.antecedenteMuerteSubitaFamiliar ? (
          <span className="text-xs font-medium bg-red-100 text-red-700 px-2.5 py-1 rounded-full">Sí</span>
        ) : (
          <span className="text-xs font-medium bg-green-100 text-green-700 px-2.5 py-1 rounded-full">No</span>
        )}
      </div>

      <div />

      {d.datosSalud.antecedentesQuirurgicos && (
        <div className="sm:col-span-2">
          <p className="text-xs uppercase tracking-wide text-[#6B7280] mb-0.5">Antecedentes quirúrgicos</p>
          <p className="text-sm text-[#1C1C1C] whitespace-pre-wrap">{d.datosSalud.antecedentesQuirurgicos}</p>
        </div>
      )}

      {d.datosSalud.medicacionCronica && (
        <div className="sm:col-span-2">
          <p className="text-xs uppercase tracking-wide text-[#6B7280] mb-0.5">
            Medicación / tratamientos crónicos
          </p>
          <p className="text-sm text-[#1C1C1C] whitespace-pre-wrap">{d.datosSalud.medicacionCronica}</p>
        </div>
      )}

      {d.datosSalud.historialLesiones && (
        <div className="sm:col-span-2">
          <p className="text-xs uppercase tracking-wide text-[#6B7280] mb-0.5">Historial de lesiones</p>
          <p className="text-sm text-[#1C1C1C] whitespace-pre-wrap">{d.datosSalud.historialLesiones}</p>
        </div>
      )}
    </SectionGrid>
  );
}

// ---------------------------------------------------------------------------
// Default export: todas las secciones apiladas (compatibilidad)
// ---------------------------------------------------------------------------

interface DeportistaDetailProps {
  deportista: DeportistaWithRelations;
}

export default function DeportistaDetail({ deportista }: DeportistaDetailProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-6">
      <DatosPersonalesSection deportista={deportista} />
      <DatosDeportivosSection deportista={deportista} />
      {(deportista.datosEscolares || deportista.datosFamiliares) && (
        <DatosEscolaresSection deportista={deportista} />
      )}
      {(deportista.datosSociales || deportista.viviendaFamiliar || deportista.necesidadesApoyo) && (
        <DatosSocialesSection deportista={deportista} />
      )}
      {deportista.datosSalud && <DatosSaludSection deportista={deportista} />}
    </div>
  );
}
