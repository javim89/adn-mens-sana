-- Multi-tenant (M2): club_id en las 13 tablas raíz.
--
-- ADD COLUMN con DEFAULT constante y NOT NULL en un solo paso: en Postgres 11+
-- no reescribe la tabla y las filas existentes quedan en Gimnasia de forma
-- atómica, sin una ventana con NULLs en la que el código viejo pudiera insertar.
-- El DEFAULT es TRANSICIONAL (el código viejo no setea club_id) y se quita en M5.
-- Las tablas con unique por club (M3) usan ese índice para la FK, el resto lleva
-- uno propio acá.

-- deportistas
ALTER TABLE "deportistas" ADD COLUMN IF NOT EXISTS "club_id" TEXT NOT NULL DEFAULT 'club_gimnasia_lp';

ALTER TABLE "deportistas" ADD CONSTRAINT "deportistas_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "clubes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- disciplinas
ALTER TABLE "disciplinas" ADD COLUMN IF NOT EXISTS "club_id" TEXT NOT NULL DEFAULT 'club_gimnasia_lp';

ALTER TABLE "disciplinas" ADD CONSTRAINT "disciplinas_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "clubes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- categorias
ALTER TABLE "categorias" ADD COLUMN IF NOT EXISTS "club_id" TEXT NOT NULL DEFAULT 'club_gimnasia_lp';

ALTER TABLE "categorias" ADD CONSTRAINT "categorias_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "clubes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- equipos
ALTER TABLE "equipos" ADD COLUMN IF NOT EXISTS "club_id" TEXT NOT NULL DEFAULT 'club_gimnasia_lp';

ALTER TABLE "equipos" ADD CONSTRAINT "equipos_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "clubes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- dias_calendario
ALTER TABLE "dias_calendario" ADD COLUMN IF NOT EXISTS "club_id" TEXT NOT NULL DEFAULT 'club_gimnasia_lp';

ALTER TABLE "dias_calendario" ADD CONSTRAINT "dias_calendario_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "clubes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- eventos_torneo
ALTER TABLE "eventos_torneo" ADD COLUMN IF NOT EXISTS "club_id" TEXT NOT NULL DEFAULT 'club_gimnasia_lp';

ALTER TABLE "eventos_torneo" ADD CONSTRAINT "eventos_torneo_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "clubes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "eventos_torneo_club_id_idx" ON "eventos_torneo"("club_id");

-- turnos
ALTER TABLE "turnos" ADD COLUMN IF NOT EXISTS "club_id" TEXT NOT NULL DEFAULT 'club_gimnasia_lp';

ALTER TABLE "turnos" ADD CONSTRAINT "turnos_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "clubes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "turnos_club_id_fecha_idx" ON "turnos"("club_id", "fecha");

-- seguimientos
ALTER TABLE "seguimientos" ADD COLUMN IF NOT EXISTS "club_id" TEXT NOT NULL DEFAULT 'club_gimnasia_lp';

ALTER TABLE "seguimientos" ADD CONSTRAINT "seguimientos_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "clubes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "seguimientos_club_id_fecha_idx" ON "seguimientos"("club_id", "fecha");

-- entrenamientos
ALTER TABLE "entrenamientos" ADD COLUMN IF NOT EXISTS "club_id" TEXT NOT NULL DEFAULT 'club_gimnasia_lp';

ALTER TABLE "entrenamientos" ADD CONSTRAINT "entrenamientos_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "clubes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "entrenamientos_club_id_fecha_idx" ON "entrenamientos"("club_id", "fecha");

-- convocatorias
ALTER TABLE "convocatorias" ADD COLUMN IF NOT EXISTS "club_id" TEXT NOT NULL DEFAULT 'club_gimnasia_lp';

ALTER TABLE "convocatorias" ADD CONSTRAINT "convocatorias_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "clubes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "convocatorias_club_id_idx" ON "convocatorias"("club_id");

-- insights_dashboards
ALTER TABLE "insights_dashboards" ADD COLUMN IF NOT EXISTS "club_id" TEXT NOT NULL DEFAULT 'club_gimnasia_lp';

ALTER TABLE "insights_dashboards" ADD CONSTRAINT "insights_dashboards_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "clubes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- triage
ALTER TABLE "triage" ADD COLUMN IF NOT EXISTS "club_id" TEXT NOT NULL DEFAULT 'club_gimnasia_lp';

ALTER TABLE "triage" ADD CONSTRAINT "triage_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "clubes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "triage_club_id_calculated_at_idx" ON "triage"("club_id", "calculated_at");

-- entregas_comida
ALTER TABLE "entregas_comida" ADD COLUMN IF NOT EXISTS "club_id" TEXT NOT NULL DEFAULT 'club_gimnasia_lp';

ALTER TABLE "entregas_comida" ADD CONSTRAINT "entregas_comida_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "clubes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "entregas_comida_club_id_fecha_lugar_idx" ON "entregas_comida"("club_id", "fecha", "lugar");
