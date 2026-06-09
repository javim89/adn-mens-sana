-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Disciplina" AS ENUM ('FUTBOL', 'FUTSAL', 'BASQUET', 'VOLEY', 'HANDBALL', 'NATACION', 'ATLETISMO', 'HOCKEY', 'RUGBY', 'TENIS', 'GIMNASIA', 'GIMNASIA_ARTISTICA', 'PATIN', 'ARTES_MARCIALES', 'COMBATE', 'INICIACION_DEPORTIVA', 'POWER_CHAIR', 'TIADE', 'AJEDREZ', 'BOXEO', 'OTRO');

-- CreateEnum
CREATE TYPE "Categoria" AS ENUM ('SUB_12', 'SUB_14', 'SUB_16', 'SUB_18', 'NOVENA', 'OCTAVA', 'SEPTIMA', 'SEXTA', 'QUINTA', 'CUARTA', 'RESERVA', 'DIVISION_DE_HONOR', 'PRIMERA', 'SENIOR', 'VETERANOS');

-- CreateEnum
CREATE TYPE "EstadoDeportista" AS ENUM ('ACTIVO', 'INACTIVO', 'LESIONADO', 'SUSPENDIDO');

-- CreateEnum
CREATE TYPE "Genero" AS ENUM ('MASCULINO', 'FEMENINO', 'NO_BINARIO', 'PREFIERO_NO_DECIR');

-- CreateEnum
CREATE TYPE "ActividadComplementaria" AS ENUM ('GIMNASIO', 'TECNICA_INDIVIDUAL', 'AMBAS', 'NINGUNA');

-- CreateEnum
CREATE TYPE "NivelEstudio" AS ENUM ('PRIMARIO_INCOMPLETO', 'PRIMARIO_EN_CURSO', 'PRIMARIO_COMPLETO', 'SECUNDARIO_INCOMPLETO', 'SECUNDARIO_EN_CURSO', 'SECUNDARIO_COMPLETO', 'TERCIARIO_INCOMPLETO', 'TERCIARIO_EN_CURSO', 'TERCIARIO_COMPLETO');

-- CreateEnum
CREATE TYPE "SituacionLaboral" AS ENUM ('ALGUIEN_TRABAJA', 'NADIE_TRABAJA', 'SIN_DATO');

-- CreateEnum
CREATE TYPE "MedioTransporte" AS ENUM ('TRANSPORTE_PUBLICO', 'TRANSPORTE_FAMILIAR', 'TRANSPORTE_DEL_CLUB', 'OTRO');

-- CreateEnum
CREATE TYPE "CondicionVivienda" AS ENUM ('PROPIA', 'CEDIDA', 'ALQUILADA', 'OTRO');

-- CreateEnum
CREATE TYPE "DificultadAlimentacion" AS ENUM ('NUNCA', 'A_VECES', 'FRECUENTEMENTE');

-- CreateEnum
CREATE TYPE "TipoApoyo" AS ENUM ('ECONOMICO', 'ALIMENTACION', 'TRANSPORTE', 'EDUCATIVO', 'PSICOLOGICO', 'NINGUNO', 'OTRO');

-- CreateEnum
CREATE TYPE "Servicio" AS ENUM ('LUZ', 'GAS', 'AGUA_CORRIENTE', 'TELEFONO', 'CABLE', 'INTERNET', 'SEGURIDAD', 'ALARMA', 'NINGUNA');

-- CreateTable
CREATE TABLE "deportistas" (
    "id" TEXT NOT NULL,
    "apellido" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "dni" TEXT NOT NULL,
    "fecha_nacimiento" TIMESTAMP(3) NOT NULL,
    "provincia" TEXT,
    "ciudad" TEXT,
    "genero" "Genero",
    "telefono" TEXT,
    "email" TEXT,
    "domicilio_actual" TEXT,
    "nacionalidad" TEXT,
    "contacto_emergencia" TEXT,
    "vive_pension_club" BOOLEAN NOT NULL DEFAULT false,
    "vive_pension_externa" BOOLEAN NOT NULL DEFAULT false,
    "observaciones" TEXT,
    "disciplina" "Disciplina",
    "categoria" "Categoria",
    "posicion" TEXT,
    "estado" "EstadoDeportista" NOT NULL DEFAULT 'ACTIVO',
    "actividad_complementaria" "ActividadComplementaria",
    "fecha_ingreso" TIMESTAMP(3),
    "es_representante" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "deportistas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clubes_anteriores" (
    "id" TEXT NOT NULL,
    "deportista_id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "periodo" TEXT,

    CONSTRAINT "clubes_anteriores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "historia_deportiva" (
    "id" TEXT NOT NULL,
    "deportista_id" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "historia_deportiva_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "datos_escolares" (
    "id" TEXT NOT NULL,
    "deportista_id" TEXT NOT NULL,
    "nivel_estudio" "NivelEstudio",
    "nombre_colegio" TEXT,
    "ano_cursa" INTEGER,
    "materias_adeudadas" TEXT,

    CONSTRAINT "datos_escolares_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "datos_sociales" (
    "id" TEXT NOT NULL,
    "deportista_id" TEXT NOT NULL,
    "trabaja" BOOLEAN,
    "situacion_laboral_hogar" "SituacionLaboral",
    "con_quien_vive" TEXT,
    "composicion_grupo_familiar" TEXT,

    CONSTRAINT "datos_sociales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "datos_familiares" (
    "id" TEXT NOT NULL,
    "deportista_id" TEXT NOT NULL,
    "padre_nombre" TEXT,
    "padre_apellido" TEXT,
    "padre_nacionalidad" TEXT,
    "padre_ocupacion" TEXT,
    "madre_nombre" TEXT,
    "madre_apellido" TEXT,
    "madre_nacionalidad" TEXT,
    "madre_ocupacion" TEXT,

    CONSTRAINT "datos_familiares_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vivienda_familiar" (
    "id" TEXT NOT NULL,
    "deportista_id" TEXT NOT NULL,
    "personas_dependientes" INTEGER,
    "medio_transporte" "MedioTransporte",
    "condicion_vivienda" "CondicionVivienda",
    "cuenta_con_habitaciones" BOOLEAN,

    CONSTRAINT "vivienda_familiar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "servicios_vivienda" (
    "id" TEXT NOT NULL,
    "vivienda_familiar_id" TEXT NOT NULL,
    "servicio" "Servicio" NOT NULL,

    CONSTRAINT "servicios_vivienda_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "necesidades_apoyo" (
    "id" TEXT NOT NULL,
    "deportista_id" TEXT NOT NULL,
    "dificultad_alimentacion" "DificultadAlimentacion",
    "recibe_vianda" BOOLEAN NOT NULL DEFAULT false,
    "es_socio" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "necesidades_apoyo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "apoyos_requeridos" (
    "id" TEXT NOT NULL,
    "necesidades_apoyo_id" TEXT NOT NULL,
    "tipo" "TipoApoyo" NOT NULL,

    CONSTRAINT "apoyos_requeridos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "deportistas_dni_key" ON "deportistas"("dni");

-- CreateIndex
CREATE UNIQUE INDEX "deportistas_email_key" ON "deportistas"("email");

-- CreateIndex
CREATE UNIQUE INDEX "datos_escolares_deportista_id_key" ON "datos_escolares"("deportista_id");

-- CreateIndex
CREATE UNIQUE INDEX "datos_sociales_deportista_id_key" ON "datos_sociales"("deportista_id");

-- CreateIndex
CREATE UNIQUE INDEX "datos_familiares_deportista_id_key" ON "datos_familiares"("deportista_id");

-- CreateIndex
CREATE UNIQUE INDEX "vivienda_familiar_deportista_id_key" ON "vivienda_familiar"("deportista_id");

-- CreateIndex
CREATE UNIQUE INDEX "servicios_vivienda_vivienda_familiar_id_servicio_key" ON "servicios_vivienda"("vivienda_familiar_id", "servicio");

-- CreateIndex
CREATE UNIQUE INDEX "necesidades_apoyo_deportista_id_key" ON "necesidades_apoyo"("deportista_id");

-- CreateIndex
CREATE UNIQUE INDEX "apoyos_requeridos_necesidades_apoyo_id_tipo_key" ON "apoyos_requeridos"("necesidades_apoyo_id", "tipo");

-- AddForeignKey
ALTER TABLE "clubes_anteriores" ADD CONSTRAINT "clubes_anteriores_deportista_id_fkey" FOREIGN KEY ("deportista_id") REFERENCES "deportistas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historia_deportiva" ADD CONSTRAINT "historia_deportiva_deportista_id_fkey" FOREIGN KEY ("deportista_id") REFERENCES "deportistas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "datos_escolares" ADD CONSTRAINT "datos_escolares_deportista_id_fkey" FOREIGN KEY ("deportista_id") REFERENCES "deportistas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "datos_sociales" ADD CONSTRAINT "datos_sociales_deportista_id_fkey" FOREIGN KEY ("deportista_id") REFERENCES "deportistas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "datos_familiares" ADD CONSTRAINT "datos_familiares_deportista_id_fkey" FOREIGN KEY ("deportista_id") REFERENCES "deportistas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vivienda_familiar" ADD CONSTRAINT "vivienda_familiar_deportista_id_fkey" FOREIGN KEY ("deportista_id") REFERENCES "deportistas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "servicios_vivienda" ADD CONSTRAINT "servicios_vivienda_vivienda_familiar_id_fkey" FOREIGN KEY ("vivienda_familiar_id") REFERENCES "vivienda_familiar"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "necesidades_apoyo" ADD CONSTRAINT "necesidades_apoyo_deportista_id_fkey" FOREIGN KEY ("deportista_id") REFERENCES "deportistas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "apoyos_requeridos" ADD CONSTRAINT "apoyos_requeridos_necesidades_apoyo_id_fkey" FOREIGN KEY ("necesidades_apoyo_id") REFERENCES "necesidades_apoyo"("id") ON DELETE CASCADE ON UPDATE CASCADE;
