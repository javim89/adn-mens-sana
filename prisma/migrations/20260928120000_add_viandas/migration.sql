-- CreateEnum
CREATE TYPE "TipoComida" AS ENUM ('DESAYUNO', 'ALMUERZO', 'MERIENDA', 'CENA');

-- CreateEnum
CREATE TYPE "LugarRetiro" AS ENUM ('BOSQUESITO', 'SEDE', 'ESTANCIA_CHICA');

-- AlterTable: el flag único se desdobla en dos
ALTER TABLE "necesidades_apoyo" ADD COLUMN "recibe_almuerzo" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "necesidades_apoyo" ADD COLUMN "recibe_cena" BOOLEAN NOT NULL DEFAULT false;

-- Backfill: quien recibía vianda recibía almuerzo y cena. Sin WHERE, para que sea idempotente.
UPDATE "necesidades_apoyo" SET "recibe_almuerzo" = "recibe_vianda", "recibe_cena" = "recibe_vianda";

-- CreateTable
CREATE TABLE "entregas_comida" (
    "id" TEXT NOT NULL,
    "deportista_id" TEXT NOT NULL,
    "fecha" DATE NOT NULL,
    "comida" "TipoComida" NOT NULL,
    "lugar" "LugarRetiro" NOT NULL,
    "entregado_por" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "entregas_comida_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "entregas_comida_deportista_id_fecha_comida_key" ON "entregas_comida"("deportista_id", "fecha", "comida");

-- CreateIndex
CREATE INDEX "entregas_comida_fecha_lugar_idx" ON "entregas_comida"("fecha", "lugar");

-- CreateIndex
CREATE INDEX "entregas_comida_entregado_por_idx" ON "entregas_comida"("entregado_por");

-- AddForeignKey
ALTER TABLE "entregas_comida" ADD CONSTRAINT "entregas_comida_deportista_id_fkey" FOREIGN KEY ("deportista_id") REFERENCES "deportistas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
