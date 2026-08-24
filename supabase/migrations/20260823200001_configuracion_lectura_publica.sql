-- La pantalla de login necesita mostrar el logo y nombre de la empresa ANTES
-- de que haya sesión — configuracion no tenía ninguna política que permitiera
-- leerla sin estar autenticado. Se agrega una política adicional de SOLO
-- LECTURA para anónimos (las políticas de Postgres se combinan con OR, así
-- que esto no reemplaza ni afloja los permisos de escritura existentes).
-- No expone nada sensible: son datos de marca (nombre, logo, dirección,
-- diseño de rótulo), no credenciales.
CREATE POLICY configuracion_select_anon ON configuracion FOR SELECT TO anon
  USING (true);
