-- Nuevo permiso independiente (igual patrón que puede_ver_retiros/errores/papelera):
-- quién puede resetearle la contraseña a otro usuario, sin que haga falta ser
-- el propietario. El propietario siempre puede, aunque tenga el flag en false.
ALTER TABLE usuarios_perfil
  ADD COLUMN puede_resetear_contrasenas boolean NOT NULL DEFAULT false;
