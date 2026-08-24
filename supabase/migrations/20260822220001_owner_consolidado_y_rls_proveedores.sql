-- Dos arreglos identificados al preparar la reescritura a React (ver plan de
-- migración), pensados para no afectar el uso normal de la app vieja mientras
-- sigue en producción:
--
-- 1) El email del superadmin estaba repetido como texto literal en 4 funciones
--    SQL distintas. Se centraliza en una sola función is_owner(), y las otras
--    4 pasan a llamarla en vez de repetir el string.
--
-- 2) proveedores_insert/proveedores_update eran USING(true)/WITH CHECK(true) —
--    cualquier usuario logueado (no solo administradores de Directorio) podía
--    insertar o editar cualquier proveedor llamando a la API directo; solo el
--    botón estaba escondido en la pantalla. Se restringe a administradores de
--    Directorio, que es lo único que la propia pantalla ya permitía hacer.
--    proveedores_delete pasa de estar atado al permiso de Papelera a estar
--    atado a ser administrador de Directorio (decisión tomada explícitamente
--    con el dueño): cualquier admin de Directorio puede mandar un proveedor a
--    la Papelera; el permiso de Papelera sigue controlando quién la ve/restaura/purga.

CREATE OR REPLACE FUNCTION is_owner()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM usuarios_perfil
    WHERE id = auth.uid() AND email = 'repuestos@sobreroycagnolo.com.ar'
  );
$$;

CREATE OR REPLACE FUNCTION is_mantenimiento_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM usuarios_perfil
    WHERE id = auth.uid() AND mantenimiento_rol = 'admin'
  ) OR is_owner();
$$;

CREATE OR REPLACE FUNCTION can_view_all_retiros()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM usuarios_perfil
    WHERE id = auth.uid() AND puede_ver_retiros = true
  ) OR is_owner();
$$;

CREATE OR REPLACE FUNCTION can_view_errores()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM usuarios_perfil
    WHERE id = auth.uid() AND puede_ver_errores = true
  ) OR is_owner();
$$;

CREATE OR REPLACE FUNCTION can_view_papelera()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM usuarios_perfil
    WHERE id = auth.uid() AND puede_ver_papelera = true
  ) OR is_owner();
$$;

-- Administrador de Directorio (rol='admin'), o el owner.
CREATE OR REPLACE FUNCTION is_directorio_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM usuarios_perfil
    WHERE id = auth.uid() AND rol = 'admin'
  ) OR is_owner();
$$;

DROP POLICY IF EXISTS proveedores_insert ON proveedores;
CREATE POLICY proveedores_insert ON proveedores FOR INSERT TO authenticated
  WITH CHECK (is_directorio_admin());

DROP POLICY IF EXISTS proveedores_update ON proveedores;
CREATE POLICY proveedores_update ON proveedores FOR UPDATE TO authenticated
  USING (is_directorio_admin()) WITH CHECK (is_directorio_admin());

DROP POLICY IF EXISTS proveedores_delete ON proveedores;
CREATE POLICY proveedores_delete ON proveedores FOR DELETE TO authenticated
  USING (is_directorio_admin());
