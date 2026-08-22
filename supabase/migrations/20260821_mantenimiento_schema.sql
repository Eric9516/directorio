-- Módulo Mantenimiento: catálogo de repuestos, familias/subfamilias, equipos y retiros.
-- Ejecutar a mano en el SQL Editor de Supabase (este repo no aplica migraciones automáticamente).

-- ===== ROLES =====
-- Columna nueva e independiente del "rol" existente (admin/user).
-- null = sin acceso a Mantenimiento (usuario de directorio como hoy).
-- 'comun' = solo Mantenimiento (buscar, ver manuales/equipos, dar de baja).
-- 'admin' = Mantenimiento completo + acceso normal a Directorio y Tareas.
ALTER TABLE usuarios_perfil
  ADD COLUMN mantenimiento_rol text CHECK (mantenimiento_rol IN ('comun', 'admin'));

-- Mismo email que OWNER_EMAIL en admin.js: el superadmin siempre tiene permisos de
-- admin de mantenimiento, aunque no le hayan puesto el flag en su fila.
CREATE OR REPLACE FUNCTION is_mantenimiento_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM usuarios_perfil
    WHERE id = auth.uid()
      AND (mantenimiento_rol = 'admin' OR email = 'repuestos@sobreroycagnolo.com.ar')
  );
$$;

-- ===== FAMILIAS / SUBFAMILIAS =====
-- Código de 2 letras que aparece embebido en items.codigo (posiciones 2-3 y 4-5).
CREATE TABLE familias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text NOT NULL UNIQUE CHECK (char_length(codigo) = 2 AND codigo = upper(codigo)),
  nombre text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- La subfamilia pertenece a una única familia (el mismo código de 2 letras puede
-- significar otra cosa bajo otra familia).
CREATE TABLE subfamilias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  familia_id uuid NOT NULL REFERENCES familias(id) ON DELETE RESTRICT,
  codigo text NOT NULL CHECK (char_length(codigo) = 2 AND codigo = upper(codigo)),
  nombre text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (familia_id, codigo)
);

-- ===== ITEMS (repuestos) =====
CREATE TABLE items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text NOT NULL UNIQUE,       -- código completo: M + familia + subfamilia + numero
  numero text NOT NULL,              -- solo el correlativo (ej. "018"), no es único global
  descripcion text NOT NULL,
  familia_id uuid NOT NULL REFERENCES familias(id) ON DELETE RESTRICT,
  subfamilia_id uuid NOT NULL REFERENCES subfamilias(id) ON DELETE RESTRICT,
  ubicacion text,
  stock numeric,
  foto_url text,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Búsqueda por sufijo/substring (código y descripción) sin escanear toda la tabla.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX items_codigo_trgm_idx ON items USING gin (codigo gin_trgm_ops);
CREATE INDEX items_descripcion_trgm_idx ON items USING gin (descripcion gin_trgm_ops);
CREATE INDEX items_numero_idx ON items (numero);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER items_set_updated_at
  BEFORE UPDATE ON items
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ===== EQUIPOS (por sector) =====
CREATE TABLE equipos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sector text NOT NULL,              -- ej. 'Secado', 'Nanofiltrado', 'Positiva'
  nombre text NOT NULL,
  datos_tecnicos text,
  manual_url text,                   -- PDF de despiece
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER equipos_set_updated_at
  BEFORE UPDATE ON equipos
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Repuestos típicos asociados a un equipo (muchos a muchos).
CREATE TABLE equipo_items (
  equipo_id uuid NOT NULL REFERENCES equipos(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  PRIMARY KEY (equipo_id, item_id)
);

-- ===== RETIROS (dar de baja) =====
CREATE TABLE retiros (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid NOT NULL REFERENCES auth.users(id),
  observacion_general text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE retiro_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  retiro_id uuid NOT NULL REFERENCES retiros(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES items(id) ON DELETE RESTRICT,
  cantidad numeric NOT NULL DEFAULT 1,
  observacion text
);

-- ===== RLS =====
ALTER TABLE familias ENABLE ROW LEVEL SECURITY;
ALTER TABLE subfamilias ENABLE ROW LEVEL SECURITY;
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipos ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipo_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE retiros ENABLE ROW LEVEL SECURITY;
ALTER TABLE retiro_items ENABLE ROW LEVEL SECURITY;

-- Lectura: cualquier usuario logueado (común o admin) puede buscar/consultar.
CREATE POLICY familias_select ON familias FOR SELECT TO authenticated USING (true);
CREATE POLICY subfamilias_select ON subfamilias FOR SELECT TO authenticated USING (true);
CREATE POLICY items_select ON items FOR SELECT TO authenticated USING (true);
CREATE POLICY equipos_select ON equipos FOR SELECT TO authenticated USING (true);
CREATE POLICY equipo_items_select ON equipo_items FOR SELECT TO authenticated USING (true);

-- Gestión del catálogo: solo admin de mantenimiento (alta/edición/baja).
CREATE POLICY familias_write ON familias FOR ALL TO authenticated
  USING (is_mantenimiento_admin()) WITH CHECK (is_mantenimiento_admin());
CREATE POLICY subfamilias_write ON subfamilias FOR ALL TO authenticated
  USING (is_mantenimiento_admin()) WITH CHECK (is_mantenimiento_admin());
CREATE POLICY items_write ON items FOR ALL TO authenticated
  USING (is_mantenimiento_admin()) WITH CHECK (is_mantenimiento_admin());
CREATE POLICY equipos_write ON equipos FOR ALL TO authenticated
  USING (is_mantenimiento_admin()) WITH CHECK (is_mantenimiento_admin());
CREATE POLICY equipo_items_write ON equipo_items FOR ALL TO authenticated
  USING (is_mantenimiento_admin()) WITH CHECK (is_mantenimiento_admin());

-- Retiros: cualquier usuario logueado registra y ve los propios;
-- el admin de mantenimiento ve el historial completo.
CREATE POLICY retiros_insert ON retiros FOR INSERT TO authenticated
  WITH CHECK (usuario_id = auth.uid());
CREATE POLICY retiros_select ON retiros FOR SELECT TO authenticated
  USING (usuario_id = auth.uid() OR is_mantenimiento_admin());

CREATE POLICY retiro_items_insert ON retiro_items FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM retiros r WHERE r.id = retiro_id AND r.usuario_id = auth.uid()
  ));
CREATE POLICY retiro_items_select ON retiro_items FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM retiros r
    WHERE r.id = retiro_id AND (r.usuario_id = auth.uid() OR is_mantenimiento_admin())
  ));
