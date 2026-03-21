-- Incidencias operativas
CREATE TABLE incidencias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visita_id UUID REFERENCES visitas(id),
  pdv_id UUID NOT NULL REFERENCES puntos_de_venta(id),
  vitrina_id UUID REFERENCES vitrinas(id),
  tipo TEXT NOT NULL CHECK (tipo IN (
    'producto_defectuoso','robo','dano_vitrina','problema_espacio','cobro','otro'
  )),
  descripcion TEXT,
  estado TEXT NOT NULL DEFAULT 'abierta'
    CHECK (estado IN ('abierta','en_analisis','resuelta','cerrada')),
  responsable_id UUID REFERENCES usuarios(id),
  resolucion TEXT,
  fecha_apertura TIMESTAMPTZ NOT NULL DEFAULT now(),
  fecha_cierre TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES usuarios(id)
);

-- Garantías y devoluciones
CREATE TABLE garantias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pdv_id UUID NOT NULL REFERENCES puntos_de_venta(id),
  producto_id UUID NOT NULL REFERENCES productos(id),
  visita_recepcion_id UUID REFERENCES visitas(id),
  cantidad INT NOT NULL DEFAULT 1 CHECK (cantidad > 0),
  fecha_venta_aprox DATE,
  motivo TEXT,
  resolucion TEXT,
  estado TEXT NOT NULL DEFAULT 'abierta'
    CHECK (estado IN ('abierta','en_proceso','resuelta','cerrada')),
  responsable_id UUID REFERENCES usuarios(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES usuarios(id)
);

-- Órdenes de compra a proveedores
CREATE TABLE compras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proveedor_id UUID NOT NULL REFERENCES proveedores(id),
  fecha DATE NOT NULL,
  estado TEXT NOT NULL DEFAULT 'pendiente'
    CHECK (estado IN ('pendiente','confirmada','recibida','cancelada')),
  total_estimado DECIMAL(12,2),
  total_real DECIMAL(12,2),
  notas TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES usuarios(id)
);

-- Líneas de la orden de compra
CREATE TABLE detalle_compra (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  compra_id UUID NOT NULL REFERENCES compras(id),
  producto_id UUID NOT NULL REFERENCES productos(id),
  cantidad_pedida INT NOT NULL CHECK (cantidad_pedida > 0),
  cantidad_recibida INT NOT NULL DEFAULT 0 CHECK (cantidad_recibida >= 0),
  costo_unitario DECIMAL(12,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES usuarios(id),
  CHECK (cantidad_recibida <= cantidad_pedida)
);
