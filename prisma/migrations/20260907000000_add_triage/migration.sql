-- CreateEnum
CREATE TYPE "NivelTriage" AS ENUM ('VERDE', 'AMARILLO', 'NARANJA', 'ROJO');

-- CreateTable
CREATE TABLE "triage" (
    "id" TEXT NOT NULL,
    "deportista_id" TEXT NOT NULL,
    "nivel" "NivelTriage" NOT NULL,
    "puntaje_total" INTEGER NOT NULL,
    "desglose" JSONB NOT NULL,
    "calculated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "triage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "triage_deportista_id_calculated_at_idx" ON "triage"("deportista_id", "calculated_at");

-- AddForeignKey
ALTER TABLE "triage" ADD CONSTRAINT "triage_deportista_id_fkey" FOREIGN KEY ("deportista_id") REFERENCES "deportistas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
