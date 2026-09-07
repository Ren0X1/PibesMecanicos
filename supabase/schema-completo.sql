-- ╔══════════════════════════════════════════════════════════╗
-- ║  PIBES MECÁNICOS - SCHEMA UNIFICADO                     ║
-- ║  Versión completa con todas las features hasta hoy      ║
-- ║                                                          ║
-- ║  ⚠️  Si es un proyecto NUEVO: ejecuta este fichero entero║
-- ║      una sola vez en Supabase Dashboard > SQL Editor    ║
-- ║                                                          ║
-- ║  ⚠️  Si ya tienes datos: este script es IDEMPOTENTE,    ║
-- ║      puedes ejecutarlo y solo añadirá lo que falte      ║
-- ║      sin tocar lo existente.                            ║
-- ╚══════════════════════════════════════════════════════════╝


-- ═══════════════════════════════════════════════════════════
-- 1) PROFILES (usuarios)
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS profiles (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                 TEXT NOT NULL,
  username             TEXT NOT NULL UNIQUE,
  email                TEXT,
  pin                  TEXT NOT NULL DEFAULT '1234',
  role                 TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  pin_change_required  BOOLEAN DEFAULT false,
  -- Preferencias (ver migración 13). NULL = todavía no ha elegido,
  -- que es lo que dispara el asistente de bienvenida.
  lang                 TEXT CHECK (lang   IS NULL OR lang  IN ('es','en','zh','de','fr','ru')),
  theme                TEXT CHECK (theme  IS NULL OR theme IN ('dark','light')),
  accent               TEXT CHECK (accent IS NULL OR accent IN ('mandarina','turquesa','manzana','oro','coral','frambuesa','purpura','marfil')),
  onboarded_at         TIMESTAMPTZ,
  created_at           TIMESTAMPTZ DEFAULT now()
);

-- Asegurar columnas (en caso de migración desde versión antigua)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pin_change_required BOOLEAN DEFAULT false;
ALTER TABLE profiles ALTER COLUMN email DROP NOT NULL;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS lang         TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS theme        TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS accent       TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarded_at TIMESTAMPTZ;


-- ═══════════════════════════════════════════════════════════
-- 2) CARS (vehículos: coches + motos)
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS cars (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  plate         TEXT NOT NULL,
  brand         TEXT NOT NULL,
  model         TEXT NOT NULL,
  year          INTEGER NOT NULL,
  transmission  TEXT NOT NULL DEFAULT 'Manual',
  fuel          TEXT NOT NULL DEFAULT 'Gasolina',
  current_km    INTEGER NOT NULL DEFAULT 0,
  vehicle_type  TEXT DEFAULT 'coche',
  notes         TEXT DEFAULT '',
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE cars ADD COLUMN IF NOT EXISTS vehicle_type TEXT DEFAULT 'coche';


-- ═══════════════════════════════════════════════════════════
-- 3) KM LOGS (historial de kilómetros)
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS km_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  car_id      UUID NOT NULL REFERENCES cars(id) ON DELETE CASCADE,
  km          INTEGER NOT NULL,
  date        DATE NOT NULL DEFAULT CURRENT_DATE,
  notes       TEXT DEFAULT '',
  created_at  TIMESTAMPTZ DEFAULT now()
);


-- ═══════════════════════════════════════════════════════════
-- 4) MAINTENANCE RECORDS
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS maintenance_records (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  car_id      UUID NOT NULL REFERENCES cars(id) ON DELETE CASCADE,
  type_id     TEXT NOT NULL,
  last_km     INTEGER NOT NULL DEFAULT 0,
  last_date   DATE,
  next_km     INTEGER NOT NULL DEFAULT 0,
  next_date   DATE,
  cost        NUMERIC(10,2) DEFAULT 0,
  notes       TEXT DEFAULT '',
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(car_id, type_id)
);


-- ═══════════════════════════════════════════════════════════
-- 5) CAR PARTS (recambios)
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS car_parts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  car_id      UUID NOT NULL REFERENCES cars(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  reference   TEXT NOT NULL DEFAULT '',
  url         TEXT DEFAULT '',
  created_at  TIMESTAMPTZ DEFAULT now()
);


-- ═══════════════════════════════════════════════════════════
-- 6) FUEL LOGS (repostajes con consumo)
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS fuel_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  car_id        UUID NOT NULL REFERENCES cars(id) ON DELETE CASCADE,
  km            INTEGER NOT NULL DEFAULT 0,
  date          DATE NOT NULL DEFAULT CURRENT_DATE,
  liters        NUMERIC(8,2) NOT NULL DEFAULT 0,
  price_liter   NUMERIC(8,3) NOT NULL DEFAULT 0,
  total_cost    NUMERIC(10,2) NOT NULL DEFAULT 0,
  full_tank     BOOLEAN DEFAULT true,
  driving_mode  TEXT DEFAULT 'ciudad',
  notes         TEXT DEFAULT '',
  created_at    TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE fuel_logs ADD COLUMN IF NOT EXISTS driving_mode TEXT DEFAULT 'ciudad';


-- ═══════════════════════════════════════════════════════════
-- 7) ITV RECORDS
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS itv_records (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  car_id           UUID NOT NULL REFERENCES cars(id) ON DELETE CASCADE,
  inspection_date  DATE NOT NULL,
  expiry_date      DATE,
  result           TEXT NOT NULL DEFAULT 'favorable' CHECK (result IN ('favorable', 'desfavorable', 'negativa')),
  station          TEXT DEFAULT '',
  defects          TEXT DEFAULT '',
  resolved         BOOLEAN DEFAULT false,
  cost             NUMERIC(10,2) DEFAULT 0,
  notes            TEXT DEFAULT '',
  created_at       TIMESTAMPTZ DEFAULT now()
);


-- ═══════════════════════════════════════════════════════════
-- 8) WORKSHOPS (directorio compartido)
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS workshops (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  phone       TEXT DEFAULT '',
  address     TEXT DEFAULT '',
  rating      INTEGER DEFAULT 3 CHECK (rating >= 1 AND rating <= 5),
  specialty   TEXT DEFAULT '',
  notes       TEXT DEFAULT '',
  created_by  UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT now()
);


-- ═══════════════════════════════════════════════════════════
-- 9) GROUPS + MEMBERS + MESSAGES
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS groups (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  created_by  UUID REFERENCES profiles(id) ON DELETE SET NULL,
  status      TEXT DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at  TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE groups ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'approved';

CREATE TABLE IF NOT EXISTS group_members (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id   UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(group_id, user_id)
);

CREATE TABLE IF NOT EXISTS group_messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id    UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  message     TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS group_invitations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id    UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  invited_by  UUID REFERENCES profiles(id) ON DELETE SET NULL,
  status      TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(group_id, user_id)
);


-- ═══════════════════════════════════════════════════════════
-- 10) VEHICLE TODOS (lista de tareas por vehículo)
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS vehicle_todos (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  car_id        UUID NOT NULL REFERENCES cars(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  notes         TEXT DEFAULT '',
  priority      TEXT NOT NULL DEFAULT 'media' CHECK (priority IN ('baja', 'media', 'alta')),
  completed     BOOLEAN DEFAULT false,
  completed_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT now()
);


-- ═══════════════════════════════════════════════════════════
-- 11) REMINDERS (recordatorios personales del usuario)
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS reminders (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  car_id       UUID REFERENCES cars(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  notes        TEXT DEFAULT '',
  due_date     DATE NOT NULL,
  completed    BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT now()
);


-- ═══════════════════════════════════════════════════════════
-- 12) ÍNDICES
-- ═══════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_cars_user ON cars(user_id);
CREATE INDEX IF NOT EXISTS idx_km_logs_car ON km_logs(car_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_car ON maintenance_records(car_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_car_type ON maintenance_records(car_id, type_id);
CREATE INDEX IF NOT EXISTS idx_car_parts_car ON car_parts(car_id);
CREATE INDEX IF NOT EXISTS idx_fuel_logs_car ON fuel_logs(car_id);
CREATE INDEX IF NOT EXISTS idx_itv_car ON itv_records(car_id);
CREATE INDEX IF NOT EXISTS idx_group_members_group ON group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user ON group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_group_messages_group ON group_messages(group_id);
CREATE INDEX IF NOT EXISTS idx_group_invitations_user ON group_invitations(user_id, status);
CREATE INDEX IF NOT EXISTS idx_group_invitations_group ON group_invitations(group_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_todos_car ON vehicle_todos(car_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_todos_completed ON vehicle_todos(car_id, completed);
CREATE INDEX IF NOT EXISTS idx_reminders_user ON reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_reminders_user_due ON reminders(user_id, completed, due_date);


-- ═══════════════════════════════════════════════════════════
-- 13) ROW LEVEL SECURITY (policies permisivas)
-- ═══════════════════════════════════════════════════════════

ALTER TABLE profiles            ENABLE ROW LEVEL SECURITY;
ALTER TABLE cars                ENABLE ROW LEVEL SECURITY;
ALTER TABLE km_logs             ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE car_parts           ENABLE ROW LEVEL SECURITY;
ALTER TABLE fuel_logs           ENABLE ROW LEVEL SECURITY;
ALTER TABLE itv_records         ENABLE ROW LEVEL SECURITY;
ALTER TABLE workshops           ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups              ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members       ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_messages      ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_invitations   ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_todos       ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminders           ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_all"        ON profiles;
DROP POLICY IF EXISTS "cars_all"            ON cars;
DROP POLICY IF EXISTS "km_logs_all"         ON km_logs;
DROP POLICY IF EXISTS "maintenance_all"     ON maintenance_records;
DROP POLICY IF EXISTS "car_parts_all"       ON car_parts;
DROP POLICY IF EXISTS "fuel_logs_all"       ON fuel_logs;
DROP POLICY IF EXISTS "itv_all"             ON itv_records;
DROP POLICY IF EXISTS "workshops_all"       ON workshops;
DROP POLICY IF EXISTS "groups_all"          ON groups;
DROP POLICY IF EXISTS "group_members_all"   ON group_members;
DROP POLICY IF EXISTS "group_messages_all"  ON group_messages;
DROP POLICY IF EXISTS "group_invitations_all" ON group_invitations;
DROP POLICY IF EXISTS "vehicle_todos_all"   ON vehicle_todos;
DROP POLICY IF EXISTS "reminders_all"       ON reminders;

CREATE POLICY "profiles_all"        ON profiles            FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "cars_all"            ON cars                FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "km_logs_all"         ON km_logs             FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "maintenance_all"     ON maintenance_records FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "car_parts_all"       ON car_parts           FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "fuel_logs_all"       ON fuel_logs           FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "itv_all"             ON itv_records         FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "workshops_all"       ON workshops           FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "groups_all"          ON groups              FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "group_members_all"   ON group_members       FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "group_messages_all"  ON group_messages      FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "group_invitations_all" ON group_invitations  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "vehicle_todos_all"   ON vehicle_todos       FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "reminders_all"       ON reminders           FOR ALL USING (true) WITH CHECK (true);


-- ═══════════════════════════════════════════════════════════
-- 14) GRANTS EXPLÍCITOS (preparado para cambio Supabase 2026-10-30)
-- ═══════════════════════════════════════════════════════════
-- Esto asegura que las tablas son accesibles desde la API
-- incluso después del cambio de Supabase del 30 oct 2026.
-- También configura los defaults para tablas FUTURAS.

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT EXECUTE ON FUNCTIONS TO anon, authenticated, service_role;


-- ═══════════════════════════════════════════════════════════
-- 15) DATOS INICIALES (solo si la tabla está vacía)
-- ═══════════════════════════════════════════════════════════

INSERT INTO profiles (name, username, pin, role)
SELECT 'Admin', 'admin', '1234', 'admin'
WHERE NOT EXISTS (SELECT 1 FROM profiles);


-- ═══════════════════════════════════════════════════════════
-- LISTO! Schema completo aplicado.
-- ═══════════════════════════════════════════════════════════
