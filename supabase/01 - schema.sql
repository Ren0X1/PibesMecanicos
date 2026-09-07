-- ╔══════════════════════════════════════════════════════════╗
-- ║  PIBES MECÁNICOS - Schema v2 (completo desde cero)     ║
-- ║  Ejecutar en: Supabase Dashboard > SQL Editor           ║
-- ║  ⚠️ SOLO si es un proyecto NUEVO.                       ║
-- ║  Si ya tienes datos, usa el fichero migration.sql       ║
-- ╚══════════════════════════════════════════════════════════╝

-- ─── 1. Tablas ───

CREATE TABLE profiles (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  username   TEXT NOT NULL UNIQUE,
  pin        TEXT NOT NULL DEFAULT '1234',
  role       TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE cars (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  plate        TEXT NOT NULL,
  brand        TEXT NOT NULL,
  model        TEXT NOT NULL,
  year         INTEGER NOT NULL,
  transmission TEXT NOT NULL DEFAULT 'Manual',
  fuel         TEXT NOT NULL DEFAULT 'Gasolina',
  current_km   INTEGER NOT NULL DEFAULT 0,
  notes        TEXT DEFAULT '',
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE km_logs (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  car_id     UUID NOT NULL REFERENCES cars(id) ON DELETE CASCADE,
  km         INTEGER NOT NULL,
  date       DATE NOT NULL DEFAULT CURRENT_DATE,
  notes      TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE maintenance_records (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  car_id     UUID NOT NULL REFERENCES cars(id) ON DELETE CASCADE,
  type_id    TEXT NOT NULL,
  last_km    INTEGER NOT NULL DEFAULT 0,
  last_date  DATE,
  next_km    INTEGER NOT NULL DEFAULT 0,
  next_date  DATE,
  cost       NUMERIC(10,2) DEFAULT 0,
  notes      TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(car_id, type_id)
);

CREATE TABLE car_parts (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  car_id     UUID NOT NULL REFERENCES cars(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  reference  TEXT NOT NULL DEFAULT '',
  url        TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ─── 2. Índices ───

CREATE INDEX idx_cars_user ON cars(user_id);
CREATE INDEX idx_km_logs_car ON km_logs(car_id);
CREATE INDEX idx_maintenance_car ON maintenance_records(car_id);
CREATE INDEX idx_maintenance_car_type ON maintenance_records(car_id, type_id);
CREATE INDEX idx_car_parts_car ON car_parts(car_id);

-- ─── 3. Row Level Security ───

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE cars ENABLE ROW LEVEL SECURITY;
ALTER TABLE km_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE car_parts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_all" ON profiles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "cars_all" ON cars FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "km_logs_all" ON km_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "maintenance_all" ON maintenance_records FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "car_parts_all" ON car_parts FOR ALL USING (true) WITH CHECK (true);

-- ─── 4. Datos iniciales ───
-- ¡Cambia estos datos con tus nombres y usuarios reales!

INSERT INTO profiles (name, username, pin, role) VALUES
  ('Admin', 'admin', '1234', 'admin'),
  ('Carlos', 'carlos', '1234', 'user'),
  ('Miguel', 'miguel', '1234', 'user');
