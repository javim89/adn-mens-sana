-- CreateTable disciplinas
CREATE TABLE "disciplinas" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "orden" INTEGER NOT NULL,
    CONSTRAINT "disciplinas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "disciplinas_nombre_key" ON "disciplinas"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "disciplinas_codigo_key" ON "disciplinas"("codigo");

-- Seed disciplinas (codigo = valor del enum, nombre = label español, orden = 1..21)
INSERT INTO "disciplinas" ("id", "nombre", "codigo", "orden") VALUES
    (gen_random_uuid()::text, 'Fútbol', 'FUTBOL', 1),
    (gen_random_uuid()::text, 'Futsal', 'FUTSAL', 2),
    (gen_random_uuid()::text, 'Básquet', 'BASQUET', 3),
    (gen_random_uuid()::text, 'Vóley', 'VOLEY', 4),
    (gen_random_uuid()::text, 'Handball', 'HANDBALL', 5),
    (gen_random_uuid()::text, 'Natación', 'NATACION', 6),
    (gen_random_uuid()::text, 'Atletismo', 'ATLETISMO', 7),
    (gen_random_uuid()::text, 'Hockey', 'HOCKEY', 8),
    (gen_random_uuid()::text, 'Rugby', 'RUGBY', 9),
    (gen_random_uuid()::text, 'Tenis', 'TENIS', 10),
    (gen_random_uuid()::text, 'Gimnasia', 'GIMNASIA', 11),
    (gen_random_uuid()::text, 'Gimnasia Artística', 'GIMNASIA_ARTISTICA', 12),
    (gen_random_uuid()::text, 'Patín', 'PATIN', 13),
    (gen_random_uuid()::text, 'Artes Marciales', 'ARTES_MARCIALES', 14),
    (gen_random_uuid()::text, 'Combate', 'COMBATE', 15),
    (gen_random_uuid()::text, 'Iniciación Deportiva', 'INICIACION_DEPORTIVA', 16),
    (gen_random_uuid()::text, 'Power Chair', 'POWER_CHAIR', 17),
    (gen_random_uuid()::text, 'TIADE', 'TIADE', 18),
    (gen_random_uuid()::text, 'Ajedrez', 'AJEDREZ', 19),
    (gen_random_uuid()::text, 'Boxeo', 'BOXEO', 20),
    (gen_random_uuid()::text, 'Otro', 'OTRO', 21);

-- CreateTable disciplina_categorias
CREATE TABLE "disciplina_categorias" (
    "id" TEXT NOT NULL,
    "disciplina_id" TEXT NOT NULL,
    "categoria_id" TEXT NOT NULL,
    CONSTRAINT "disciplina_categorias_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "disciplina_categorias_disciplina_id_categoria_id_key" ON "disciplina_categorias"("disciplina_id", "categoria_id");

-- AddForeignKey
ALTER TABLE "disciplina_categorias" ADD CONSTRAINT "disciplina_categorias_disciplina_id_fkey" FOREIGN KEY ("disciplina_id") REFERENCES "disciplinas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disciplina_categorias" ADD CONSTRAINT "disciplina_categorias_categoria_id_fkey" FOREIGN KEY ("categoria_id") REFERENCES "categorias"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddColumn disciplina_id on deportistas
ALTER TABLE "deportistas" ADD COLUMN "disciplina_id" TEXT;

-- AddForeignKey
ALTER TABLE "deportistas" ADD CONSTRAINT "deportistas_disciplina_id_fkey" FOREIGN KEY ("disciplina_id") REFERENCES "disciplinas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill: resolve disciplina_id from the existing enum column via codigo
UPDATE "deportistas"
SET "disciplina_id" = (SELECT "id" FROM "disciplinas" d WHERE d."codigo" = "deportistas"."disciplina"::text);

-- Drop the old enum column and type
ALTER TABLE "deportistas" DROP COLUMN "disciplina";

DROP TYPE "Disciplina";
