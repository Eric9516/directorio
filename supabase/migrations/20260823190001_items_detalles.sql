-- Campo libre para información relevante de un repuesto (ej: compatibilidad,
-- notas de uso, dónde conseguir un repuesto alternativo) que NO debe mostrarse
-- donde se muestra la descripción (listado/tarjetas de Buscar) — solo en el
-- detalle del repuesto.
ALTER TABLE items
  ADD COLUMN detalles text;
