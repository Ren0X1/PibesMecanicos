-- ╔══════════════════════════════════════════════════════════════╗
-- ║  PIBES MECÁNICOS — Migración 19                              ║
-- ║  Índices en las claves ajenas que no los tenían              ║
-- ║                                                              ║
-- ║  Una clave ajena sin índice obliga a Postgres a recorrer la  ║
-- ║  tabla entera cada vez que se borra la fila a la que apunta. ║
-- ║  Con siete vehículos no se nota; cuesta cuatro líneas y se   ║
-- ║  queda hecho.                                                ║
-- ║                                                              ║
-- ║  Las señaló el analizador de rendimiento de Supabase.        ║
-- ║  Se puede ejecutar dos veces sin romper nada.                ║
-- ╚══════════════════════════════════════════════════════════════╝

-- Las tablas que se añadieron en la 16 y la 17.
CREATE INDEX IF NOT EXISTS idx_custom_jobs_part     ON custom_jobs (part_id);
CREATE INDEX IF NOT EXISTS idx_custom_jobs_workshop ON custom_jobs (workshop_id);
CREATE INDEX IF NOT EXISTS idx_app_settings_by      ON app_settings (updated_by);

-- Y las que venían de antes, que estaban en la misma lista.
CREATE INDEX IF NOT EXISTS idx_group_invitations_by ON group_invitations (invited_by);
CREATE INDEX IF NOT EXISTS idx_group_messages_user  ON group_messages (user_id);
CREATE INDEX IF NOT EXISTS idx_groups_created_by    ON groups (created_by);
CREATE INDEX IF NOT EXISTS idx_reminders_car        ON reminders (car_id);
CREATE INDEX IF NOT EXISTS idx_workshops_created_by ON workshops (created_by);


-- ═══════════════════════════════════════════════════════════════
-- COMPROBAR QUE HA IDO BIEN
-- ═══════════════════════════════════════════════════════════════
--
--     SELECT tablename, indexname FROM pg_indexes
--      WHERE schemaname = 'public' AND indexname LIKE 'idx_%'
--      ORDER BY tablename, indexname;
--
-- Nota: el analizador también avisa de «índices sin usar». Con las
-- filas que hay ahora eso no significa nada —Postgres prefiere
-- recorrer una tabla de siete filas antes que abrir un índice—, así
-- que no se borra ninguno.
