-- Branding por club: tercer color (acento) y colores siempre como #rrggbb en minúscula.
-- El CHECK es una defensa extra: la app ya valida con normalizarHex/esHex6 antes de guardar.

ALTER TABLE "clubes" ADD COLUMN "color_acento" TEXT;

UPDATE "clubes" SET "color_primario" = lower("color_primario") WHERE "color_primario" IS NOT NULL;

UPDATE "clubes" SET "color_secundario" = lower("color_secundario") WHERE "color_secundario" IS NOT NULL;

ALTER TABLE "clubes" ADD CONSTRAINT "clubes_color_primario_hex" CHECK ("color_primario" IS NULL OR "color_primario" ~ '^#[0-9a-f]{6}$');

ALTER TABLE "clubes" ADD CONSTRAINT "clubes_color_secundario_hex" CHECK ("color_secundario" IS NULL OR "color_secundario" ~ '^#[0-9a-f]{6}$');

ALTER TABLE "clubes" ADD CONSTRAINT "clubes_color_acento_hex" CHECK ("color_acento" IS NULL OR "color_acento" ~ '^#[0-9a-f]{6}$');
