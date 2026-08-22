-- Ver el historial completo de retiros (de todos los usuarios) y exportarlo pasa a ser
-- un permiso propio, exclusivo del superadmin salvo que habilite a alguien puntual —
-- antes lo tenía cualquier admin de mantenimiento, que era demasiado abierto.

ALTER TABLE usuarios_perfil
  ADD COLUMN puede_ver_retiros boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION can_view_all_retiros()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM usuarios_perfil
    WHERE id = auth.uid()
      AND (puede_ver_retiros = true OR email = 'repuestos@sobreroycagnolo.com.ar')
  );
$$;

-- Reemplaza las políticas que usaban is_mantenimiento_admin() para "ver/editar todo"
-- por esta más angosta. La regla de "propio + mismo día" para usuarios comunes no cambia.

DROP POLICY IF EXISTS retiros_select ON retiros;
CREATE POLICY retiros_select ON retiros FOR SELECT TO authenticated
  USING (usuario_id = auth.uid() OR can_view_all_retiros());

DROP POLICY IF EXISTS retiro_items_select ON retiro_items;
CREATE POLICY retiro_items_select ON retiro_items FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM retiros r WHERE r.id = retiro_id AND (r.usuario_id = auth.uid() OR can_view_all_retiros())
  ));

DROP POLICY IF EXISTS retiros_update ON retiros;
CREATE POLICY retiros_update ON retiros FOR UPDATE TO authenticated
  USING (
    can_view_all_retiros()
    OR (usuario_id = auth.uid() AND created_at::date = (now() AT TIME ZONE 'utc')::date)
  )
  WITH CHECK (
    can_view_all_retiros()
    OR (usuario_id = auth.uid() AND created_at::date = (now() AT TIME ZONE 'utc')::date)
  );

DROP POLICY IF EXISTS retiros_delete ON retiros;
CREATE POLICY retiros_delete ON retiros FOR DELETE TO authenticated
  USING (
    can_view_all_retiros()
    OR (usuario_id = auth.uid() AND created_at::date = (now() AT TIME ZONE 'utc')::date)
  );

DROP POLICY IF EXISTS retiro_items_update ON retiro_items;
CREATE POLICY retiro_items_update ON retiro_items FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM retiros r WHERE r.id = retiro_id AND (
      can_view_all_retiros()
      OR (r.usuario_id = auth.uid() AND r.created_at::date = (now() AT TIME ZONE 'utc')::date)
    )
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM retiros r WHERE r.id = retiro_id AND (
      can_view_all_retiros()
      OR (r.usuario_id = auth.uid() AND r.created_at::date = (now() AT TIME ZONE 'utc')::date)
    )
  ));

DROP POLICY IF EXISTS retiro_items_delete ON retiro_items;
CREATE POLICY retiro_items_delete ON retiro_items FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM retiros r WHERE r.id = retiro_id AND (
      can_view_all_retiros()
      OR (r.usuario_id = auth.uid() AND r.created_at::date = (now() AT TIME ZONE 'utc')::date)
    )
  ));
