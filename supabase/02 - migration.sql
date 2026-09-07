-- ╔══════════════════════════════════════════════════════════╗
-- ║  PIBES MECÁNICOS - Migración v1 → v2                   ║
-- ║  Ejecutar en: Supabase Dashboard > SQL Editor           ║
-- ║  ⚠️ SOLO si ya tienes la base de datos con datos.       ║
-- ║  Si empiezas de cero, usa schema.sql directamente.      ║
-- ╚══════════════════════════════════════════════════════════╝

-- ─── 1. Cambiar email → username en profiles ───

-- Añadir columna username basada en el email
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS username TEXT;

-- Copiar el email como username (parte antes del @)
UPDATE profiles SET username = SPLIT_PART(email, '@', 1) WHERE username IS NULL;

-- Hacer username obligatorio y único
ALTER TABLE profiles ALTER COLUMN username SET NOT NULL;
ALTER TABLE profiles ADD CONSTRAINT profiles_username_unique UNIQUE (username);

-- Opcional: eliminar la columna email (descomenta si quieres)
-- ALTER TABLE profiles DROP COLUMN IF EXISTS email;

-- ─── 2. Crear tabla car_parts (Recambios) ───

CREATE TABLE IF NOT EXISTS car_parts (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  car_id     UUID NOT NULL REFERENCES cars(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  reference  TEXT NOT NULL DEFAULT '',
  url        TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_car_parts_car ON car_parts(car_id);

-- ─── 3. RLS para car_parts ───

ALTER TABLE car_parts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "car_parts_all" ON car_parts FOR ALL USING (true) WITH CHECK (true);

-- ─── Listo! ───
-- La migración ha terminado. Ahora actualiza los ficheros
-- del frontend y vuelve a hacer deploy.
