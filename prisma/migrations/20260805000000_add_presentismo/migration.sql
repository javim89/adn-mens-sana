-- CreateEnum
CREATE TYPE "TipoSesion" AS ENUM ('TECNICO', 'TACTICO', 'FISICO', 'MIXTO', 'RECUPERACION');

-- CreateEnum
CREATE TYPE "EstadoAsistencia" AS ENUM ('PRESENTE', 'AUSENTE', 'LLEGO_TARDE', 'SE_RETIRO_ANTES');

-- CreateTable
CREATE TABLE "entrenamientos" (
    "id" TEXT NOT NULL,
    "fecha" DATE NOT NULL,
    "entrenador_id" TEXT NOT NULL,
    "tipo_sesion" "TipoSesion" NOT NULL,
    "objetivos" TEXT,
    "disciplina_id" TEXT NOT NULL,
    "categoria_id" TEXT NOT NULL,
    "registrado_por" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "entrenamientos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asistencias" (
    "id" TEXT NOT NULL,
    "entrenamiento_id" TEXT NOT NULL,
    "deportista_id" TEXT NOT NULL,
    "estado" "EstadoAsistencia" NOT NULL DEFAULT 'PRESENTE',
    "notas" TEXT,

    CONSTRAINT "asistencias_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "asistencias_entrenamiento_id_deportista_id_key" ON "asistencias"("entrenamiento_id", "deportista_id");

-- AddForeignKey
ALTER TABLE "entrenamientos" ADD CONSTRAINT "entrenamientos_disciplina_id_fkey" FOREIGN KEY ("disciplina_id") REFERENCES "disciplinas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entrenamientos" ADD CONSTRAINT "entrenamientos_categoria_id_fkey" FOREIGN KEY ("categoria_id") REFERENCES "categorias"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asistencias" ADD CONSTRAINT "asistencias_entrenamiento_id_fkey" FOREIGN KEY ("entrenamiento_id") REFERENCES "entrenamientos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asistencias" ADD CONSTRAINT "asistencias_deportista_id_fkey" FOREIGN KEY ("deportista_id") REFERENCES "deportistas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
