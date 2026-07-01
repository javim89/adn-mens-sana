-- CreateEnum
CREATE TYPE "PrioridadSeguimiento" AS ENUM ('BAJA', 'MEDIA', 'ALTA', 'URGENTE');

-- CreateTable
CREATE TABLE "seguimientos" (
    "id" TEXT NOT NULL,
    "deportista_id" TEXT NOT NULL,
    "profesional_id" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "titulo" TEXT NOT NULL,
    "descripcion" TEXT,
    "recomendaciones" TEXT,
    "resultados_evaluacion" TEXT,
    "prioridad" "PrioridadSeguimiento" NOT NULL DEFAULT 'MEDIA',
    "proxima_cita" TIMESTAMP(3),
    "alerta_seguimiento" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "seguimientos_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "seguimientos" ADD CONSTRAINT "seguimientos_deportista_id_fkey" FOREIGN KEY ("deportista_id") REFERENCES "deportistas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
