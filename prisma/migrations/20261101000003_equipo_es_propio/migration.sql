-- M4: el flag del equipo propio deja de nombrar a un club cliente.
-- RENAME COLUMN es solo catálogo (sin reescribir la tabla).
ALTER TABLE "equipos" RENAME COLUMN "es_gimnasia_lp" TO "es_propio";
