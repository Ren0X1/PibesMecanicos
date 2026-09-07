-- ╔══════════════════════════════════════════════════════════╗
-- ║  PIBES MECÁNICOS - Migración v3                         ║
-- ║  Nuevas tablas: fuel_logs + workshops                   ║
-- ║  Ejecutar en: Supabase Dashboard > SQL Editor           ║
-- ╚══════════════════════════════════════════════════════════╝

-- ─── 1. Tabla de Repostajes ───

CREATE TABLE IF NOT EXISTS fuel_logs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  car_id       UUID NOT NULL REFERENCES cars(id) ON DELETE CASCADE,
  km           INTEGER NOT NULL DEFAULT 0,
  date         DATE NOT NULL DEFAULT CURRENT_DATE,
  liters       NUMERIC(8,2) NOT NULL DEFAULT 0,
  price_liter  NUMERIC(8,3) NOT NULL DEFAULT 0,
  total_cost   NUMERIC(10,2) NOT NULL DEFAULT 0,
  full_tank    BOOLEAN DEFAULT true,
  notes        TEXT DEFAULT '',
  created_at   TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fuel_logs_car ON fuel_logs(car_id);

-- ─── 2. Tabla de Talleres (compartida) ───

CREATE TABLE IF NOT EXISTS workshops (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  phone        TEXT DEFAULT '',
  address      TEXT DEFAULT '',
  rating       INTEGER DEFAULT 3 CHECK (rating >= 1 AND rating <= 5),
  specialty    TEXT DEFAULT '',
  notes        TEXT DEFAULT '',
  created_by   UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ DEFAULT now()
);

-- ─── 3. RLS ───

ALTER TABLE fuel_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE workshops ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fuel_logs_all" ON fuel_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "workshops_all" ON workshops FOR ALL USING (true) WITH CHECK (true);

-- ─── Listo! ───
-- Ejecuta este SQL y luego actualiza los ficheros del frontend.
