-- Multi-tenant (M3): los uniques globales pasan a ser por club.
--
-- Cada unique nuevo se crea ANTES de dropear el viejo, así no hay un momento
-- en que la tabla quede sin la restricción. Con un solo club los datos
-- existentes cumplen los dos. fotoKey sigue siendo global (la key de S3 es única).

-- deportistas: dni
CREATE UNIQUE INDEX IF NOT EXISTS "deportistas_club_id_dni_key" ON "deportistas"("club_id", "dni");

DROP INDEX IF EXISTS "deportistas_dni_key";

-- deportistas: email (los NULL no chocan entre sí)
CREATE UNIQUE INDEX IF NOT EXISTS "deportistas_club_id_email_key" ON "deportistas"("club_id", "email");

DROP INDEX IF EXISTS "deportistas_email_key";

-- equipos: nombre
CREATE UNIQUE INDEX IF NOT EXISTS "equipos_club_id_nombre_key" ON "equipos"("club_id", "nombre");

DROP INDEX IF EXISTS "equipos_nombre_key";

-- categorias: nombre
CREATE UNIQUE INDEX IF NOT EXISTS "categorias_club_id_nombre_key" ON "categorias"("club_id", "nombre");

DROP INDEX IF EXISTS "categorias_nombre_key";

-- disciplinas: nombre
CREATE UNIQUE INDEX IF NOT EXISTS "disciplinas_club_id_nombre_key" ON "disciplinas"("club_id", "nombre");

DROP INDEX IF EXISTS "disciplinas_nombre_key";

-- disciplinas: codigo
CREATE UNIQUE INDEX IF NOT EXISTS "disciplinas_club_id_codigo_key" ON "disciplinas"("club_id", "codigo");

DROP INDEX IF EXISTS "disciplinas_codigo_key";

-- dias_calendario: fecha
CREATE UNIQUE INDEX IF NOT EXISTS "dias_calendario_club_id_fecha_key" ON "dias_calendario"("club_id", "fecha");

DROP INDEX IF EXISTS "dias_calendario_fecha_key";

-- insights_dashboards: slug
CREATE UNIQUE INDEX IF NOT EXISTS "insights_dashboards_club_id_slug_key" ON "insights_dashboards"("club_id", "slug");

DROP INDEX IF EXISTS "insights_dashboards_slug_key";
