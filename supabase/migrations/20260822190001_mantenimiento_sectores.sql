-- Sectores de destino del retiro (ej. Producción, Envasado, Mantenimiento, Cámara de frío),
-- obligatorio al confirmar un retiro.

CREATE TABLE sectores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL UNIQUE,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE sectores ENABLE ROW LEVEL SECURITY;

CREATE POLICY sectores_select ON sectores FOR SELECT TO authenticated USING (true);
CREATE POLICY sectores_write ON sectores FOR ALL TO authenticated
  USING (is_mantenimiento_admin()) WITH CHECK (is_mantenimiento_admin());

-- Limpieza de los retiros de prueba: no tenían sector porque el campo no existía,
-- y no se puede exigir NOT NULL con datos previos que no lo cumplen.
DELETE FROM retiro_items WHERE retiro_id IN (SELECT id FROM retiros);
DELETE FROM retiros;

ALTER TABLE retiros ADD COLUMN sector_id uuid REFERENCES sectores(id) NOT NULL;
