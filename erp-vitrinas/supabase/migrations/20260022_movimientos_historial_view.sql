CREATE OR REPLACE VIEW movimientos_inventario_detalle
WITH (security_invoker = true) AS
SELECT
  mi.id,
  mi.created_at,
  mi.tipo,
  mi.direccion,
  mi.origen_tipo,
  mi.origen_id,
  mi.destino_tipo,
  mi.destino_id,
  mi.producto_id,
  mi.cantidad,
  mi.costo_unitario,
  mi.referencia_tipo,
  mi.referencia_id,
  mi.usuario_id,
  mi.notas,
  mi.motivo_baja,
  p.codigo AS producto_codigo,
  p.nombre AS producto_nombre,
  u.nombre AS usuario_nombre,
  CASE
    WHEN mi.origen_tipo = 'central' THEN 'Bodega central'
    WHEN mi.origen_tipo = 'colaboradora' THEN uc.nombre
    WHEN mi.origen_tipo = 'vitrina' THEN CONCAT(vor.codigo, ' · ', COALESCE(pdvor.nombre_comercial, 'Sin PDV'))
    ELSE NULL
  END AS origen_label,
  CASE
    WHEN mi.destino_tipo = 'central' THEN 'Bodega central'
    WHEN mi.destino_tipo = 'colaboradora' THEN ud.nombre
    WHEN mi.destino_tipo = 'vitrina' THEN CONCAT(vde.codigo, ' · ', COALESCE(pdvde.nombre_comercial, 'Sin PDV'))
    ELSE NULL
  END AS destino_label
FROM movimientos_inventario mi
JOIN productos p
  ON p.id = mi.producto_id
LEFT JOIN usuarios u
  ON u.id = mi.usuario_id
LEFT JOIN usuarios uc
  ON mi.origen_tipo = 'colaboradora'
  AND uc.id = mi.origen_id
LEFT JOIN vitrinas vor
  ON mi.origen_tipo = 'vitrina'
  AND vor.id = mi.origen_id
LEFT JOIN puntos_de_venta pdvor
  ON pdvor.id = vor.pdv_id
LEFT JOIN usuarios ud
  ON mi.destino_tipo = 'colaboradora'
  AND ud.id = mi.destino_id
LEFT JOIN vitrinas vde
  ON mi.destino_tipo = 'vitrina'
  AND vde.id = mi.destino_id
LEFT JOIN puntos_de_venta pdvde
  ON pdvde.id = vde.pdv_id;

GRANT SELECT ON movimientos_inventario_detalle TO authenticated;
