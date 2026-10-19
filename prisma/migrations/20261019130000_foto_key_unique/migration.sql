-- CreateIndex: una foto pertenece a un solo deportista (evita que reemplazar la de uno borre la de otro).
CREATE UNIQUE INDEX IF NOT EXISTS "deportistas_foto_key_key" ON "deportistas"("foto_key");
