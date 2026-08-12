-- CreateTable
CREATE TABLE "convocatorias" (
    "id" TEXT NOT NULL,
    "evento_torneo_id" TEXT NOT NULL,
    "disciplina_id" TEXT NOT NULL,
    "categoria_id" TEXT NOT NULL,
    "hora_citacion" TEXT,
    "lugar" TEXT,
    "observaciones" TEXT,
    "entrenador_id" TEXT NOT NULL,
    "registrado_por" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "convocatorias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "convocatoria_deportistas" (
    "id" TEXT NOT NULL,
    "convocatoria_id" TEXT NOT NULL,
    "deportista_id" TEXT NOT NULL,

    CONSTRAINT "convocatoria_deportistas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "convocatorias_evento_torneo_id_key" ON "convocatorias"("evento_torneo_id");

-- CreateIndex
CREATE UNIQUE INDEX "convocatoria_deportistas_convocatoria_id_deportista_id_key" ON "convocatoria_deportistas"("convocatoria_id", "deportista_id");

-- AddForeignKey
ALTER TABLE "convocatorias" ADD CONSTRAINT "convocatorias_evento_torneo_id_fkey" FOREIGN KEY ("evento_torneo_id") REFERENCES "eventos_torneo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "convocatorias" ADD CONSTRAINT "convocatorias_disciplina_id_fkey" FOREIGN KEY ("disciplina_id") REFERENCES "disciplinas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "convocatorias" ADD CONSTRAINT "convocatorias_categoria_id_fkey" FOREIGN KEY ("categoria_id") REFERENCES "categorias"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "convocatoria_deportistas" ADD CONSTRAINT "convocatoria_deportistas_convocatoria_id_fkey" FOREIGN KEY ("convocatoria_id") REFERENCES "convocatorias"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "convocatoria_deportistas" ADD CONSTRAINT "convocatoria_deportistas_deportista_id_fkey" FOREIGN KEY ("deportista_id") REFERENCES "deportistas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
