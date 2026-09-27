-- ╔══════════════════════════════════════════════════════════════╗
-- ║  PIBES MECÁNICOS — Migración 17                              ║
-- ║  Modo mantenimiento                                          ║
-- ║                                                              ║
-- ║  Un interruptor que apaga la web para todo el mundo menos    ║
-- ║  para los administradores. Mientras está puesto, quien entra ║
-- ║  ve un aviso y no puede tocar nada; el administrador entra   ║
-- ║  igual, ve una tira arriba y lo apaga desde su panel.        ║
-- ║                                                              ║
-- ║  Vive en una tabla de ajustes con una fila por ajuste, para  ║
-- ║  que el siguiente interruptor no necesite otra migración.    ║
-- ║                                                              ║
-- ║  Se puede ejecutar dos veces sin romper nada.                ║
-- ╚══════════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS app_settings (
  key        TEXT PRIMARY KEY,
  value      JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID REFERENCES profiles(id) ON DELETE SET NULL
);

-- La fila del interruptor. Nace apagada, y si ya existe no se toca:
-- lanzar la migración dos veces no puede encender ni apagar la web.
INSERT INTO app_settings (key, value)
VALUES ('maintenance', '{"on": false, "message": ""}'::jsonb)
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
--     SELECT key, value, updated_at FROM app_settings;
--
-- Tiene que salir una fila, 'maintenance', con {"on": false}.
--
-- Para encenderlo a mano, sin pasar por la web (por ejemplo si te
-- quedas fuera):
--
--     UPDATE app_settings
--        SET value = '{"on": true, "message": "Volvemos en una hora"}'::jsonb,
--            updated_at = now()
--      WHERE key = 'maintenance';
--
-- Y para apagarlo:
--
--     UPDATE app_settings
--        SET value = jsonb_set(value, '{on}', 'false'::jsonb),
--            updated_at = now()
--      WHERE key = 'maintenance';
--
-- OJO: con las políticas de hoy —USING (true) para el rol anónimo—
-- cualquiera con la clave pública puede apagar el modo
-- mantenimiento. Es el mismo agujero que tiene ya todo lo demás y
-- está anotado en CLAUDE.md; se cierra en la fase de seguridad, no
-- aquí.
