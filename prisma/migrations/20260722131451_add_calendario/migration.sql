-- CreateEnum
CREATE TYPE "TipoDia" AS ENUM ('TORNEO', 'RECESO', 'RECUPERO', 'SIN_ACTIVIDAD');

-- CreateEnum
CREATE TYPE "GrupoCategoria" AS ENUM ('CUARTA_QUINTA_SEXTA', 'SEPTIMA_OCTAVA_NOVENA');

-- CreateEnum
CREATE TYPE "EstadoEvento" AS ENUM ('PROGRAMADO', 'SUSPENDIDO', 'REPROGRAMADO');

-- CreateTable
CREATE TABLE "equipos" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "es_gimnasia_lp" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "equipos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categorias_torneo" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "orden" INTEGER NOT NULL,
    "grupo" "GrupoCategoria" NOT NULL,
    CONSTRAINT "categorias_torneo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dias_calendario" (
    "id" TEXT NOT NULL,
    "fecha" DATE NOT NULL,
    "tipo" "TipoDia" NOT NULL,
    "numero_fecha" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "dias_calendario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eventos_torneo" (
    "id" TEXT NOT NULL,
    "dia_calendario_id" TEXT NOT NULL,
    "categoria_id" TEXT NOT NULL,
    "local_id" TEXT NOT NULL,
    "visitante_id" TEXT NOT NULL,
    "estado" "EstadoEvento" NOT NULL DEFAULT 'PROGRAMADO',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "eventos_torneo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "equipos_nombre_key" ON "equipos"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "categorias_torneo_nombre_key" ON "categorias_torneo"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "dias_calendario_fecha_key" ON "dias_calendario"("fecha");

-- CreateIndex
CREATE UNIQUE INDEX "eventos_torneo_dia_calendario_id_categoria_id_key" ON "eventos_torneo"("dia_calendario_id", "categoria_id");

-- AddForeignKey
ALTER TABLE "eventos_torneo" ADD CONSTRAINT "eventos_torneo_dia_calendario_id_fkey" FOREIGN KEY ("dia_calendario_id") REFERENCES "dias_calendario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eventos_torneo" ADD CONSTRAINT "eventos_torneo_categoria_id_fkey" FOREIGN KEY ("categoria_id") REFERENCES "categorias_torneo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eventos_torneo" ADD CONSTRAINT "eventos_torneo_local_id_fkey" FOREIGN KEY ("local_id") REFERENCES "equipos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eventos_torneo" ADD CONSTRAINT "eventos_torneo_visitante_id_fkey" FOREIGN KEY ("visitante_id") REFERENCES "equipos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
