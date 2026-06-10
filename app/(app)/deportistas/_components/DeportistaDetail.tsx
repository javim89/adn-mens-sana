import type { DeportistaWithRelations } from '@/lib/types/deportistas';
import type {
  Genero,
  Disciplina,
  Categoria,
  EstadoDeportista,
  ActividadComplementaria,
  NivelEstudio,
  SituacionLaboral,
  MedioTransporte,
  CondicionVivienda,
  DificultadAlimentacion,
} from '@/lib/generated/prisma/enums';
import {
  DISCIPLINA_LABELS,
  CATEGORIA_LABELS,
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
} from '@/lib/utils/enum-labels';

function formatDate(date: Date | null | undefined): string {
  if (!date) return '—';
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(date));
}

function calcEdad(fechaNacimiento: Date): number {
  const hoy = new Date();
  const nac = new Date(fechaNacimiento);
  let edad = hoy.getFullYear() - nac.getFullYear();
  const m = hoy.getMonth() - nac.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) edad--;
  return edad;
}

function boolLabel(val: boolean | null | undefined): string {
  if (val == null) return '—';
  return val ? 'Sí' : 'No';
}

function val(v: string | null | undefined): string {
  return v && v.trim() ? v : '—';
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="col-span-2 text-sm font-semibold uppercase tracking-wide text-[#6B7280] border-b border-gray-100 pb-2 mt-6 mb-2">
      {children}
    </h3>
  );
}

function FieldRow({
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

const ESTADO_BADGE: Record<string, string> = {
  ACTIVO: 'bg-green-100 text-green-700',
  INACTIVO: 'bg-gray-100 text-[#6B7280]',
  LESIONADO: 'bg-amber-100 text-amber-700',
  SUSPENDIDO: 'bg-red-100 text-red-700',
};

interface DeportistaDetailProps {
  deportista: DeportistaWithRelations;
}

export default function DeportistaDetail({ deportista: d }: DeportistaDetailProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
        {/* Datos Personales */}
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

        {/* Datos Deportivos */}
        <SectionTitle>Datos Deportivos</SectionTitle>

        <FieldRow label="Disciplina" value={d.disciplina ? DISCIPLINA_LABELS[d.disciplina as Disciplina] : '—'} />
        <FieldRow label="Categoría" value={d.categoria ? CATEGORIA_LABELS[d.categoria as Categoria] : '—'} />
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

        {/* Clubes anteriores */}
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

        {/* Datos Escolares */}
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

        {/* Datos Familiares */}
        {d.datosFamiliares && (
          <>
            <SectionTitle>Datos Familiares</SectionTitle>
            <div>
              <p className="text-xs font-semibold text-[#1C1C1C] mb-2 uppercase tracking-wide">
                Padre
              </p>
              <div className="space-y-1 text-sm text-[#1C1C1C]">
                <p>{val(d.datosFamiliares.padreNombre)} {val(d.datosFamiliares.padreApellido) !== '—' ? d.datosFamiliares.padreApellido : ''}</p>
                <p className="text-[#6B7280]">{val(d.datosFamiliares.padreNacionalidad)} — {val(d.datosFamiliares.padreOcupacion)}</p>
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-[#1C1C1C] mb-2 uppercase tracking-wide">
                Madre
              </p>
              <div className="space-y-1 text-sm text-[#1C1C1C]">
                <p>{val(d.datosFamiliares.madreNombre)} {val(d.datosFamiliares.madreApellido) !== '—' ? d.datosFamiliares.madreApellido : ''}</p>
                <p className="text-[#6B7280]">{val(d.datosFamiliares.madreNacionalidad)} — {val(d.datosFamiliares.madreOcupacion)}</p>
              </div>
            </div>
          </>
        )}

        {/* Datos Sociales */}
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

        {/* Vivienda */}
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

        {/* Necesidades de Apoyo */}
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
                <p className="text-xs uppercase tracking-wide text-[#6B7280] mb-2">
                  Apoyos requeridos
                </p>
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
      </div>
    </div>
  );
}
