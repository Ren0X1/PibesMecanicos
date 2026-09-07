-- ─── Migración v5 (safe — no falla si ya existe) ───

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

CREATE TABLE IF NOT EXISTS groups (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  created_by   UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS group_members (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id   UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(group_id, user_id)
);

CREATE TABLE IF NOT EXISTS group_messages (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id   UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  message    TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_itv_car ON itv_records(car_id);
CREATE INDEX IF NOT EXISTS idx_group_members_group ON group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user ON group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_group_messages_group ON group_messages(group_id);

ALTER TABLE itv_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "itv_all" ON itv_records;
DROP POLICY IF EXISTS "groups_all" ON groups;
DROP POLICY IF EXISTS "group_members_all" ON group_members;
DROP POLICY IF EXISTS "group_messages_all" ON group_messages;

CREATE POLICY "itv_all" ON itv_records FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "groups_all" ON groups FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "group_members_all" ON group_members FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "group_messages_all" ON group_messages FOR ALL USING (true) WITH CHECK (true);