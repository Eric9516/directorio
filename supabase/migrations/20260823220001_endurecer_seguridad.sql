-- Endurecimiento de seguridad a partir del reporte de "supabase db advisors":
-- ningún hallazgo era crítico (RLS está activo con políticas en todas las
-- tablas), pero estas tres cosas valían la pena.

-- 1) search_path fijo en funciones SECURITY DEFINER (evita que alguien con
--    permiso de crear objetos en la base pueda "pisar" una tabla/función
--    con el mismo nombre en otro esquema del search_path).
ALTER FUNCTION public.is_owner() SET search_path = public;
ALTER FUNCTION public.is_directorio_admin() SET search_path = public;
ALTER FUNCTION public.is_mantenimiento_admin() SET search_path = public;
ALTER FUNCTION public.can_view_all_retiros() SET search_path = public;
ALTER FUNCTION public.can_view_errores() SET search_path = public;
ALTER FUNCTION public.can_view_papelera() SET search_path = public;
ALTER FUNCTION public.update_updated_at() SET search_path = public;
ALTER FUNCTION public.set_updated_at() SET search_path = public;

-- 2) Ningún endpoint de la app se usa sin login — se le saca a "anon" el
-- permiso de ejecutar funciones que solo tienen sentido para un usuario ya
-- autenticado (por default Postgres se lo da a cualquier función nueva).
REVOKE EXECUTE ON FUNCTION public.is_owner() FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_directorio_admin() FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_mantenimiento_admin() FROM anon;
REVOKE EXECUTE ON FUNCTION public.can_view_all_retiros() FROM anon;
REVOKE EXECUTE ON FUNCTION public.can_view_errores() FROM anon;
REVOKE EXECUTE ON FUNCTION public.can_view_papelera() FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_active_access(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.create_task(text, text, text, date) FROM anon;
REVOKE EXECUTE ON FUNCTION public.cancel_task(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.complete_task(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.reprogram_task(uuid, date) FROM anon;
REVOKE EXECUTE ON FUNCTION public.process_pending_tasks_for_user(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_user_task_counts(uuid) FROM anon;

-- 3) get_user_task_counts(target_user_id) no verificaba que quien llama sea
-- el dueño de esas tareas (o admin) — cualquier usuario logueado podía pedir
-- los conteos de tareas de CUALQUIER otro usuario pasando su id. Hoy no la
-- usa el frontend, pero sigue siendo un endpoint real y expuesto.
CREATE OR REPLACE FUNCTION public.get_user_task_counts(target_user_id uuid)
 RETURNS TABLE(total bigint, pending bigint, completed bigint, cancelled bigint, stagnant bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    COUNT(*)::BIGINT AS total,
    COUNT(*) FILTER (WHERE status = 'pending')::BIGINT AS pending,
    COUNT(*) FILTER (WHERE status = 'completed')::BIGINT AS completed,
    COUNT(*) FILTER (WHERE status = 'cancelled')::BIGINT AS cancelled,
    COUNT(*) FILTER (WHERE is_stagnant = true AND status = 'pending')::BIGINT AS stagnant
  FROM public.tasks
  WHERE user_id = target_user_id
    AND (target_user_id = auth.uid() OR public.is_admin(auth.uid()));
$function$;
