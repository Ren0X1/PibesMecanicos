-- ╔══════════════════════════════════════════════════════════════╗
-- ║  PIBES MECÁNICOS — Migración 18                              ║
-- ║  Mantener la base despierta                                  ║
-- ║                                                              ║
-- ║  Un proyecto de Supabase que no recibe una sola consulta se  ║
-- ║  pausa solo. Para que no pase, una tarea de GitHub Actions   ║
-- ║  entra cada pocas horas y hace un SELECT.                    ║
-- ║                                                              ║
-- ║  Esta migración solo añade las dos filas de ajustes: el      ║
-- ║  interruptor y la marca del último toque. No hay tabla       ║
-- ║  nueva: app_settings ya existe desde la 17, que para eso se  ║
-- ║  hizo con una fila por ajuste.                               ║
-- ║                                                              ║
-- ║  Se puede ejecutar dos veces sin romper nada.                ║
-- ╚══════════════════════════════════════════════════════════════╝

-- Por si se aplica esta migración en una base donde todavía no se
-- pasó la 17.
CREATE TABLE IF NOT EXISTS app_settings (
  key        TEXT PRIMARY KEY,
  value      JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID REFERENCES profiles(id) ON DELETE SET NULL
);

-- El interruptor. Nace encendido, que es para lo que se hace.
INSERT INTO app_settings (key, value)
VALUES ('keepalive', '{"on": true, "every_hours": 6}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- La marca del último toque, que escribe la tarea. Va en su propia
-- fila y no dentro de la anterior: así la tarea nunca tiene que
-- leer-modificar-escribir el interruptor, y no puede encenderlo o
-- apagarlo sin querer.
INSERT INTO app_settings (key, value)
VALUES ('keepalive_ping', '{"at": null, "source": ""}'::jsonb)
ON CONFLICT (key) DO NOTHING;

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "app_settings_all" ON app_settings;
CREATE POLICY "app_settings_all" ON app_settings FOR ALL USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON app_settings
  TO anon, authenticated, service_role;


-- ═══════════════════════════════════════════════════════════════
-- COMPROBAR QUE HA IDO BIEN
-- ═══════════════════════════════════════════════════════════════
--
--     SELECT key, value, updated_at FROM app_settings ORDER BY key;
--
-- Tienen que salir tres filas: 'keepalive', 'keepalive_ping' y
-- 'maintenance'.
--
-- Cuando la tarea de GitHub haya corrido una vez, 'keepalive_ping'
-- llevará la fecha del último toque:
--
--     SELECT value->>'at' AS ultimo_toque
--       FROM app_settings WHERE key = 'keepalive_ping';
