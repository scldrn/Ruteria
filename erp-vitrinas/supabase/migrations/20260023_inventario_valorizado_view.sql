CREATE OR REPLACE VIEW inventario_valorizado
WITH (security_invoker = true) AS
SELECT
  'central'::TEXT AS ubicacion_tipo,
  NULL::UUID AS ubicacion_id,
  'Bodega central'::TEXT AS ubicacion_nombre,
  ic.producto_id,
  p.codigo AS producto_codigo,
  p.nombre AS producto_nombre,
  ic.cantidad_actual,
  COALESCE(ic.costo_promedio, p.costo_compra, 0::NUMERIC) AS costo_unitario_ref,
  COALESCE(p.precio_venta_comercio, 0::NUMERIC) AS precio_venta_ref,
  ic.cantidad_actual * COALESCE(ic.costo_promedio, p.costo_compra, 0::NUMERIC) AS valor_costo_total,
  ic.cantidad_actual * COALESCE(p.precio_venta_comercio, 0::NUMERIC) AS valor_venta_total,
  ic.fecha_actualizacion AS updated_at
FROM inventario_central ic
JOIN productos p
  ON p.id = ic.producto_id

UNION ALL

SELECT
  'colaboradora'::TEXT AS ubicacion_tipo,
  icb.colaboradora_id AS ubicacion_id,
  u.nombre AS ubicacion_nombre,
  icb.producto_id,
  p.codigo AS producto_codigo,
  p.nombre AS producto_nombre,
  icb.cantidad_actual,
  COALESCE(p.costo_compra, 0::NUMERIC) AS costo_unitario_ref,
  COALESCE(p.precio_venta_comercio, 0::NUMERIC) AS precio_venta_ref,
  icb.cantidad_actual * COALESCE(p.costo_compra, 0::NUMERIC) AS valor_costo_total,
  icb.cantidad_actual * COALESCE(p.precio_venta_comercio, 0::NUMERIC) AS valor_venta_total,
  icb.updated_at
FROM inventario_colaboradora icb
JOIN productos p
  ON p.id = icb.producto_id
JOIN usuarios u
  ON u.id = icb.colaboradora_id

UNION ALL

SELECT
  'vitrina'::TEXT AS ubicacion_tipo,
  iv.vitrina_id AS ubicacion_id,
  CONCAT(v.codigo, ' · ', COALESCE(pdv.nombre_comercial, 'Sin PDV')) AS ubicacion_nombre,
  iv.producto_id,
  p.codigo AS producto_codigo,
  p.nombre AS producto_nombre,
  iv.cantidad_actual,
  COALESCE(p.costo_compra, 0::NUMERIC) AS costo_unitario_ref,
  COALESCE(p.precio_venta_comercio, 0::NUMERIC) AS precio_venta_ref,
  iv.cantidad_actual * COALESCE(p.costo_compra, 0::NUMERIC) AS valor_costo_total,
  iv.cantidad_actual * COALESCE(p.precio_venta_comercio, 0::NUMERIC) AS valor_venta_total,
  iv.fecha_actualizacion AS updated_at
FROM inventario_vitrina iv
JOIN productos p
  ON p.id = iv.producto_id
JOIN vitrinas v
  ON v.id = iv.vitrina_id
LEFT JOIN puntos_de_venta pdv
  ON pdv.id = v.pdv_id;

GRANT SELECT ON inventario_valorizado TO authenticated;
