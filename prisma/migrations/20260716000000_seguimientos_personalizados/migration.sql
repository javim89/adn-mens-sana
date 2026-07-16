-- 1. Enum nuevo
CREATE TYPE "TipoSeguimiento" AS ENUM (
  'GENERICO',
  'TRAUMATOLOGIA',
  'HISTORIA_CLINICA',
  'EVALUACION_PSICOLOGICA',
  'EVALUACION_CARDIOLOGICA'
);

-- 2. Columna en seguimientos (nullable para retrocompatibilidad)
ALTER TABLE "seguimientos"
  ADD COLUMN "tipo_seguimiento" "TipoSeguimiento";

-- 3. Tabla satélite: Traumatología
CREATE TABLE "seguimientos_traumatologia" (
  "id"                      TEXT NOT NULL,
  "seguimiento_id"          TEXT NOT NULL,
  "estabilidad_hombro"      TEXT,
  "estabilidad_rodilla"     TEXT,
  "estabilidad_tobillo"     TEXT,
  "movilidad_hombro"        TEXT,
  "movilidad_cadera"        TEXT,
  "movilidad_rodilla"       TEXT,
  "movilidad_tobillo"       TEXT,
  "discrepancia_asimetria"  TEXT,
  "postura"                 TEXT,
  "laxitud"                 TEXT,
  "podoscopia"              TEXT,
  "observaciones"           TEXT,
  CONSTRAINT "seguimientos_traumatologia_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "seguimientos_traumatologia_seguimiento_id_key" UNIQUE ("seguimiento_id"),
  CONSTRAINT "seguimientos_traumatologia_seguimiento_id_fkey"
    FOREIGN KEY ("seguimiento_id") REFERENCES "seguimientos"("id") ON DELETE CASCADE
);

-- 4. Tabla satélite: Historia Clínica
CREATE TABLE "seguimientos_historia_clinica" (
  "id"                      TEXT NOT NULL,
  "seguimiento_id"          TEXT NOT NULL,
  "tension_arterial"        TEXT,
  "auscultacion_pulmonar"   TEXT,
  "av_ojo_derecho"          TEXT,
  "av_ojo_izquierdo"        TEXT,
  "diagnostico"             TEXT,
  CONSTRAINT "seguimientos_historia_clinica_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "seguimientos_historia_clinica_seguimiento_id_key" UNIQUE ("seguimiento_id"),
  CONSTRAINT "seguimientos_historia_clinica_seguimiento_id_fkey"
    FOREIGN KEY ("seguimiento_id") REFERENCES "seguimientos"("id") ON DELETE CASCADE
);

-- 5. Tabla satélite: Evaluación Psicológica
CREATE TABLE "seguimientos_evaluacion_psicologica" (
  "id"                          TEXT NOT NULL,
  "seguimiento_id"              TEXT NOT NULL,
  "cprd_control_estres"         INTEGER,
  "cprd_influencia_evaluacion"  INTEGER,
  "cprd_motivacion"             INTEGER,
  "cprd_habilidad_mental"       INTEGER,
  "cprd_cohesion_equipo"        INTEGER,
  "sociograma"                  TEXT,
  "poms"                        TEXT,
  "stai_rasgo"                  INTEGER,
  "stai_estado"                 INTEGER,
  "observaciones"               TEXT,
  CONSTRAINT "seguimientos_evaluacion_psicologica_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "seguimientos_evaluacion_psicologica_seguimiento_id_key" UNIQUE ("seguimiento_id"),
  CONSTRAINT "seguimientos_evaluacion_psicologica_seguimiento_id_fkey"
    FOREIGN KEY ("seguimiento_id") REFERENCES "seguimientos"("id") ON DELETE CASCADE
);

-- 6. Tabla satélite: Evaluación Cardiológica
CREATE TABLE "seguimientos_evaluacion_cardiologica" (
  "id"                  TEXT NOT NULL,
  "seguimiento_id"      TEXT NOT NULL,
  "ecg"                 TEXT,
  "examen_fisico"       TEXT,
  "sintomas"            TEXT,
  "estudios_anteriores" TEXT,
  "diagnostico"         TEXT,
  "observaciones"       TEXT,
  CONSTRAINT "seguimientos_evaluacion_cardiologica_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "seguimientos_evaluacion_cardiologica_seguimiento_id_key" UNIQUE ("seguimiento_id"),
  CONSTRAINT "seguimientos_evaluacion_cardiologica_seguimiento_id_fkey"
    FOREIGN KEY ("seguimiento_id") REFERENCES "seguimientos"("id") ON DELETE CASCADE
)
