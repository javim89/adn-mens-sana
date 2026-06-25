-- CreateEnum
CREATE TYPE "EnfermedadPreexistente" AS ENUM ('PRESION_ARTERIAL', 'DIABETES', 'ASMA', 'CHAGAS', 'EPILEPSIA', 'MIGRANA', 'COVID', 'ALERGIAS', 'ETS', 'OTRO');

-- CreateEnum
CREATE TYPE "AntecedenteEnfermedadFamiliar" AS ENUM ('DIABETES', 'EPOC', 'DISLIPEMIAS', 'HIPOTIROIDISMO', 'HIPERTIROIDISMO', 'ASMA', 'CANCER', 'CHAGAS', 'MIGRANA', 'HIPERTENSION_ARTERIAL', 'CORONARIOPATIAS', 'OTRO');

-- CreateTable
CREATE TABLE "datos_salud" (
    "id" TEXT NOT NULL,
    "deportista_id" TEXT NOT NULL,
    "grupo_sanguineo" TEXT,
    "horas_suenio" TEXT,
    "obra_social" TEXT,
    "antecedente_muerte_subita_familiar" BOOLEAN,
    "antecedentes_quirurgicos" TEXT,
    "medicacion_cronica" TEXT,
    "historial_lesiones" TEXT,

    CONSTRAINT "datos_salud_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "enfermedades_preexistentes" (
    "id" TEXT NOT NULL,
    "datos_salud_id" TEXT NOT NULL,
    "enfermedad" "EnfermedadPreexistente" NOT NULL,

    CONSTRAINT "enfermedades_preexistentes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "antecedentes_enfermedades_familiares" (
    "id" TEXT NOT NULL,
    "datos_salud_id" TEXT NOT NULL,
    "antecedente" "AntecedenteEnfermedadFamiliar" NOT NULL,

    CONSTRAINT "antecedentes_enfermedades_familiares_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "datos_salud_deportista_id_key" ON "datos_salud"("deportista_id");

-- CreateIndex
CREATE UNIQUE INDEX "enfermedades_preexistentes_datos_salud_id_enfermedad_key" ON "enfermedades_preexistentes"("datos_salud_id", "enfermedad");

-- CreateIndex
CREATE UNIQUE INDEX "antecedentes_enfermedades_familiares_datos_salud_id_antecedente_key" ON "antecedentes_enfermedades_familiares"("datos_salud_id", "antecedente");

-- AddForeignKey
ALTER TABLE "datos_salud" ADD CONSTRAINT "datos_salud_deportista_id_fkey" FOREIGN KEY ("deportista_id") REFERENCES "deportistas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enfermedades_preexistentes" ADD CONSTRAINT "enfermedades_preexistentes_datos_salud_id_fkey" FOREIGN KEY ("datos_salud_id") REFERENCES "datos_salud"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "antecedentes_enfermedades_familiares" ADD CONSTRAINT "antecedentes_enfermedades_familiares_datos_salud_id_fkey" FOREIGN KEY ("datos_salud_id") REFERENCES "datos_salud"("id") ON DELETE CASCADE ON UPDATE CASCADE;
