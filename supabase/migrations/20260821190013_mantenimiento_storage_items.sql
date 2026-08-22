-- Bucket de fotos de repuestos. Ejecutar después de las cargas anteriores.
insert into storage.buckets (id, name, public)
values ('items', 'items', true)
on conflict (id) do nothing;

-- Lectura pública (para poder mostrar la foto sin re-loguear en cada request).
create policy items_photos_select on storage.objects for select
  using (bucket_id = 'items');

-- Solo admin de mantenimiento sube/reemplaza/borra fotos.
create policy items_photos_write on storage.objects for all
  to authenticated
  using (bucket_id = 'items' and is_mantenimiento_admin())
  with check (bucket_id = 'items' and is_mantenimiento_admin());
