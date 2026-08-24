-- La migración anterior le sacó el permiso a "anon" puntualmente, pero
-- Postgres le da EXECUTE a PUBLIC (todos los roles) por default al crear una
-- función — "anon" seguía heredando el permiso desde ahí. Hay que revocárselo
-- a PUBLIC y volver a dárselo explícitamente solo a "authenticated".
REVOKE EXECUTE ON FUNCTION public.is_owner() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_directorio_admin() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_mantenimiento_admin() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.can_view_all_retiros() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.can_view_errores() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.can_view_papelera() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_active_access(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.create_task(text, text, text, date) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cancel_task(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.complete_task(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.reprogram_task(uuid, date) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.process_pending_tasks_for_user(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_user_task_counts(uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.is_owner() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_directorio_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_mantenimiento_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_view_all_retiros() TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_view_errores() TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_view_papelera() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_active_access(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_task(text, text, text, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_task(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_task(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reprogram_task(uuid, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_pending_tasks_for_user(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_task_counts(uuid) TO authenticated;
