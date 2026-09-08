-- ╔═════════════════════════════════════════════════════════╗
-- ║  PIBES MECÁNICOS · MIGRACIÓN 14                         ║
-- ║  Enlazar cada mantenimiento con el taller que lo hizo   ║
-- ╚═════════════════════════════════════════════════════════╝
--
-- POR QUÉ
-- ───────
-- La pantalla de talleres enseña, al elegir uno, cuánto se ha
-- gastado en él y qué intervenciones le ha hecho a cada vehículo.
-- Sin esta columna no hay manera de saberlo: los mantenimientos
-- guardaban el coste pero no quién lo cobró.
--
-- QUÉ HACE
-- ────────
-- Añade una columna "workshop_id" a maintenance_records, opcional,
-- que apunta a la tabla workshops.
--
-- Se queda VACÍA (NULL) en todo lo que ya existe, y así se queda
-- hasta que alguien edite ese mantenimiento y elija taller. NULL
-- significa "no consta", que es la verdad: no se puede adivinar
-- quién hizo una reparación de hace dos años.
--
-- Al borrar un taller NO se borra el historial: la columna se pone
-- a NULL (ON DELETE SET NULL). Perder el gasto de un vehículo
-- porque alguien limpió el directorio de talleres sería mucho peor
-- que quedarse sin saber dónde se hizo.
--
-- CÓMO SE APLICA
-- ──────────────
-- Copiar y pegar en el editor SQL de Supabase y ejecutar. Se puede
-- ejecutar más de una vez sin romper nada.

-- ─── 1. La columna ───

ALTER TABLE maintenance_records
  ADD COLUMN IF NOT EXISTS workshop_id UUID
  REFERENCES workshops(id) ON DELETE SET NULL;

-- ─── 2. Índice ───
-- La pantalla de talleres pregunta siempre "dame lo de ESTE
-- taller", así que se busca por esta columna y conviene tenerla
-- indexada. Se ignoran las filas vacías, que serán la mayoría
-- durante bastante tiempo.

CREATE INDEX IF NOT EXISTS idx_maintenance_workshop
  ON maintenance_records(workshop_id)
  WHERE workshop_id IS NOT NULL;

-- ─── 3. Comprobación ───
-- Debe devolver una fila: workshop_id | uuid | YES

SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'maintenance_records'
  AND column_name = 'workshop_id';
