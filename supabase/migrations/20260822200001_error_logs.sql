-- Log automático de errores del navegador: cuando algo revienta del lado del cliente
-- (ej: un botón que queda muerto), se guarda solo, sin que el usuario tenga que avisar.
-- Ver el log es un permiso propio, mismo patrón que puede_ver_retiros: por defecto
-- solo el superadmin, con la opción de habilitar a alguien más.

CREATE TABLE error_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  usuario_id uuid REFERENCES usuarios_perfil(id),
  usuario_email text,
  mensaje text NOT NULL,
  stack text,
  pantalla text,
  url text,
  user_agent text
);

ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;

ALTER TABLE usuarios_perfil
  ADD COLUMN puede_ver_errores boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION can_view_errores()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM usuarios_perfil
    WHERE id = auth.uid()
      AND (puede_ver_errores = true OR email = 'repuestos@sobreroycagnolo.com.ar')
  );
$$;

-- Cualquier usuario logueado puede reportar SUS PROPIOS errores.
CREATE POLICY error_logs_insert ON error_logs FOR INSERT TO authenticated
  WITH CHECK (usuario_id = auth.uid());

-- Pero solo quien tenga el permiso puede leerlos (o borrarlos, para limpiar el log).
CREATE POLICY error_logs_select ON error_logs FOR SELECT TO authenticated
  USING (can_view_errores());

CREATE POLICY error_logs_delete ON error_logs FOR DELETE TO authenticated
  USING (can_view_errores());
