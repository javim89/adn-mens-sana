CREATE TABLE "turnos" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "hora" TEXT NOT NULL,
    "lugar" TEXT NOT NULL,
    "descripcion" TEXT,
    "profesional_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "turnos_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "turno_deportistas" (
    "id" TEXT NOT NULL,
    "turno_id" TEXT NOT NULL,
    "deportista_id" TEXT NOT NULL,
    CONSTRAINT "turno_deportistas_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "turno_deportistas_turno_id_deportista_id_key" ON "turno_deportistas"("turno_id", "deportista_id");

ALTER TABLE "turno_deportistas" ADD CONSTRAINT "turno_deportistas_turno_id_fkey" FOREIGN KEY ("turno_id") REFERENCES "turnos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "turno_deportistas" ADD CONSTRAINT "turno_deportistas_deportista_id_fkey" FOREIGN KEY ("deportista_id") REFERENCES "deportistas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
