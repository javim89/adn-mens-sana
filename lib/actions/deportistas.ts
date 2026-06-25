'use server';

import { auth } from '@clerk/nextjs/server';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import type { DeportistaFormData } from '@/lib/types/deportistas';

// ---------------------------------------------------------------------------
// createDeportista
// ---------------------------------------------------------------------------

export async function createDeportista(
  data: DeportistaFormData,
): Promise<{ success: true; id: string } | { success: false; error: string }> {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error('No autorizado');

    // Validate required fields
    if (!data.apellido?.trim()) return { success: false, error: 'El apellido es requerido' };
    if (!data.nombre?.trim()) return { success: false, error: 'El nombre es requerido' };
    if (!data.dni?.trim()) return { success: false, error: 'El DNI es requerido' };
    if (!data.fechaNacimiento) return { success: false, error: 'La fecha de nacimiento es requerida' };

    // Build the main deportista create data
    const deportistaData = {
      apellido: data.apellido.trim(),
      nombre: data.nombre.trim(),
      dni: data.dni.trim(),
      fechaNacimiento: new Date(data.fechaNacimiento),
      provincia: data.provincia?.trim() || null,
      ciudad: data.ciudad?.trim() || null,
      genero: data.genero || null,
      telefono: data.telefono?.trim() || null,
      email: data.email?.trim() || null,
      domicilioActual: data.domicilioActual?.trim() || null,
      nacionalidad: data.nacionalidad?.trim() || null,
      contactoEmergencia: data.contactoEmergencia?.trim() || null,
      vivePensionClub: data.vivePensionClub ?? false,
      vivePensionExterna: data.vivePensionExterna ?? false,
      observaciones: data.observaciones?.trim() || null,
      disciplina: data.disciplina || null,
      categoria: data.categoria || null,
      posicion: data.posicion?.trim() || null,
      estado: data.estado,
      actividadComplementaria: data.actividadComplementaria || null,
      fechaIngreso: data.fechaIngreso ? new Date(data.fechaIngreso) : null,
      esRepresentante: data.esRepresentante ?? false,
    };

    // Create main record first to get the ID
    const deportista = await prisma.deportista.create({ data: deportistaData });
    const deportistaId = deportista.id;

    // Build satellite operations array (Promise-based, for $transaction)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const satOps: Promise<any>[] = [];

    if (data.clubesAnteriores && data.clubesAnteriores.length > 0) {
      satOps.push(
        prisma.clubAnterior.createMany({
          data: data.clubesAnteriores.map((c) => ({
            deportistaId,
            nombre: c.nombre,
            periodo: c.periodo || null,
          })),
        }),
      );
    }

    const de = data.datosEscolares;
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

    const ds = data.datosSociales;
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

    const df = data.datosFamiliares;
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

    const vf = data.viviendaFamiliar;
    if (vf && (vf.personasDependientes != null || vf.medioTransporte || vf.condicionVivienda || vf.cuentaConHabitaciones != null || (vf.servicios && vf.servicios.length > 0))) {
      const viviendaOp = prisma.viviendaFamiliar.create({
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
      });
      satOps.push(viviendaOp);
    }

    const na = data.necesidadesApoyo;
    if (na && (na.dificultadAlimentacion || na.recibeVianda != null || na.esSocio != null || (na.apoyosRequeridos && na.apoyosRequeridos.length > 0))) {
      const apoyoOp = prisma.necesidadesApoyo.create({
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
      });
      satOps.push(apoyoOp);
    }

    const sal = data.datosSalud;
    if (sal) {
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

    revalidatePath('/deportistas');
    return { success: true, id: deportistaId };
  } catch (error) {
    console.error('createDeportista error:', error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'Error al crear el deportista' };
  }
}

// ---------------------------------------------------------------------------
// updateDeportista
// ---------------------------------------------------------------------------

export async function updateDeportista(
  id: string,
  data: DeportistaFormData,
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error('No autorizado');

    // Verify existence
    const existing = await prisma.deportista.findUnique({ where: { id } });
    if (!existing) return { success: false, error: 'Deportista no encontrado' };

    // Update main record
    await prisma.deportista.update({
      where: { id },
      data: {
        apellido: data.apellido.trim(),
        nombre: data.nombre.trim(),
        dni: data.dni.trim(),
        fechaNacimiento: new Date(data.fechaNacimiento),
        provincia: data.provincia?.trim() || null,
        ciudad: data.ciudad?.trim() || null,
        genero: data.genero || null,
        telefono: data.telefono?.trim() || null,
        email: data.email?.trim() || null,
        domicilioActual: data.domicilioActual?.trim() || null,
        nacionalidad: data.nacionalidad?.trim() || null,
        contactoEmergencia: data.contactoEmergencia?.trim() || null,
        vivePensionClub: data.vivePensionClub ?? false,
        vivePensionExterna: data.vivePensionExterna ?? false,
        observaciones: data.observaciones?.trim() || null,
        disciplina: data.disciplina || null,
        categoria: data.categoria || null,
        posicion: data.posicion?.trim() || null,
        estado: data.estado,
        actividadComplementaria: data.actividadComplementaria || null,
        fechaIngreso: data.fechaIngreso ? new Date(data.fechaIngreso) : null,
        esRepresentante: data.esRepresentante ?? false,
      },
    });

    // Handle club anteriores: delete all and re-create
    await prisma.clubAnterior.deleteMany({ where: { deportistaId: id } });
    if (data.clubesAnteriores && data.clubesAnteriores.length > 0) {
      await prisma.clubAnterior.createMany({
        data: data.clubesAnteriores.map((c) => ({
          deportistaId: id,
          nombre: c.nombre,
          periodo: c.periodo || null,
        })),
      });
    }

    // Upsert datos escolares
    const de = data.datosEscolares;
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
    const ds = data.datosSociales;
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
    const df = data.datosFamiliares;
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
    const vf = data.viviendaFamiliar;
    if (vf && (vf.personasDependientes != null || vf.medioTransporte || vf.condicionVivienda || vf.cuentaConHabitaciones != null || (vf.servicios && vf.servicios.length > 0))) {
      const viviendaExisting = await prisma.viviendaFamiliar.findUnique({ where: { deportistaId: id } });
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
    const na = data.necesidadesApoyo;
    if (na && (na.dificultadAlimentacion || na.recibeVianda != null || na.esSocio != null || (na.apoyosRequeridos && na.apoyosRequeridos.length > 0))) {
      const necesidadesExisting = await prisma.necesidadesApoyo.findUnique({ where: { deportistaId: id } });
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

    // Upsert datos salud
    const sal = data.datosSalud;
    if (sal) {
      const saludExisting = await prisma.datosSalud.findUnique({ where: { deportistaId: id } });
      if (saludExisting) {
        await prisma.enfermedadPreexistenteItem.deleteMany({ where: { datosSaludId: saludExisting.id } });
        await prisma.antecedenteEnfermedadFamiliarItem.deleteMany({ where: { datosSaludId: saludExisting.id } });
        await prisma.datosSalud.update({
          where: { deportistaId: id },
          data: {
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
        });
      } else {
        await prisma.datosSalud.create({
          data: {
            deportistaId: id,
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
        });
      }
    }

    revalidatePath('/deportistas');
    revalidatePath('/deportistas/' + id);
    return { success: true };
  } catch (error) {
    console.error('updateDeportista error:', error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'Error al actualizar el deportista' };
  }
}

// ---------------------------------------------------------------------------
// deleteDeportista
// ---------------------------------------------------------------------------

export async function deleteDeportista(
  id: string,
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error('No autorizado');

    await prisma.deportista.delete({ where: { id } });

    revalidatePath('/deportistas');
    return { success: true };
  } catch (error) {
    console.error('deleteDeportista error:', error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'Error al eliminar el deportista' };
  }
}
