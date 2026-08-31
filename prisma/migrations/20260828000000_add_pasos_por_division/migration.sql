-- CreateTable
CREATE TABLE "pasos_por_division" (
    "id" TEXT NOT NULL,
    "deportista_id" TEXT NOT NULL,
    "categoria_id" TEXT,
    "disciplina_id" TEXT,
    "desde" DATE NOT NULL,
    "hasta" DATE,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pasos_por_division_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "pasos_por_division_deportista_id_idx" ON "pasos_por_division"("deportista_id");

-- AddForeignKey
ALTER TABLE "pasos_por_division" ADD CONSTRAINT "pasos_por_division_deportista_id_fkey" FOREIGN KEY ("deportista_id") REFERENCES "deportistas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pasos_por_division" ADD CONSTRAINT "pasos_por_division_categoria_id_fkey" FOREIGN KEY ("categoria_id") REFERENCES "categorias"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pasos_por_division" ADD CONSTRAINT "pasos_por_division_disciplina_id_fkey" FOREIGN KEY ("disciplina_id") REFERENCES "disciplinas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill: un período abierto por deportista con su división actual
INSERT INTO "pasos_por_division" ("id", "deportista_id", "categoria_id", "disciplina_id", "desde", "hasta", "created_at", "updated_at")
SELECT gen_random_uuid()::text, "id", "categoria_id", "disciplina_id",
       COALESCE("fecha_ingreso", "created_at")::date, NULL, now(), now()
FROM "deportistas";
