-- Papelera: en vez de borrar Proveedores/Repuestos para siempre al toque, la baja
-- queda "blanda" (desaparece de las listas normales) hasta que alguien con el
-- permiso de Papelera la revisa y decide restaurar o eliminar definitivamente.

ALTER TABLE proveedores
  ADD COLUMN eliminado boolean NOT NULL DEFAULT false,
  ADD COLUMN eliminado_por uuid REFERENCES usuarios_perfil(id),
  ADD COLUMN eliminado_at timestamptz;

-- items ya tenía baja blanda propia (activo=false) desde antes — le sumamos
-- quién y cuándo, para poder mostrarlo en la Papelera.
ALTER TABLE items
  ADD COLUMN eliminado_por uuid REFERENCES usuarios_perfil(id),
  ADD COLUMN eliminado_at timestamptz;

ALTER TABLE usuarios_perfil
  ADD COLUMN puede_ver_papelera boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION can_view_papelera()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM usuarios_perfil
    WHERE id = auth.uid()
      AND (puede_ver_papelera = true OR email = 'repuestos@sobreroycagnolo.com.ar')
  );
$$;

-- Proveedores tenía una única política "auth_all_proveedores" que permitía TODO
-- (insert/update/delete) a cualquier usuario logueado. La partimos para poder
-- restringir específicamente el borrado definitivo a quien tenga acceso a la
-- Papelera — el alta/edición (y la baja blanda, que es un UPDATE) siguen igual
-- de abiertas que antes, sin cambiar el comportamiento existente.
DROP POLICY IF EXISTS auth_all_proveedores ON proveedores;

CREATE POLICY proveedores_select ON proveedores FOR SELECT TO authenticated
  USING (true);

CREATE POLICY proveedores_insert ON proveedores FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY proveedores_update ON proveedores FOR UPDATE TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY proveedores_delete ON proveedores FOR DELETE TO authenticated
  USING (can_view_papelera());

-- Items tenía una política "items_write" (ALL) para cualquier admin de
-- mantenimiento. Misma idea: separamos el borrado definitivo para que solo lo
-- pueda hacer quien tenga acceso a la Papelera; alta/edición (incluida la baja
-- blanda vía activo=false) siguen igual, abiertas a cualquier admin de mantenimiento.
DROP POLICY IF EXISTS items_write ON items;

CREATE POLICY items_insert ON items FOR INSERT TO authenticated
  WITH CHECK (is_mantenimiento_admin());

CREATE POLICY items_update ON items FOR UPDATE TO authenticated
  USING (is_mantenimiento_admin()) WITH CHECK (is_mantenimiento_admin());

CREATE POLICY items_delete ON items FOR DELETE TO authenticated
  USING (can_view_papelera());
