-- ╔══════════════════════════════════════════════════════════╗
-- ║  PIBES MECÁNICOS - Migración: Repostajes v2            ║
-- ║  Añade columna driving_mode a fuel_logs                 ║
-- ║  Ejecutar en: Supabase Dashboard > SQL Editor           ║
-- ╚══════════════════════════════════════════════════════════╝

ALTER TABLE fuel_logs ADD COLUMN IF NOT EXISTS driving_mode TEXT DEFAULT 'ciudad';
