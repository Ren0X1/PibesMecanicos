-- ╔══════════════════════════════════════════════════════════╗
-- ║  PIBES MECÁNICOS - Migración: PIN change + Security    ║
-- ║  Ejecutar en: Supabase Dashboard > SQL Editor           ║
-- ╚══════════════════════════════════════════════════════════╝

-- Columna para forzar cambio de PIN en primer login
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pin_change_required BOOLEAN DEFAULT false;

-- Los usuarios existentes no necesitan cambiar (ya tienen su PIN)
-- Los nuevos se crean con pin_change_required = true desde la app
