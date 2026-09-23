-- ╔══════════════════════════════════════════════════════════════╗
-- ║  PIBES MECÁNICOS — Migración 15                              ║
-- ║  Permisos de la Data API                                     ║
-- ║                                                              ║
-- ║  Desde el 30 de octubre, Supabase deja de dar acceso a la    ║
-- ║  Data API a las tablas nuevas del esquema public. Las que ya  ║
-- ║  existen no cambian; las que se creen a partir de entonces    ║
-- ║  necesitan un GRANT explícito o la API contesta              ║
-- ║  "permission denied".                                        ║
-- ║                                                              ║
-- ║  https://github.com/orgs/supabase/discussions/45329          ║
-- ║                                                              ║
-- ║  Esta migración hace tres cosas:                              ║
-- ║   1. permisos en el esquema public                            ║
-- ║   2. permisos en las catorce tablas que ya existen            ║
-- ║   3. defaults para las tablas que se creen en el futuro       ║
-- ║                                                              ║
-- ║  No toca ni un dato. Se puede ejecutar dos veces.            ║
-- ╚══════════════════════════════════════════════════════════════╝

-- ─── 1. El esquema ──────────────────────────────────────────────
-- Sin USAGE en public, los grants de las tablas no sirven de nada.

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;


-- ─── 2. Las tablas de ahora ─────────────────────────────────────
-- profiles, cars, km_logs, maintenance_records, car_parts,
-- fuel_logs, itv_records, workshops, groups, group_members,
-- group_messages, group_invitations, vehicle_todos, reminders

GRANT SELECT, INSERT, UPDATE, DELETE
  ON ALL TABLES IN SCHEMA public
  TO anon, authenticated, service_role;

GRANT USAGE, SELECT
  ON ALL SEQUENCES IN SCHEMA public
  TO anon, authenticated, service_role;

GRANT EXECUTE
  ON ALL FUNCTIONS IN SCHEMA public
  TO anon, authenticated, service_role;


-- ─── 3. Las tablas de mañana ────────────────────────────────────
-- Esto es lo único que pide de verdad el correo de Supabase:
-- cualquier tabla que cree el rol postgres en public nacerá ya con
-- estos permisos, también después del 30 de octubre.
--
-- Ojo: los default privileges son POR ROL. Solo cubren lo que cree
-- "postgres", que es el rol del editor SQL y del panel. Una tabla
-- creada desde otro rol, o una preview branch, o un "supabase db
-- reset" en local, no heredan nada: por eso cada migración nueva
-- que cree una tabla lleva su propio GRANT dentro, como la 12 y
-- la 13.

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES
  TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES
  TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT EXECUTE ON FUNCTIONS
  TO anon, authenticated, service_role;


-- ─── Comprobar que ha ido bien (en otra consulta) ───────────────
--
-- (a) Los defaults de tablas futuras. Tienen que salir tres filas
--     con el rol postgres: r = tablas, S = secuencias, f = funciones.
--
--     SELECT pg_get_userbyid(d.defaclrole) AS rol,
--            d.defaclobjtype              AS tipo,
--            d.defaclacl                  AS permisos
--       FROM pg_default_acl d
--       JOIN pg_namespace  n ON n.oid = d.defaclnamespace
--      WHERE n.nspname = 'public';
--
-- (b) Tablas a las que anon no llega. Tiene que salir VACÍO.
--
--     SELECT tablename
--       FROM pg_tables
--      WHERE schemaname = 'public'
--        AND NOT has_table_privilege('anon',
--              format('public.%I', tablename), 'SELECT')
--      ORDER BY tablename;
--
-- (c) Las catorce tablas con sus permisos, de un vistazo.
--
--     SELECT table_name, grantee,
--            string_agg(privilege_type, ', ' ORDER BY privilege_type) AS permisos
--       FROM information_schema.role_table_grants
--      WHERE table_schema = 'public'
--        AND grantee IN ('anon', 'authenticated', 'service_role')
--      GROUP BY table_name, grantee
--      ORDER BY table_name, grantee;
--
-- Si (a) devuelve tres filas y (b) sale vacía, el 30 de octubre no
-- pasará nada.


-- ─── Aviso ──────────────────────────────────────────────────────
-- Esto da escritura completa al rol anónimo, que es lo que el
-- proyecto tiene hoy: las políticas RLS son USING (true). La
-- migración no empeora nada, pero cuando llegue la fase de
-- seguridad habrá que recortar "anon" a lo que de verdad necesite.
