-- ═══════════════════════════════════════════════════════════
-- 13) PREFERENCIAS DE USUARIO
--     Idioma, tema y color de acento, guardados por usuario.
--
--     Es idempotente: se puede ejecutar tantas veces como haga
--     falta sin romper nada ni pisar lo ya elegido.
-- ═══════════════════════════════════════════════════════════

-- ── Columnas ────────────────────────────────────────────────
-- Se dejan NULL a propósito. NULL significa «este usuario todavía
-- no ha elegido», que es justo lo que dispara el asistente de
-- bienvenida. Si se pusiera un DEFAULT, los usuarios que ya
-- existen aparecerían como si ya hubieran contestado.

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS lang         TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS theme        TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS accent       TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarded_at TIMESTAMPTZ;


-- ── Restricciones ───────────────────────────────────────────
-- Se aceptan valores nulos; lo que no se acepta es un valor
-- inventado. Se borran antes por si la migración ya se lanzó.

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_lang_check;
ALTER TABLE profiles ADD  CONSTRAINT profiles_lang_check
  CHECK (lang IS NULL OR lang IN ('es', 'en', 'zh', 'de', 'fr', 'ru'));

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_theme_check;
ALTER TABLE profiles ADD  CONSTRAINT profiles_theme_check
  CHECK (theme IS NULL OR theme IN ('dark', 'light'));

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_accent_check;
ALTER TABLE profiles ADD  CONSTRAINT profiles_accent_check
  CHECK (accent IS NULL OR accent IN (
    'mandarina', 'turquesa', 'manzana', 'oro',
    'coral', 'frambuesa', 'purpura', 'marfil'
  ));


-- ── Índice ──────────────────────────────────────────────────
-- Para poder listar rápido a quién le falta contestar.

CREATE INDEX IF NOT EXISTS idx_profiles_onboarded
  ON profiles (onboarded_at)
  WHERE onboarded_at IS NULL;


-- ── Permisos ────────────────────────────────────────────────
-- Las columnas nuevas heredan los permisos de la tabla, pero se
-- repiten por el cambio de Supabase del 30/10/2026.

GRANT SELECT, INSERT, UPDATE, DELETE ON profiles TO anon, authenticated, service_role;


-- ═══════════════════════════════════════════════════════════
-- COMPROBACIÓN
-- Debe devolver las cuatro columnas nuevas, todas nullable = YES.
-- ═══════════════════════════════════════════════════════════

-- SELECT column_name, data_type, is_nullable
--   FROM information_schema.columns
--  WHERE table_name = 'profiles'
--    AND column_name IN ('lang', 'theme', 'accent', 'onboarded_at')
--  ORDER BY column_name;

-- ¿A cuántos usuarios les falta contestar?
-- SELECT count(*) AS pendientes FROM profiles WHERE onboarded_at IS NULL;
