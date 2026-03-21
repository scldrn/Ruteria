-- ============================================================
-- SEED: datos mínimos para que Sprint 1 tenga datos reales.
-- El inventario se inserta directamente en las tablas snapshot
-- (sin pasar por movimientos_inventario) — esto es intencional.
-- ============================================================
WITH
  zona AS (
    INSERT INTO zonas (nombre, ciudad, region)
    VALUES ('Zona Norte', 'Bogotá', 'Cundinamarca')
    RETURNING id
  ),
  pdv AS (
    INSERT INTO puntos_de_venta (codigo, nombre_comercial, zona_id, activo)
    SELECT 'PDV-001', 'Tienda Demo Norte', zona.id, true FROM zona
    RETURNING id
  ),
  vitrina AS (
    INSERT INTO vitrinas (codigo, pdv_id, estado, fecha_instalacion)
    SELECT 'VIT-001', pdv.id, 'activa', CURRENT_DATE FROM pdv
    RETURNING id
  ),
  cat AS (
    INSERT INTO categorias (nombre, activo)
    VALUES ('Audífonos', true)
    RETURNING id
  ),
  prod AS (
    INSERT INTO productos (codigo, nombre, categoria_id, costo_compra, precio_venta_comercio, estado)
    SELECT 'PRD-001', 'Audífono Básico BT', cat.id, 8000, 15000, 'activo' FROM cat
    RETURNING id
  ),
  prod2 AS (
    INSERT INTO productos (codigo, nombre, categoria_id, costo_compra, precio_venta_comercio, estado)
    SELECT 'PRD-002', 'Cable USB-C 1m', cat.id, 2000, 5000, 'activo' FROM cat
    RETURNING id
  )
INSERT INTO surtido_estandar (vitrina_id, producto_id, cantidad_objetivo)
SELECT vitrina.id, prod.id, 10 FROM vitrina, prod
UNION ALL
SELECT vitrina.id, prod2.id, 20 FROM vitrina, prod2;

-- Inventario inicial en snapshot (sin movimiento registrado — intencional para seed)
INSERT INTO inventario_central (producto_id, cantidad_actual)
SELECT id, 50 FROM productos WHERE codigo = 'PRD-001'
ON CONFLICT (producto_id) DO NOTHING;

INSERT INTO inventario_central (producto_id, cantidad_actual)
SELECT id, 100 FROM productos WHERE codigo = 'PRD-002'
ON CONFLICT (producto_id) DO NOTHING;

INSERT INTO inventario_vitrina (vitrina_id, producto_id, cantidad_actual)
SELECT v.id, p.id, 10
FROM vitrinas v, productos p
WHERE v.codigo = 'VIT-001' AND p.codigo = 'PRD-001'
ON CONFLICT (vitrina_id, producto_id) DO NOTHING;

INSERT INTO inventario_vitrina (vitrina_id, producto_id, cantidad_actual)
SELECT v.id, p.id, 20
FROM vitrinas v, productos p
WHERE v.codigo = 'VIT-001' AND p.codigo = 'PRD-002'
ON CONFLICT (vitrina_id, producto_id) DO NOTHING;

-- NOTA: El usuario admin se crea en Studio → Authentication → Add User
-- email: admin@erp.local | password: Admin1234!
-- Luego ejecutar en SQL Editor:
-- UPDATE public.usuarios SET rol = 'admin' WHERE email = 'admin@erp.local';
