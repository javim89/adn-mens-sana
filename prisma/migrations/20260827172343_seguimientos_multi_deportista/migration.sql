-- CreateTable
CREATE TABLE "seguimiento_deportistas" (
    "seguimiento_id" TEXT NOT NULL,
    "deportista_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "seguimiento_deportistas_pkey" PRIMARY KEY ("seguimiento_id", "deportista_id")
);

-- CreateIndex
CREATE INDEX "seguimiento_deportistas_deportista_id_idx" ON "seguimiento_deportistas"("deportista_id");

-- AddForeignKey
ALTER TABLE "seguimiento_deportistas" ADD CONSTRAINT "seguimiento_deportistas_seguimiento_id_fkey" FOREIGN KEY ("seguimiento_id") REFERENCES "seguimientos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seguimiento_deportistas" ADD CONSTRAINT "seguimiento_deportistas_deportista_id_fkey" FOREIGN KEY ("deportista_id") REFERENCES "deportistas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill from existing 1:N relation
INSERT INTO "seguimiento_deportistas" ("seguimiento_id", "deportista_id") SELECT "id", "deportista_id" FROM "seguimientos";

-- DropColumn
ALTER TABLE "seguimientos" DROP COLUMN "deportista_id";
