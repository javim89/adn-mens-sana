-- Multi-tenant (M1): tablas nuevas + el club Gimnasia con id fijo.
-- No toca tablas existentes: el código viejo sigue andando igual.

-- CreateEnum
CREATE TYPE "AppRole" AS ENUM ('admin', 'entrenador', 'medico', 'kinesiologo', 'nutricionista', 'psicologo', 'cardiologo', 'social', 'responsable_viandas');

-- CreateTable
CREATE TABLE "clubes" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logo_key" TEXT,
    "logo_url" TEXT,
    "color_primario" TEXT,
    "color_secundario" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clubes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "clubes_slug_key" ON "clubes"("slug");

-- CreateTable
CREATE TABLE "membresias" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "club_id" TEXT NOT NULL,
    "rol" "AppRole" NOT NULL,
    "lugar_retiro" "LugarRetiro",
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "membresias_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "membresias_user_id_club_id_key" ON "membresias"("user_id", "club_id");

-- CreateIndex
CREATE INDEX "membresias_club_id_idx" ON "membresias"("club_id");

-- AddForeignKey
ALTER TABLE "membresias" ADD CONSTRAINT "membresias_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "clubes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "invitaciones" (
    "id" TEXT NOT NULL,
    "club_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "apellido" TEXT NOT NULL,
    "rol" "AppRole" NOT NULL,
    "lugar_retiro" "LugarRetiro",
    "token_hash" TEXT NOT NULL,
    "clerk_invitation_id" TEXT,
    "invitado_por" TEXT NOT NULL,
    "expira" TIMESTAMP(3) NOT NULL,
    "aceptada_at" TIMESTAMP(3),
    "aceptada_por" TEXT,
    "revocada_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invitaciones_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "invitaciones_token_hash_key" ON "invitaciones"("token_hash");

-- CreateIndex
CREATE INDEX "invitaciones_club_id_idx" ON "invitaciones"("club_id");

-- CreateIndex
CREATE INDEX "invitaciones_email_idx" ON "invitaciones"("email");

-- AddForeignKey
ALTER TABLE "invitaciones" ADD CONSTRAINT "invitaciones_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "clubes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "superadmins" (
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "superadmins_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "insights_sesiones" (
    "token" TEXT NOT NULL,
    "club_id" TEXT NOT NULL,
    "expira" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "insights_sesiones_pkey" PRIMARY KEY ("token")
);

-- CreateIndex
CREATE INDEX "insights_sesiones_expira_idx" ON "insights_sesiones"("expira");

-- AddForeignKey
ALTER TABLE "insights_sesiones" ADD CONSTRAINT "insights_sesiones_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "clubes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed: el primer cliente. Id fijo porque el backfill de M2 y los scripts lo referencian.
INSERT INTO "clubes" ("id", "nombre", "slug", "updated_at")
VALUES ('club_gimnasia_lp', 'Club de Gimnasia y Esgrima La Plata', 'gimnasia-la-plata', CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;
