-- M5 (paso de release, DESPUÉS del deploy y el smoke test): quita el DEFAULT
-- transicional 'club_gimnasia_lp' de club_id. A partir de acá, una escritura
-- que no pase por el cliente acotado (getDb/dbDelClub) falla con NOT NULL en
-- vez de caer silenciosamente en Gimnasia. NO aplicar antes de que el código
-- nuevo esté en producción: el código viejo no setea club_id.
ALTER TABLE "deportistas" ALTER COLUMN "club_id" DROP DEFAULT;
ALTER TABLE "disciplinas" ALTER COLUMN "club_id" DROP DEFAULT;
ALTER TABLE "categorias" ALTER COLUMN "club_id" DROP DEFAULT;
ALTER TABLE "equipos" ALTER COLUMN "club_id" DROP DEFAULT;
ALTER TABLE "dias_calendario" ALTER COLUMN "club_id" DROP DEFAULT;
ALTER TABLE "eventos_torneo" ALTER COLUMN "club_id" DROP DEFAULT;
ALTER TABLE "turnos" ALTER COLUMN "club_id" DROP DEFAULT;
ALTER TABLE "seguimientos" ALTER COLUMN "club_id" DROP DEFAULT;
ALTER TABLE "entrenamientos" ALTER COLUMN "club_id" DROP DEFAULT;
ALTER TABLE "convocatorias" ALTER COLUMN "club_id" DROP DEFAULT;
ALTER TABLE "insights_dashboards" ALTER COLUMN "club_id" DROP DEFAULT;
ALTER TABLE "triage" ALTER COLUMN "club_id" DROP DEFAULT;
ALTER TABLE "entregas_comida" ALTER COLUMN "club_id" DROP DEFAULT;
