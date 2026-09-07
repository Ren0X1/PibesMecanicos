-- ╔══════════════════════════════════════════════════════════╗
-- ║  PIBES MECÁNICOS - Migración: Vehículos + Calentadores ║
-- ║  Ejecutar en: Supabase Dashboard > SQL Editor           ║
-- ╚══════════════════════════════════════════════════════════╝

-- Tipo de vehículo (coche/moto). Existentes se quedan como 'coche'.
ALTER TABLE cars ADD COLUMN IF NOT EXISTS vehicle_type TEXT DEFAULT 'coche';
