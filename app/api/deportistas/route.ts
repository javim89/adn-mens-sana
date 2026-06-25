import { auth } from '@clerk/nextjs/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { getDeportistas } from '@/lib/queries/deportistas';
import type { DeportistaListItem, DeportistaWithRelations } from '@/lib/types/deportistas';
import type { JsonApiResource, JsonApiErrors } from '@/lib/types/jsonapi';
import type { DeportistaListAttributes, DeportistaDetailAttributes } from '@/lib/api/deportistas';

const JSON_API_CONTENT_TYPE = 'application/vnd.api+json';

// ---------------------------------------------------------------------------
// Zod schemas
// ---------------------------------------------------------------------------

const DisciplinaValues = [
  'FUTBOL', 'FUTSAL', 'BASQUET', 'VOLEY', 'HANDBALL', 'NATACION', 'ATLETISMO',
  'HOCKEY', 'RUGBY', 'TENIS', 'GIMNASIA', 'GIMNASIA_ARTISTICA', 'PATIN',
  'ARTES_MARCIALES', 'COMBATE', 'INICIACION_DEPORTIVA', 'POWER_CHAIR', 'TIADE',
  'AJEDREZ', 'BOXEO', 'OTRO',
] as const;

const CategoriaValues = [
  'SUB_12', 'SUB_14', 'SUB_16', 'SUB_18', 'NOVENA', 'OCTAVA', 'SEPTIMA',
  'SEXTA', 'QUINTA', 'CUARTA', 'RESERVA', 'DIVISION_DE_HONOR', 'PRIMERA',
  'SENIOR', 'VETERANOS',
] as const;

const EstadoValues = ['ACTIVO', 'INACTIVO', 'LESIONADO', 'SUSPENDIDO'] as const;
const GeneroValues = ['MASCULINO', 'FEMENINO', 'NO_BINARIO', 'PREFIERO_NO_DECIR'] as const;
const ActividadComplementariaValues = [
  'GIMNASIO', 'TECNICA_INDIVIDUAL', 'AMBAS', 'NINGUNA',
] as const;
const NivelEstudioValues = [
  'PRIMARIO_INCOMPLETO', 'PRIMARIO_EN_CURSO', 'PRIMARIO_COMPLETO',
  'SECUNDARIO_INCOMPLETO', 'SECUNDARIO_EN_CURSO', 'SECUNDARIO_COMPLETO',
  'TERCIARIO_INCOMPLETO', 'TERCIARIO_EN_CURSO', 'TERCIARIO_COMPLETO',
] as const;
const SituacionLaboralValues = [
  'ALGUIEN_TRABAJA', 'NADIE_TRABAJA', 'SIN_DATO',
] as const;
const MedioTransporteValues = [
  'TRANSPORTE_PUBLICO', 'TRANSPORTE_FAMILIAR', 'TRANSPORTE_DEL_CLUB', 'OTRO',
] as const;
const CondicionViviendaValues = [
  'PROPIA', 'CEDIDA', 'ALQUILADA', 'OTRO',
] as const;
const DificultadAlimentacionValues = [
  'NUNCA', 'A_VECES', 'FRECUENTEMENTE',
] as const;
const TipoApoyoValues = [
  'ECONOMICO', 'ALIMENTACION', 'TRANSPORTE', 'EDUCATIVO', 'PSICOLOGICO', 'NINGUNO', 'OTRO',
] as const;
const ServicioValues = [
  'LUZ', 'GAS', 'AGUA_CORRIENTE', 'TELEFONO', 'CABLE', 'INTERNET', 'SEGURIDAD', 'ALARMA', 'NINGUNA',
] as const;
const EnfermedadPreexistenteValues = [
  'PRESION_ARTERIAL', 'DIABETES', 'ASMA', 'CHAGAS', 'EPILEPSIA', 'MIGRANA', 'COVID', 'ALERGIAS', 'ETS', 'OTRO',
] as const;
const AntecedenteEnfermedadFamiliarValues = [
  'DIABETES', 'EPOC', 'DISLIPEMIAS', 'HIPOTIROIDISMO', 'HIPERTIROIDISMO', 'ASMA', 'CANCER',
  'CHAGAS', 'MIGRANA', 'HIPERTENSION_ARTERIAL', 'CORONARIOPATIAS', 'OTRO',
] as const;

const getQuerySchema = z.object({
  'page[number]': z.coerce.number().int().min(1).default(1),
  'page[size]': z.coerce.number().int().min(1).max(100).default(20),
  'filter[search]': z.string().optional(),
  'filter[disciplina]': z.enum(DisciplinaValues).optional(),
  'filter[categoria]': z.enum(CategoriaValues).optional(),
  'filter[estado]': z.enum(EstadoValues).optional(),
  sort: z.string().optional(),
});

const deportistaAttributesSchema = z.object({
  apellido: z.string().min(1, 'El apellido es requerido'),
  nombre: z.string().min(1, 'El nombre es requerido'),
  dni: z.string().regex(/^\d{7,8}$/, 'El DNI debe tener 7 u 8 dígitos'),
  fechaNacimiento: z.string().min(1, 'La fecha de nacimiento es requerida'),
  provincia: z.string().optional(),
  ciudad: z.string().optional(),
  genero: z.enum(GeneroValues).optional(),
  telefono: z.string().optional(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  domicilioActual: z.string().optional(),
  nacionalidad: z.string().optional(),
  contactoEmergencia: z.string().optional(),
  vivePensionClub: z.boolean().default(false),
  vivePensionExterna: z.boolean().default(false),
  observaciones: z.string().optional(),
  disciplina: z.enum(DisciplinaValues).optional(),
  categoria: z.enum(CategoriaValues).optional(),
  posicion: z.string().optional(),
  estado: z.enum(EstadoValues).default('ACTIVO'),
  actividadComplementaria: z.enum(ActividadComplementariaValues).optional(),
  fechaIngreso: z.string().optional(),
  esRepresentante: z.boolean().default(false),
  clubesAnteriores: z
    .array(z.object({ nombre: z.string(), periodo: z.string().optional() }))
    .default([]),
  datosEscolares: z
    .object({
      nivelEstudio: z.enum(NivelEstudioValues).optional(),
      nombreColegio: z.string().optional(),
      anoCursa: z.number().optional(),
      materiasAdeudadas: z.string().optional(),
    })
    .optional(),
  datosFamiliares: z
    .object({
      padreNombre: z.string().optional(),
      padreApellido: z.string().optional(),
      padreNacionalidad: z.string().optional(),
      padreOcupacion: z.string().optional(),
      madreNombre: z.string().optional(),
      madreApellido: z.string().optional(),
      madreNacionalidad: z.string().optional(),
      madreOcupacion: z.string().optional(),
    })
    .optional(),
  datosSociales: z
    .object({
      trabaja: z.boolean().optional(),
      situacionLaboralHogar: z.enum(SituacionLaboralValues).optional(),
      conQuienVive: z.string().optional(),
      composicionGrupoFamiliar: z.string().optional(),
    })
    .optional(),
  viviendaFamiliar: z
    .object({
      personasDependientes: z.number().optional(),
      medioTransporte: z.enum(MedioTransporteValues).optional(),
      condicionVivienda: z.enum(CondicionViviendaValues).optional(),
      cuentaConHabitaciones: z.boolean().optional(),
      servicios: z.array(z.enum(ServicioValues)).default([]),
    })
    .optional(),
  necesidadesApoyo: z
    .object({
      dificultadAlimentacion: z.enum(DificultadAlimentacionValues).optional(),
      recibeVianda: z.boolean().default(false),
      esSocio: z.boolean().default(false),
      apoyosRequeridos: z.array(z.enum(TipoApoyoValues)).default([]),
    })
    .optional(),
  datosSalud: z
    .object({
      grupoSanguineo: z.string().optional(),
      horasSuenio: z.string().optional(),
      obraSocial: z.string().optional(),
      enfermedadesPreexistentes: z.array(z.enum(EnfermedadPreexistenteValues)).default([]),
      antecedentesEnfermedadesFam: z.array(z.enum(AntecedenteEnfermedadFamiliarValues)).default([]),
      antecedenteMuerteSubitaFamiliar: z.boolean().optional(),
      antecedentesQuirurgicos: z.string().optional(),
      medicacionCronica: z.string().optional(),
      historialLesiones: z.string().optional(),
    })
    .optional(),
});

const postBodySchema = z.object({
  data: z.object({
    type: z.literal('deportistas'),
    attributes: deportistaAttributesSchema,
  }),
});

// ---------------------------------------------------------------------------
// Serializers
// ---------------------------------------------------------------------------

function serializeListItem(
  item: DeportistaListItem,
): JsonApiResource<DeportistaListAttributes> {
  return {
    type: 'deportistas',
    id: item.id,
    attributes: {
      nombre: item.nombre,
      apellido: item.apellido,
      dni: item.dni,
      disciplina: item.disciplina ?? null,
      categoria: item.categoria ?? null,
      estado: item.estado,
      fechaIngreso: item.fechaIngreso ? item.fechaIngreso.toISOString() : null,
    },
  };
}

function serializeFullItem(
  item: DeportistaWithRelations,
): JsonApiResource<DeportistaDetailAttributes> {
  return {
    type: 'deportistas',
    id: item.id,
    attributes: {
      nombre: item.nombre,
      apellido: item.apellido,
      dni: item.dni,
      fechaNacimiento: item.fechaNacimiento.toISOString(),
      provincia: item.provincia ?? null,
      ciudad: item.ciudad ?? null,
      genero: item.genero ?? null,
      telefono: item.telefono ?? null,
      email: item.email ?? null,
      domicilioActual: item.domicilioActual ?? null,
      nacionalidad: item.nacionalidad ?? null,
      contactoEmergencia: item.contactoEmergencia ?? null,
      vivePensionClub: item.vivePensionClub,
      vivePensionExterna: item.vivePensionExterna,
      observaciones: item.observaciones ?? null,
      disciplina: item.disciplina ?? null,
      categoria: item.categoria ?? null,
      posicion: item.posicion ?? null,
      estado: item.estado,
      actividadComplementaria: item.actividadComplementaria ?? null,
      fechaIngreso: item.fechaIngreso ? item.fechaIngreso.toISOString() : null,
      esRepresentante: item.esRepresentante,
      clubesAnteriores: item.clubesAnteriores.map((c) => ({
        id: c.id,
        nombre: c.nombre,
        periodo: c.periodo ?? null,
      })),
      historiaDeportiva: item.historiaDeportiva.map((h) => ({
        id: h.id,
        descripcion: h.descripcion,
        fecha: h.fecha.toISOString(),
      })),
      datosEscolares: item.datosEscolares
        ? {
            id: item.datosEscolares.id,
            nivelEstudio: item.datosEscolares.nivelEstudio ?? null,
            nombreColegio: item.datosEscolares.nombreColegio ?? null,
            anoCursa: item.datosEscolares.anoCursa ?? null,
            materiasAdeudadas: item.datosEscolares.materiasAdeudadas ?? null,
          }
        : null,
      datosSociales: item.datosSociales
        ? {
            id: item.datosSociales.id,
            trabaja: item.datosSociales.trabaja ?? null,
            situacionLaboralHogar: item.datosSociales.situacionLaboralHogar ?? null,
            conQuienVive: item.datosSociales.conQuienVive ?? null,
            composicionGrupoFamiliar: item.datosSociales.composicionGrupoFamiliar ?? null,
          }
        : null,
      viviendaFamiliar: item.viviendaFamiliar
        ? {
            id: item.viviendaFamiliar.id,
            personasDependientes: item.viviendaFamiliar.personasDependientes ?? null,
            medioTransporte: item.viviendaFamiliar.medioTransporte ?? null,
            condicionVivienda: item.viviendaFamiliar.condicionVivienda ?? null,
            cuentaConHabitaciones: item.viviendaFamiliar.cuentaConHabitaciones ?? null,
            servicios: item.viviendaFamiliar.servicios.map((s) => ({
              id: s.id,
              servicio: s.servicio,
            })),
          }
        : null,
      datosFamiliares: item.datosFamiliares
        ? {
            id: item.datosFamiliares.id,
            padreNombre: item.datosFamiliares.padreNombre ?? null,
            padreApellido: item.datosFamiliares.padreApellido ?? null,
            padreNacionalidad: item.datosFamiliares.padreNacionalidad ?? null,
            padreOcupacion: item.datosFamiliares.padreOcupacion ?? null,
            madreNombre: item.datosFamiliares.madreNombre ?? null,
            madreApellido: item.datosFamiliares.madreApellido ?? null,
            madreNacionalidad: item.datosFamiliares.madreNacionalidad ?? null,
            madreOcupacion: item.datosFamiliares.madreOcupacion ?? null,
          }
        : null,
      necesidadesApoyo: item.necesidadesApoyo
        ? {
            id: item.necesidadesApoyo.id,
            dificultadAlimentacion: item.necesidadesApoyo.dificultadAlimentacion ?? null,
            recibeVianda: item.necesidadesApoyo.recibeVianda,
            esSocio: item.necesidadesApoyo.esSocio,
            apoyosRequeridos: item.necesidadesApoyo.apoyosRequeridos.map((a) => ({
              id: a.id,
              tipo: a.tipo,
            })),
          }
        : null,
      datosSalud: item.datosSalud
        ? {
            id: item.datosSalud.id,
            grupoSanguineo: item.datosSalud.grupoSanguineo,
            horasSuenio: item.datosSalud.horasSuenio,
            obraSocial: item.datosSalud.obraSocial,
            antecedenteMuerteSubitaFamiliar: item.datosSalud.antecedenteMuerteSubitaFamiliar,
            antecedentesQuirurgicos: item.datosSalud.antecedentesQuirurgicos,
            medicacionCronica: item.datosSalud.medicacionCronica,
            historialLesiones: item.datosSalud.historialLesiones,
            enfermedadesPreexistentes: item.datosSalud.enfermedadesPreexistentes.map((e) => ({
              id: e.id,
              enfermedad: e.enfermedad,
            })),
            antecedentesEnfermedadesFam: item.datosSalud.antecedentesEnfermedadesFam.map((a) => ({
              id: a.id,
              antecedente: a.antecedente,
            })),
          }
        : null,
    },
  };
}

// ---------------------------------------------------------------------------
// Helper to build pagination link URLs
// ---------------------------------------------------------------------------

function buildPageUrl(base: URL, pageNumber: number, pageSize: number): string {
  const url = new URL(base.toString());
  url.searchParams.set('page[number]', String(pageNumber));
  url.searchParams.set('page[size]', String(pageSize));
  return url.toString();
}

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

export async function GET(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    const body: JsonApiErrors = {
      errors: [{ status: '401', code: 'UNAUTHENTICATED', title: 'No autorizado' }],
    };
    return new Response(JSON.stringify(body), {
      status: 401,
      headers: { 'Content-Type': JSON_API_CONTENT_TYPE },
    });
  }

  const url = new URL(request.url);
  const rawParams = Object.fromEntries(url.searchParams.entries());

  const parsed = getQuerySchema.safeParse(rawParams);
  if (!parsed.success) {
    const body: JsonApiErrors = {
      errors: parsed.error.issues.map((e) => ({
        status: '422',
        code: 'INVALID_PARAM',
        title: 'Parámetro inválido',
        detail: e.message,
        source: { pointer: e.path.join('/') },
      })),
    };
    return new Response(JSON.stringify(body), {
      status: 422,
      headers: { 'Content-Type': JSON_API_CONTENT_TYPE },
    });
  }

  const {
    'page[number]': pageNumber,
    'page[size]': pageSize,
    'filter[search]': search,
    'filter[disciplina]': disciplina,
    'filter[categoria]': categoria,
    'filter[estado]': estado,
  } = parsed.data;

  const result = await getDeportistas({
    search,
    disciplina: disciplina as import('@/lib/generated/prisma/enums').Disciplina | undefined,
    categoria: categoria as import('@/lib/generated/prisma/enums').Categoria | undefined,
    estado: estado as import('@/lib/generated/prisma/enums').EstadoDeportista | undefined,
    page: pageNumber,
    pageSize,
  });

  const totalPages = Math.max(1, Math.ceil(result.total / pageSize));
  const selfUrl = url.toString();
  const firstUrl = buildPageUrl(url, 1, pageSize);
  const lastUrl = buildPageUrl(url, totalPages, pageSize);
  const prevUrl = pageNumber > 1 ? buildPageUrl(url, pageNumber - 1, pageSize) : null;
  const nextUrl = pageNumber < totalPages ? buildPageUrl(url, pageNumber + 1, pageSize) : null;

  const responseBody = {
    data: result.deportistas.map(serializeListItem),
    links: {
      self: selfUrl,
      first: firstUrl,
      last: lastUrl,
      prev: prevUrl,
      next: nextUrl,
    },
    meta: { total: result.total },
  };

  return new Response(JSON.stringify(responseBody), {
    status: 200,
    headers: { 'Content-Type': JSON_API_CONTENT_TYPE },
  });
}

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    const body: JsonApiErrors = {
      errors: [{ status: '401', code: 'UNAUTHENTICATED', title: 'No autorizado' }],
    };
    return new Response(JSON.stringify(body), {
      status: 401,
      headers: { 'Content-Type': JSON_API_CONTENT_TYPE },
    });
  }

  const contentType = request.headers.get('Content-Type') ?? '';
  if (!contentType.includes('application/vnd.api+json')) {
    const body: JsonApiErrors = {
      errors: [
        {
          status: '415',
          code: 'UNSUPPORTED_MEDIA_TYPE',
          title: 'Tipo de contenido no soportado. Use application/vnd.api+json',
        },
      ],
    };
    return new Response(JSON.stringify(body), {
      status: 415,
      headers: { 'Content-Type': JSON_API_CONTENT_TYPE },
    });
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    const body: JsonApiErrors = {
      errors: [{ status: '400', code: 'INVALID_JSON', title: 'JSON inválido' }],
    };
    return new Response(JSON.stringify(body), {
      status: 400,
      headers: { 'Content-Type': JSON_API_CONTENT_TYPE },
    });
  }

  const parsed = postBodySchema.safeParse(rawBody);
  if (!parsed.success) {
    const body: JsonApiErrors = {
      errors: parsed.error.issues.map((e) => ({
        status: '422',
        code: 'VALIDATION_ERROR',
        title: e.message,
        source: { pointer: `/data/attributes/${String(e.path[e.path.length - 1] ?? '')}` },
      })),
    };
    return new Response(JSON.stringify(body), {
      status: 422,
      headers: { 'Content-Type': JSON_API_CONTENT_TYPE },
    });
  }

  const attrs = parsed.data.data.attributes;

  try {
    const deportistaData = {
      apellido: attrs.apellido.trim(),
      nombre: attrs.nombre.trim(),
      dni: attrs.dni.trim(),
      fechaNacimiento: new Date(attrs.fechaNacimiento),
      provincia: attrs.provincia?.trim() || null,
      ciudad: attrs.ciudad?.trim() || null,
      genero: attrs.genero || null,
      telefono: attrs.telefono?.trim() || null,
      email: attrs.email?.trim() || null,
      domicilioActual: attrs.domicilioActual?.trim() || null,
      nacionalidad: attrs.nacionalidad?.trim() || null,
      contactoEmergencia: attrs.contactoEmergencia?.trim() || null,
      vivePensionClub: attrs.vivePensionClub ?? false,
      vivePensionExterna: attrs.vivePensionExterna ?? false,
      observaciones: attrs.observaciones?.trim() || null,
      disciplina: attrs.disciplina || null,
      categoria: attrs.categoria || null,
      posicion: attrs.posicion?.trim() || null,
      estado: attrs.estado,
      actividadComplementaria: attrs.actividadComplementaria || null,
      fechaIngreso: attrs.fechaIngreso ? new Date(attrs.fechaIngreso) : null,
      esRepresentante: attrs.esRepresentante ?? false,
    };

    const deportista = await prisma.deportista.create({ data: deportistaData });
    const deportistaId = deportista.id;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const satOps: Promise<any>[] = [];

    if (attrs.clubesAnteriores && attrs.clubesAnteriores.length > 0) {
      satOps.push(
        prisma.clubAnterior.createMany({
          data: attrs.clubesAnteriores.map((c) => ({
            deportistaId,
            nombre: c.nombre,
            periodo: c.periodo || null,
          })),
        }),
      );
    }

    const de = attrs.datosEscolares;
    if (de && (de.nivelEstudio || de.nombreColegio || de.anoCursa != null || de.materiasAdeudadas)) {
      satOps.push(
        prisma.datosEscolares.create({
          data: {
            deportistaId,
            nivelEstudio: de.nivelEstudio || null,
            nombreColegio: de.nombreColegio?.trim() || null,
            anoCursa: de.anoCursa ?? null,
            materiasAdeudadas: de.materiasAdeudadas?.trim() || null,
          },
        }),
      );
    }

    const ds = attrs.datosSociales;
    if (ds && (ds.trabaja != null || ds.situacionLaboralHogar || ds.conQuienVive || ds.composicionGrupoFamiliar)) {
      satOps.push(
        prisma.datosSociales.create({
          data: {
            deportistaId,
            trabaja: ds.trabaja ?? null,
            situacionLaboralHogar: ds.situacionLaboralHogar || null,
            conQuienVive: ds.conQuienVive?.trim() || null,
            composicionGrupoFamiliar: ds.composicionGrupoFamiliar?.trim() || null,
          },
        }),
      );
    }

    const df = attrs.datosFamiliares;
    if (
      df &&
      (df.padreNombre || df.padreApellido || df.padreNacionalidad || df.padreOcupacion ||
        df.madreNombre || df.madreApellido || df.madreNacionalidad || df.madreOcupacion)
    ) {
      satOps.push(
        prisma.datosFamiliares.create({
          data: {
            deportistaId,
            padreNombre: df.padreNombre?.trim() || null,
            padreApellido: df.padreApellido?.trim() || null,
            padreNacionalidad: df.padreNacionalidad?.trim() || null,
            padreOcupacion: df.padreOcupacion?.trim() || null,
            madreNombre: df.madreNombre?.trim() || null,
            madreApellido: df.madreApellido?.trim() || null,
            madreNacionalidad: df.madreNacionalidad?.trim() || null,
            madreOcupacion: df.madreOcupacion?.trim() || null,
          },
        }),
      );
    }

    const vf = attrs.viviendaFamiliar;
    if (
      vf &&
      (vf.personasDependientes != null ||
        vf.medioTransporte ||
        vf.condicionVivienda ||
        vf.cuentaConHabitaciones != null ||
        (vf.servicios && vf.servicios.length > 0))
    ) {
      satOps.push(
        prisma.viviendaFamiliar.create({
          data: {
            deportistaId,
            personasDependientes: vf.personasDependientes ?? null,
            medioTransporte: vf.medioTransporte || null,
            condicionVivienda: vf.condicionVivienda || null,
            cuentaConHabitaciones: vf.cuentaConHabitaciones ?? null,
            ...(vf.servicios && vf.servicios.length > 0
              ? {
                  servicios: {
                    createMany: {
                      data: vf.servicios.map((s) => ({ servicio: s })),
                    },
                  },
                }
              : {}),
          },
        }),
      );
    }

    const na = attrs.necesidadesApoyo;
    if (
      na &&
      (na.dificultadAlimentacion ||
        na.recibeVianda != null ||
        na.esSocio != null ||
        (na.apoyosRequeridos && na.apoyosRequeridos.length > 0))
    ) {
      satOps.push(
        prisma.necesidadesApoyo.create({
          data: {
            deportistaId,
            dificultadAlimentacion: na.dificultadAlimentacion || null,
            recibeVianda: na.recibeVianda ?? false,
            esSocio: na.esSocio ?? false,
            ...(na.apoyosRequeridos && na.apoyosRequeridos.length > 0
              ? {
                  apoyosRequeridos: {
                    createMany: {
                      data: na.apoyosRequeridos.map((t) => ({ tipo: t })),
                    },
                  },
                }
              : {}),
          },
        }),
      );
    }

    const sal = attrs.datosSalud;
    if (
      sal &&
      (sal.grupoSanguineo ||
        sal.horasSuenio ||
        sal.obraSocial ||
        sal.antecedenteMuerteSubitaFamiliar != null ||
        sal.antecedentesQuirurgicos ||
        sal.medicacionCronica ||
        sal.historialLesiones ||
        (sal.enfermedadesPreexistentes && sal.enfermedadesPreexistentes.length > 0) ||
        (sal.antecedentesEnfermedadesFam && sal.antecedentesEnfermedadesFam.length > 0))
    ) {
      satOps.push(
        prisma.datosSalud.create({
          data: {
            deportistaId,
            grupoSanguineo: sal.grupoSanguineo?.trim() || null,
            horasSuenio: sal.horasSuenio?.trim() || null,
            obraSocial: sal.obraSocial?.trim() || null,
            antecedenteMuerteSubitaFamiliar: sal.antecedenteMuerteSubitaFamiliar ?? null,
            antecedentesQuirurgicos: sal.antecedentesQuirurgicos?.trim() || null,
            medicacionCronica: sal.medicacionCronica?.trim() || null,
            historialLesiones: sal.historialLesiones?.trim() || null,
            ...(sal.enfermedadesPreexistentes && sal.enfermedadesPreexistentes.length > 0
              ? {
                  enfermedadesPreexistentes: {
                    createMany: {
                      data: sal.enfermedadesPreexistentes.map((e) => ({ enfermedad: e })),
                    },
                  },
                }
              : {}),
            ...(sal.antecedentesEnfermedadesFam && sal.antecedentesEnfermedadesFam.length > 0
              ? {
                  antecedentesEnfermedadesFam: {
                    createMany: {
                      data: sal.antecedentesEnfermedadesFam.map((a) => ({ antecedente: a })),
                    },
                  },
                }
              : {}),
          },
        }),
      );
    }

    if (satOps.length > 0) {
      await Promise.all(satOps);
    }

    // Fetch the full record to return it
    const full = await prisma.deportista.findUnique({
      where: { id: deportistaId },
      include: {
        clubesAnteriores: true,
        historiaDeportiva: true,
        datosEscolares: true,
        datosSociales: true,
        viviendaFamiliar: { include: { servicios: true } },
        datosFamiliares: true,
        necesidadesApoyo: { include: { apoyosRequeridos: true } },
        datosSalud: {
          include: {
            enfermedadesPreexistentes: true,
            antecedentesEnfermedadesFam: true,
          },
        },
      },
    });

    const responseBody = { data: serializeFullItem(full as DeportistaWithRelations) };

    const origin = new URL(request.url).origin;
    return new Response(JSON.stringify(responseBody), {
      status: 201,
      headers: {
        'Content-Type': JSON_API_CONTENT_TYPE,
        Location: `${origin}/api/deportistas/${deportistaId}`,
      },
    });
  } catch (error) {
    console.error('POST /api/deportistas error:', error);
    const body: JsonApiErrors = {
      errors: [
        {
          status: '500',
          code: 'INTERNAL_ERROR',
          title: 'Error interno',
          detail: error instanceof Error ? error.message : 'Error desconocido',
        },
      ],
    };
    return new Response(JSON.stringify(body), {
      status: 500,
      headers: { 'Content-Type': JSON_API_CONTENT_TYPE },
    });
  }
}
