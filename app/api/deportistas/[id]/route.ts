import { auth } from '@clerk/nextjs/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import type { DeportistaWithRelations } from '@/lib/types/deportistas';
import type { JsonApiErrors } from '@/lib/types/jsonapi';
import type { DeportistaDetailAttributes } from '@/lib/api/deportistas';
import type { JsonApiResource } from '@/lib/types/jsonapi';

const JSON_API_CONTENT_TYPE = 'application/vnd.api+json';

// ---------------------------------------------------------------------------
// Zod schemas (mirrors route.ts but all fields optional for PATCH)
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

const patchAttributesSchema = z.object({
  apellido: z.string().min(1, 'El apellido es requerido').optional(),
  nombre: z.string().min(1, 'El nombre es requerido').optional(),
  dni: z.string().regex(/^\d{7,8}$/, 'El DNI debe tener 7 u 8 dígitos').optional(),
  fechaNacimiento: z.string().min(1, 'La fecha de nacimiento es requerida').optional(),
  provincia: z.string().optional(),
  ciudad: z.string().optional(),
  genero: z.enum(GeneroValues).optional(),
  telefono: z.string().optional(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  domicilioActual: z.string().optional(),
  nacionalidad: z.string().optional(),
  contactoEmergencia: z.string().optional(),
  vivePensionClub: z.boolean().optional(),
  vivePensionExterna: z.boolean().optional(),
  observaciones: z.string().optional(),
  disciplina: z.enum(DisciplinaValues).optional(),
  categoria: z.enum(CategoriaValues).optional(),
  posicion: z.string().optional(),
  estado: z.enum(EstadoValues).optional(),
  actividadComplementaria: z.enum(ActividadComplementariaValues).optional(),
  fechaIngreso: z.string().optional(),
  esRepresentante: z.boolean().optional(),
  clubesAnteriores: z
    .array(z.object({ nombre: z.string(), periodo: z.string().optional() }))
    .optional(),
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
      servicios: z.array(z.enum(ServicioValues)).optional(),
    })
    .optional(),
  necesidadesApoyo: z
    .object({
      dificultadAlimentacion: z.enum(DificultadAlimentacionValues).optional(),
      recibeVianda: z.boolean().optional(),
      esSocio: z.boolean().optional(),
      apoyosRequeridos: z.array(z.enum(TipoApoyoValues)).optional(),
    })
    .optional(),
});

const patchBodySchema = z.object({
  data: z.object({
    type: z.literal('deportistas'),
    id: z.string(),
    attributes: patchAttributesSchema,
  }),
});

// ---------------------------------------------------------------------------
// Serializer
// ---------------------------------------------------------------------------

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
    },
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function findDeportista(id: string): Promise<DeportistaWithRelations | null> {
  return prisma.deportista.findUnique({
    where: { id },
    include: {
      clubesAnteriores: true,
      historiaDeportiva: true,
      datosEscolares: true,
      datosSociales: true,
      viviendaFamiliar: { include: { servicios: true } },
      datosFamiliares: true,
      necesidadesApoyo: { include: { apoyosRequeridos: true } },
    },
  }) as Promise<DeportistaWithRelations | null>;
}

function notFoundBody(): JsonApiErrors {
  return {
    errors: [{ status: '404', code: 'NOT_FOUND', title: 'Deportista no encontrado' }],
  };
}

// ---------------------------------------------------------------------------
// Route handlers
// ---------------------------------------------------------------------------

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId } = await auth();
  if (!userId) {
    return new Response(
      JSON.stringify({
        errors: [{ status: '401', code: 'UNAUTHENTICATED', title: 'No autorizado' }],
      } satisfies JsonApiErrors),
      { status: 401, headers: { 'Content-Type': JSON_API_CONTENT_TYPE } },
    );
  }

  const { id } = await params;
  const deportista = await findDeportista(id);
  if (!deportista) {
    return new Response(JSON.stringify(notFoundBody()), {
      status: 404,
      headers: { 'Content-Type': JSON_API_CONTENT_TYPE },
    });
  }

  return new Response(JSON.stringify({ data: serializeFullItem(deportista) }), {
    status: 200,
    headers: { 'Content-Type': JSON_API_CONTENT_TYPE },
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId } = await auth();
  if (!userId) {
    return new Response(
      JSON.stringify({
        errors: [{ status: '401', code: 'UNAUTHENTICATED', title: 'No autorizado' }],
      } satisfies JsonApiErrors),
      { status: 401, headers: { 'Content-Type': JSON_API_CONTENT_TYPE } },
    );
  }

  const contentType = request.headers.get('Content-Type') ?? '';
  if (!contentType.includes('application/vnd.api+json')) {
    return new Response(
      JSON.stringify({
        errors: [
          {
            status: '415',
            code: 'UNSUPPORTED_MEDIA_TYPE',
            title: 'Tipo de contenido no soportado. Use application/vnd.api+json',
          },
        ],
      } satisfies JsonApiErrors),
      { status: 415, headers: { 'Content-Type': JSON_API_CONTENT_TYPE } },
    );
  }

  const { id } = await params;

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return new Response(
      JSON.stringify({
        errors: [{ status: '400', code: 'INVALID_JSON', title: 'JSON inválido' }],
      } satisfies JsonApiErrors),
      { status: 400, headers: { 'Content-Type': JSON_API_CONTENT_TYPE } },
    );
  }

  const parsed = patchBodySchema.safeParse(rawBody);
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

  if (parsed.data.data.id !== id) {
    return new Response(
      JSON.stringify({
        errors: [
          {
            status: '409',
            code: 'ID_MISMATCH',
            title: 'El id del cuerpo no coincide con el id de la URL',
          },
        ],
      } satisfies JsonApiErrors),
      { status: 409, headers: { 'Content-Type': JSON_API_CONTENT_TYPE } },
    );
  }

  const existing = await prisma.deportista.findUnique({ where: { id } });
  if (!existing) {
    return new Response(JSON.stringify(notFoundBody()), {
      status: 404,
      headers: { 'Content-Type': JSON_API_CONTENT_TYPE },
    });
  }

  const attrs = parsed.data.data.attributes;

  try {
    // Update main record (only provided fields)
    await prisma.deportista.update({
      where: { id },
      data: {
        ...(attrs.apellido !== undefined ? { apellido: attrs.apellido.trim() } : {}),
        ...(attrs.nombre !== undefined ? { nombre: attrs.nombre.trim() } : {}),
        ...(attrs.dni !== undefined ? { dni: attrs.dni.trim() } : {}),
        ...(attrs.fechaNacimiento !== undefined ? { fechaNacimiento: new Date(attrs.fechaNacimiento) } : {}),
        ...(attrs.provincia !== undefined ? { provincia: attrs.provincia?.trim() || null } : {}),
        ...(attrs.ciudad !== undefined ? { ciudad: attrs.ciudad?.trim() || null } : {}),
        ...(attrs.genero !== undefined ? { genero: attrs.genero || null } : {}),
        ...(attrs.telefono !== undefined ? { telefono: attrs.telefono?.trim() || null } : {}),
        ...(attrs.email !== undefined ? { email: attrs.email?.trim() || null } : {}),
        ...(attrs.domicilioActual !== undefined ? { domicilioActual: attrs.domicilioActual?.trim() || null } : {}),
        ...(attrs.nacionalidad !== undefined ? { nacionalidad: attrs.nacionalidad?.trim() || null } : {}),
        ...(attrs.contactoEmergencia !== undefined ? { contactoEmergencia: attrs.contactoEmergencia?.trim() || null } : {}),
        ...(attrs.vivePensionClub !== undefined ? { vivePensionClub: attrs.vivePensionClub } : {}),
        ...(attrs.vivePensionExterna !== undefined ? { vivePensionExterna: attrs.vivePensionExterna } : {}),
        ...(attrs.observaciones !== undefined ? { observaciones: attrs.observaciones?.trim() || null } : {}),
        ...(attrs.disciplina !== undefined ? { disciplina: attrs.disciplina || null } : {}),
        ...(attrs.categoria !== undefined ? { categoria: attrs.categoria || null } : {}),
        ...(attrs.posicion !== undefined ? { posicion: attrs.posicion?.trim() || null } : {}),
        ...(attrs.estado !== undefined ? { estado: attrs.estado } : {}),
        ...(attrs.actividadComplementaria !== undefined ? { actividadComplementaria: attrs.actividadComplementaria || null } : {}),
        ...(attrs.fechaIngreso !== undefined ? { fechaIngreso: attrs.fechaIngreso ? new Date(attrs.fechaIngreso) : null } : {}),
        ...(attrs.esRepresentante !== undefined ? { esRepresentante: attrs.esRepresentante } : {}),
      },
    });

    // Handle clubs anteriores
    if (attrs.clubesAnteriores !== undefined) {
      await prisma.clubAnterior.deleteMany({ where: { deportistaId: id } });
      if (attrs.clubesAnteriores.length > 0) {
        await prisma.clubAnterior.createMany({
          data: attrs.clubesAnteriores.map((c) => ({
            deportistaId: id,
            nombre: c.nombre,
            periodo: c.periodo || null,
          })),
        });
      }
    }

    // Upsert datos escolares
    const de = attrs.datosEscolares;
    if (de && (de.nivelEstudio || de.nombreColegio || de.anoCursa != null || de.materiasAdeudadas)) {
      await prisma.datosEscolares.upsert({
        where: { deportistaId: id },
        create: {
          deportistaId: id,
          nivelEstudio: de.nivelEstudio || null,
          nombreColegio: de.nombreColegio?.trim() || null,
          anoCursa: de.anoCursa ?? null,
          materiasAdeudadas: de.materiasAdeudadas?.trim() || null,
        },
        update: {
          nivelEstudio: de.nivelEstudio || null,
          nombreColegio: de.nombreColegio?.trim() || null,
          anoCursa: de.anoCursa ?? null,
          materiasAdeudadas: de.materiasAdeudadas?.trim() || null,
        },
      });
    }

    // Upsert datos sociales
    const ds = attrs.datosSociales;
    if (ds && (ds.trabaja != null || ds.situacionLaboralHogar || ds.conQuienVive || ds.composicionGrupoFamiliar)) {
      await prisma.datosSociales.upsert({
        where: { deportistaId: id },
        create: {
          deportistaId: id,
          trabaja: ds.trabaja ?? null,
          situacionLaboralHogar: ds.situacionLaboralHogar || null,
          conQuienVive: ds.conQuienVive?.trim() || null,
          composicionGrupoFamiliar: ds.composicionGrupoFamiliar?.trim() || null,
        },
        update: {
          trabaja: ds.trabaja ?? null,
          situacionLaboralHogar: ds.situacionLaboralHogar || null,
          conQuienVive: ds.conQuienVive?.trim() || null,
          composicionGrupoFamiliar: ds.composicionGrupoFamiliar?.trim() || null,
        },
      });
    }

    // Upsert datos familiares
    const df = attrs.datosFamiliares;
    if (
      df &&
      (df.padreNombre || df.padreApellido || df.padreNacionalidad || df.padreOcupacion ||
        df.madreNombre || df.madreApellido || df.madreNacionalidad || df.madreOcupacion)
    ) {
      await prisma.datosFamiliares.upsert({
        where: { deportistaId: id },
        create: {
          deportistaId: id,
          padreNombre: df.padreNombre?.trim() || null,
          padreApellido: df.padreApellido?.trim() || null,
          padreNacionalidad: df.padreNacionalidad?.trim() || null,
          padreOcupacion: df.padreOcupacion?.trim() || null,
          madreNombre: df.madreNombre?.trim() || null,
          madreApellido: df.madreApellido?.trim() || null,
          madreNacionalidad: df.madreNacionalidad?.trim() || null,
          madreOcupacion: df.madreOcupacion?.trim() || null,
        },
        update: {
          padreNombre: df.padreNombre?.trim() || null,
          padreApellido: df.padreApellido?.trim() || null,
          padreNacionalidad: df.padreNacionalidad?.trim() || null,
          padreOcupacion: df.padreOcupacion?.trim() || null,
          madreNombre: df.madreNombre?.trim() || null,
          madreApellido: df.madreApellido?.trim() || null,
          madreNacionalidad: df.madreNacionalidad?.trim() || null,
          madreOcupacion: df.madreOcupacion?.trim() || null,
        },
      });
    }

    // Upsert vivienda familiar
    const vf = attrs.viviendaFamiliar;
    if (
      vf &&
      (vf.personasDependientes != null ||
        vf.medioTransporte ||
        vf.condicionVivienda ||
        vf.cuentaConHabitaciones != null ||
        (vf.servicios && vf.servicios.length > 0))
    ) {
      const viviendaExisting = await prisma.viviendaFamiliar.findUnique({
        where: { deportistaId: id },
      });
      if (viviendaExisting) {
        await prisma.servicioVivienda.deleteMany({ where: { viviendaFamiliarId: viviendaExisting.id } });
        await prisma.viviendaFamiliar.update({
          where: { deportistaId: id },
          data: {
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
        });
      } else {
        await prisma.viviendaFamiliar.create({
          data: {
            deportistaId: id,
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
        });
      }
    }

    // Upsert necesidades apoyo
    const na = attrs.necesidadesApoyo;
    if (
      na &&
      (na.dificultadAlimentacion ||
        na.recibeVianda != null ||
        na.esSocio != null ||
        (na.apoyosRequeridos && na.apoyosRequeridos.length > 0))
    ) {
      const necesidadesExisting = await prisma.necesidadesApoyo.findUnique({
        where: { deportistaId: id },
      });
      if (necesidadesExisting) {
        await prisma.apoyoRequerido.deleteMany({ where: { necesidadesApoyoId: necesidadesExisting.id } });
        await prisma.necesidadesApoyo.update({
          where: { deportistaId: id },
          data: {
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
        });
      } else {
        await prisma.necesidadesApoyo.create({
          data: {
            deportistaId: id,
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
        });
      }
    }

    // Return the updated full record
    const updated = await findDeportista(id);
    return new Response(JSON.stringify({ data: serializeFullItem(updated!) }), {
      status: 200,
      headers: { 'Content-Type': JSON_API_CONTENT_TYPE },
    });
  } catch (error) {
    console.error('PATCH /api/deportistas/[id] error:', error);
    return new Response(
      JSON.stringify({
        errors: [
          {
            status: '500',
            code: 'INTERNAL_ERROR',
            title: 'Error interno',
            detail: error instanceof Error ? error.message : 'Error desconocido',
          },
        ],
      } satisfies JsonApiErrors),
      { status: 500, headers: { 'Content-Type': JSON_API_CONTENT_TYPE } },
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId } = await auth();
  if (!userId) {
    return new Response(
      JSON.stringify({
        errors: [{ status: '401', code: 'UNAUTHENTICATED', title: 'No autorizado' }],
      } satisfies JsonApiErrors),
      { status: 401, headers: { 'Content-Type': JSON_API_CONTENT_TYPE } },
    );
  }

  const { id } = await params;

  const existing = await prisma.deportista.findUnique({ where: { id } });
  if (!existing) {
    return new Response(JSON.stringify(notFoundBody()), {
      status: 404,
      headers: { 'Content-Type': JSON_API_CONTENT_TYPE },
    });
  }

  await prisma.deportista.delete({ where: { id } });
  return new Response(null, { status: 204 });
}
