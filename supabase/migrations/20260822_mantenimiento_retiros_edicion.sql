-- Permite editar/eliminar retiros ya confirmados (propio + mismo día, o admin sin límite)
-- y agrega el flag para exportación a Excel.

ALTER TABLE retiros ADD COLUMN exportado boolean NOT NULL DEFAULT false;

-- Actualizar (incluye marcar exportado=true desde el admin) y eliminar retiros.
CREATE POLICY retiros_update ON retiros FOR UPDATE TO authenticated
  USING (
    is_mantenimiento_admin()
    OR (usuario_id = auth.uid() AND created_at::date = (now() AT TIME ZONE 'utc')::date)
  )
  WITH CHECK (
    is_mantenimiento_admin()
    OR (usuario_id = auth.uid() AND created_at::date = (now() AT TIME ZONE 'utc')::date)
  );

CREATE POLICY retiros_delete ON retiros FOR DELETE TO authenticated
  USING (
    is_mantenimiento_admin()
    OR (usuario_id = auth.uid() AND created_at::date = (now() AT TIME ZONE 'utc')::date)
  );

-- Mismo criterio para las líneas, mirando el retiro dueño.
CREATE POLICY retiro_items_update ON retiro_items FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM retiros r WHERE r.id = retiro_id AND (
      is_mantenimiento_admin()
      OR (r.usuario_id = auth.uid() AND r.created_at::date = (now() AT TIME ZONE 'utc')::date)
    )
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM retiros r WHERE r.id = retiro_id AND (
      is_mantenimiento_admin()
      OR (r.usuario_id = auth.uid() AND r.created_at::date = (now() AT TIME ZONE 'utc')::date)
    )
  ));

CREATE POLICY retiro_items_delete ON retiro_items FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM retiros r WHERE r.id = retiro_id AND (
      is_mantenimiento_admin()
      OR (r.usuario_id = auth.uid() AND r.created_at::date = (now() AT TIME ZONE 'utc')::date)
    )
  ));
