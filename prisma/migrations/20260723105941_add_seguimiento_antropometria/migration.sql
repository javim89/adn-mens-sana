-- 1. Nuevo valor del enum en statement separado (ADD VALUE no convive con su uso en la misma transaccion)
ALTER TYPE "TipoSeguimiento" ADD VALUE IF NOT EXISTS 'ANTROPOMETRIA';

-- 2. Tabla satélite: Antropometría
CREATE TABLE "seguimientos_antropometria" (
  "id"                     TEXT NOT NULL,
  "seguimiento_id"         TEXT NOT NULL,
  "peso"                   DOUBLE PRECISION,
  "talla"                  DOUBLE PRECISION,
  "tsen"                   DOUBLE PRECISION,
  "perimetro_brazo"        DOUBLE PRECISION,
  "perimetro_muslo_medio"  DOUBLE PRECISION,
  "perimetro_pantorrilla"  DOUBLE PRECISION,
  "cintura_minima"         DOUBLE PRECISION,
  "cadera_maxima"          DOUBLE PRECISION,
  "pliegue_triceps"        DOUBLE PRECISION,
  "pliegue_subescapular"   DOUBLE PRECISION,
  "pliegue_supraespinal"   DOUBLE PRECISION,
  "pliegue_abdominal"      DOUBLE PRECISION,
  "pliegue_muslo"          DOUBLE PRECISION,
  "pliegue_pantorrilla"    DOUBLE PRECISION,
  "imc"                    DOUBLE PRECISION,
  "sumatoria_pliegues"     DOUBLE PRECISION,
  CONSTRAINT "seguimientos_antropometria_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "seguimientos_antropometria_seguimiento_id_key" UNIQUE ("seguimiento_id"),
  CONSTRAINT "seguimientos_antropometria_seguimiento_id_fkey"
    FOREIGN KEY ("seguimiento_id") REFERENCES "seguimientos"("id") ON DELETE CASCADE
)
