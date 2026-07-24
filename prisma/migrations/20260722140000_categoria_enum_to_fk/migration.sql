-- Categoría enum -> FK + consolidación del catálogo de categorías.
--
-- Convierte `Deportista.categoria` de un enum escalar a una relación FK hacia
-- el catálogo `categorias` (antes `categorias_torneo`). Se elimina el enum
-- `Categoria` y el enum `GrupoCategoria`. Por decisión del usuario se EMPIEZA DE
-- CERO con los datos: la categoría de los deportistas existentes se limpia a NULL
-- (no se mapean valores enum viejos).
--
-- Orden crítico:
--   (a) rename tabla categorias_torneo -> categorias
--   (b) drop columna grupo
--   (c) drop enum GrupoCategoria
--   (d) en deportistas: crear categoria_id text y dropear la columna enum categoria
--   (e) drop enum Categoria (después de dropear la columna que lo usa)
--   (f) FK deportistas.categoria_id -> categorias.id ON DELETE SET NULL
--   (g) INSERT del catálogo completo (15 filas)

-- (a) Renombrar la tabla del catálogo. En Postgres el RENAME preserva las FKs
-- existentes (eventos_torneo.categoria_id) por OID, así que el calendario sigue OK.
ALTER TABLE "categorias_torneo" RENAME TO "categorias";

-- Renombrar el índice único e el PK para alinearlos con el nuevo nombre de tabla.
ALTER INDEX "categorias_torneo_pkey" RENAME TO "categorias_pkey";
ALTER INDEX "categorias_torneo_nombre_key" RENAME TO "categorias_nombre_key";

-- (b) La pertenencia 4-5-6 / 7-8-9 ya no vive en la DB (se hardcodea en el seed).
ALTER TABLE "categorias" DROP COLUMN "grupo";

-- (c) El enum GrupoCategoria ya no lo usa ninguna columna.
DROP TYPE "GrupoCategoria";

-- (d) Deportista: agregar la columna FK (queda NULL) y dropear la vieja columna enum.
ALTER TABLE "deportistas" ADD COLUMN "categoria_id" TEXT;
ALTER TABLE "deportistas" DROP COLUMN "categoria";

-- (e) Ahora que ninguna columna usa el enum Categoria, se puede dropear.
DROP TYPE "Categoria";

-- (f) FK con ON DELETE SET NULL: borrar una categoría del catálogo pone NULL en
-- los deportistas en vez de fallar, y no rompe el reseed del calendario.
ALTER TABLE "deportistas" ADD CONSTRAINT "deportistas_categoria_id_fkey" FOREIGN KEY ("categoria_id") REFERENCES "categorias"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- (g) Catálogo consolidado (15 filas). Las 6 de torneo conservan su nombre corto
-- ("4ta".."9na", orden 1..6) para no romper el calendario. Las nuevas usan nombre
-- legible (orden 7..15). Idempotente por nombre: si ya existe (seed previo del
-- calendario) se respeta la fila y solo se actualiza el orden.
INSERT INTO "categorias" ("id", "nombre", "orden") VALUES
  (gen_random_uuid()::text, '4ta', 1),
  (gen_random_uuid()::text, '5ta', 2),
  (gen_random_uuid()::text, '6ta', 3),
  (gen_random_uuid()::text, '7ma', 4),
  (gen_random_uuid()::text, '8va', 5),
  (gen_random_uuid()::text, '9na', 6),
  (gen_random_uuid()::text, 'SUB-12', 7),
  (gen_random_uuid()::text, 'SUB-14', 8),
  (gen_random_uuid()::text, 'SUB-16', 9),
  (gen_random_uuid()::text, 'SUB-18', 10),
  (gen_random_uuid()::text, 'Reserva', 11),
  (gen_random_uuid()::text, 'División de Honor', 12),
  (gen_random_uuid()::text, 'Primera', 13),
  (gen_random_uuid()::text, 'Senior', 14),
  (gen_random_uuid()::text, 'Veteranos', 15)
ON CONFLICT ("nombre") DO UPDATE SET "orden" = EXCLUDED."orden";
