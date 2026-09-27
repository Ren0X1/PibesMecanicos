-- ╔══════════════════════════════════════════════════════════════╗
-- ║  PIBES MECÁNICOS — Migración 16                              ║
-- ║  Las piezas que van por eje, y los lados de cada eje         ║
-- ║                                                              ║
-- ║  Neumáticos, discos y amortiguadores dejan de ser una pieza  ║
-- ║  y pasan a ser dos ejes. En un coche, cada eje tiene lado    ║
-- ║  izquierdo y derecho; en una moto no, que solo hay una rueda ║
-- ║  delante y otra detrás.                                      ║
-- ║                                                              ║
-- ║  Qué hace:                                                   ║
-- ║   1. cuatro columnas de lado y el enlace a un recambio       ║
-- ║   2. reparte lo que ya había por ejes, SIN perder nada       ║
-- ║   3. rellena los lados de las pastillas, que ya iban por eje ║
-- ║   4. tabla nueva de trabajos libres                          ║
-- ║   5. permisos (desde la 15, cada tabla nueva los lleva)      ║
-- ║                                                              ║
-- ║  Se puede ejecutar dos veces sin romper nada.                ║
-- ╚══════════════════════════════════════════════════════════════╝


-- ═══════════════════════════════════════════════════════════════
-- 1) COLUMNAS NUEVAS
-- ═══════════════════════════════════════════════════════════════
-- last_km / last_date siguen existiendo y siguen siendo lo que
-- mandan: son los del lado que peor está. Así el aviso, la tabla,
-- el PDF y el gasto por taller siguen funcionando igual.

ALTER TABLE maintenance_records
  ADD COLUMN IF NOT EXISTS last_km_izq   INTEGER,
  ADD COLUMN IF NOT EXISTS last_date_izq DATE,
  ADD COLUMN IF NOT EXISTS last_km_der   INTEGER,
  ADD COLUMN IF NOT EXISTS last_date_der DATE,
  ADD COLUMN IF NOT EXISTS part_id       UUID;

-- El recambio enlazado. Si se borra el recambio, el enlace se queda
-- a vacío y el mantenimiento sigue en su sitio: nunca al revés.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'maintenance_records_part_id_fkey'
  ) THEN
    ALTER TABLE maintenance_records
      ADD CONSTRAINT maintenance_records_part_id_fkey
      FOREIGN KEY (part_id) REFERENCES car_parts(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_maintenance_part ON maintenance_records (part_id);


-- ═══════════════════════════════════════════════════════════════
-- 2) REPARTIR LO QUE YA HABÍA
-- ═══════════════════════════════════════════════════════════════
-- Cada registro de 'neumaticos', 'discos_freno' o 'amortiguadores'
-- se convierte en dos: el eje delantero y el trasero, con las
-- mismas fechas y kilómetros.
--
-- El coste va SOLO en el delantero. Es a propósito: si se copiara
-- en los dos, el gasto del coche y lo gastado en el taller
-- subirían el doble de la noche a la mañana.
--
-- En coche se rellenan los dos lados con el mismo dato, que es lo
-- que de verdad pasó: nadie cambia una sola rueda delantera. En
-- moto los lados se quedan vacíos, porque no existen.

INSERT INTO maintenance_records (
  car_id, type_id, last_km, last_date, next_km, next_date,
  cost, notes, workshop_id, part_id,
  last_km_izq, last_date_izq, last_km_der, last_date_der,
  created_at, updated_at
)
SELECT
  m.car_id,
  CASE m.type_id
    WHEN 'neumaticos'     THEN 'neumaticos_'
    WHEN 'discos_freno'   THEN 'discos_'
    WHEN 'amortiguadores' THEN 'amortiguadores_'
  END || eje.sufijo,
  m.last_km, m.last_date, m.next_km, m.next_date,
  CASE WHEN eje.delantero THEN m.cost ELSE 0 END,
  NULLIF(TRIM(BOTH ' · ' FROM COALESCE(m.notes, '') || ' · repartido por eje en la migración 16'), ''),
  m.workshop_id, NULL,
  CASE WHEN c.vehicle_type = 'moto' THEN NULL ELSE m.last_km   END,
  CASE WHEN c.vehicle_type = 'moto' THEN NULL ELSE m.last_date END,
  CASE WHEN c.vehicle_type = 'moto' THEN NULL ELSE m.last_km   END,
  CASE WHEN c.vehicle_type = 'moto' THEN NULL ELSE m.last_date END,
  m.created_at, now()
FROM maintenance_records m
JOIN cars c ON c.id = m.car_id
CROSS JOIN (VALUES ('del', true), ('tras', false)) AS eje(sufijo, delantero)
WHERE m.type_id IN ('neumaticos', 'discos_freno', 'amortiguadores')
ON CONFLICT (car_id, type_id) DO NOTHING;

-- Y se van los viejos, que ya no tienen a quién representar.
DELETE FROM maintenance_records
 WHERE type_id IN ('neumaticos', 'discos_freno', 'amortiguadores');


-- ═══════════════════════════════════════════════════════════════
-- 3) LOS LADOS DE LAS PASTILLAS
-- ═══════════════════════════════════════════════════════════════
-- Las pastillas ya iban por eje, así que sus datos no se tocan:
-- solo se rellenan los dos lados con lo que ya había. Unas
-- pastillas delanteras se cambian de dos en dos, así que decir
-- «los dos lados» es decir la verdad.
-- Lo mismo vale para los silentblocks, si alguien los había
-- apuntado ya con otro nombre.

UPDATE maintenance_records m
   SET last_km_izq   = m.last_km,
       last_date_izq = m.last_date,
       last_km_der   = m.last_km,
       last_date_der = m.last_date,
       updated_at    = now()
  FROM cars c
 WHERE c.id = m.car_id
   AND c.vehicle_type <> 'moto'
   AND m.type_id IN ('pastillas_del', 'pastillas_tras',
                     'silentblocks_del', 'silentblocks_tras')
   AND m.last_km_izq IS NULL
   AND m.last_km_der IS NULL;


-- ═══════════════════════════════════════════════════════════════
-- 4) TRABAJOS LIBRES
-- ═══════════════════════════════════════════════════════════════
-- Para lo que no está en la lista: una rótula, una soldadura, un
-- pulido. Texto libre, varias entradas por vehículo, y sin avisos:
-- es un cuaderno, no un recordatorio.

CREATE TABLE IF NOT EXISTS custom_jobs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  car_id      UUID NOT NULL REFERENCES cars(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  date        DATE NOT NULL DEFAULT CURRENT_DATE,
  km          INTEGER NOT NULL DEFAULT 0,
  cost        NUMERIC(10,2) DEFAULT 0,
  workshop_id UUID REFERENCES workshops(id) ON DELETE SET NULL,
  part_id     UUID REFERENCES car_parts(id) ON DELETE SET NULL,
  notes       TEXT DEFAULT '',
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_custom_jobs_car  ON custom_jobs (car_id);
CREATE INDEX IF NOT EXISTS idx_custom_jobs_date ON custom_jobs (date DESC);

ALTER TABLE custom_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "custom_jobs_all" ON custom_jobs;
CREATE POLICY "custom_jobs_all" ON custom_jobs FOR ALL USING (true) WITH CHECK (true);


-- ═══════════════════════════════════════════════════════════════
-- 5) PERMISOS
-- ═══════════════════════════════════════════════════════════════
-- Desde la migración 15, cada tabla nueva lleva sus grants en el
-- mismo fichero que la crea: los default privileges no cubren una
-- preview branch ni un "supabase db reset" en local.

GRANT SELECT, INSERT, UPDATE, DELETE ON custom_jobs
  TO anon, authenticated, service_role;


-- ═══════════════════════════════════════════════════════════════
-- COMPROBAR QUE HA IDO BIEN
-- ═══════════════════════════════════════════════════════════════
--
-- (a) No tiene que quedar ni un registro con los tipos viejos:
--
--     SELECT type_id, count(*)
--       FROM maintenance_records
--      WHERE type_id IN ('neumaticos', 'discos_freno', 'amortiguadores')
--      GROUP BY type_id;
--
-- (b) Los ejes nuevos, con sus lados (en coche) o sin ellos (moto):
--
--     SELECT c.plate, c.vehicle_type, m.type_id,
--            m.last_km, m.last_km_izq, m.last_km_der, m.cost
--       FROM maintenance_records m
--       JOIN cars c ON c.id = m.car_id
--      WHERE m.type_id LIKE 'neumaticos%'
--         OR m.type_id LIKE 'discos%'
--         OR m.type_id LIKE 'amortiguadores%'
--      ORDER BY c.plate, m.type_id;
--
-- (c) El dinero no se ha movido. Este total tiene que ser el mismo
--     antes y después de la migración:
--
--     SELECT sum(cost) FROM maintenance_records;
--
-- (d) La tabla nueva responde:
--
--     SELECT count(*) FROM custom_jobs;
