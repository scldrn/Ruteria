-- Snapshot de stock en bodega central
CREATE TABLE inventario_central (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  producto_id UUID NOT NULL UNIQUE REFERENCES productos(id),
  cantidad_actual INT NOT NULL DEFAULT 0,
  costo_promedio DECIMAL(12,2),
  fecha_actualizacion TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Snapshot de stock en cada vitrina
CREATE TABLE inventario_vitrina (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vitrina_id UUID NOT NULL REFERENCES vitrinas(id),
  producto_id UUID NOT NULL REFERENCES productos(id),
  cantidad_actual INT NOT NULL DEFAULT 0,
  fecha_actualizacion TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (vitrina_id, producto_id)
);

-- Registro inmutable de todos los movimientos de inventario
CREATE TABLE movimientos_inventario (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo TEXT NOT NULL CHECK (tipo IN (
    'compra','traslado_a_vitrina','venta','devolucion_garantia',
    'baja','ajuste','traslado_entre_vitrinas'
  )),
  direccion TEXT NOT NULL CHECK (direccion IN ('entrada','salida')),
  origen_tipo TEXT CHECK (origen_tipo IN ('central','vitrina')),
  origen_id UUID,
  destino_tipo TEXT CHECK (destino_tipo IN ('central','vitrina')),
  destino_id UUID,
  producto_id UUID NOT NULL REFERENCES productos(id),
  cantidad INT NOT NULL CHECK (cantidad > 0),
  costo_unitario DECIMAL(12,2),
  referencia_tipo TEXT,
  referencia_id UUID,
  usuario_id UUID REFERENCES usuarios(id),
  notas TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
