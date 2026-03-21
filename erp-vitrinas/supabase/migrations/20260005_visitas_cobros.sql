-- Registro central de cada visita de campo
CREATE TABLE visitas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ruta_id UUID REFERENCES rutas(id),
  pdv_id UUID NOT NULL REFERENCES puntos_de_venta(id),
  vitrina_id UUID NOT NULL REFERENCES vitrinas(id),
  colaboradora_id UUID NOT NULL REFERENCES usuarios(id),
  fecha_hora_inicio TIMESTAMPTZ,
  fecha_hora_fin TIMESTAMPTZ,
  estado TEXT NOT NULL DEFAULT 'planificada'
    CHECK (estado IN ('planificada','en_ejecucion','completada','no_realizada')),
  motivo_no_realizada TEXT,
  monto_calculado DECIMAL(12,2) NOT NULL DEFAULT 0,
  monto_cobrado DECIMAL(12,2),
  diferencia DECIMAL(12,2) GENERATED ALWAYS AS (
    COALESCE(monto_cobrado, 0) - COALESCE(monto_calculado, 0)
  ) STORED,
  notas TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES usuarios(id)
);

-- Línea por producto en cada visita
CREATE TABLE detalle_visita (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visita_id UUID NOT NULL REFERENCES visitas(id),
  producto_id UUID NOT NULL REFERENCES productos(id),
  inv_anterior INT NOT NULL,
  inv_actual INT NOT NULL,
  unidades_vendidas INT NOT NULL DEFAULT 0,
  unidades_repuestas INT NOT NULL DEFAULT 0,
  precio_unitario DECIMAL(12,2) NOT NULL,
  subtotal_cobro DECIMAL(12,2) GENERATED ALWAYS AS (
    unidades_vendidas * precio_unitario
  ) STORED,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES usuarios(id),
  UNIQUE (visita_id, producto_id)
);

-- Cobro registrado por visita
CREATE TABLE cobros (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visita_id UUID NOT NULL REFERENCES visitas(id),
  monto DECIMAL(12,2) NOT NULL,
  forma_pago TEXT NOT NULL
    CHECK (forma_pago IN ('efectivo','transferencia','nequi','daviplata','otro')),
  fecha TIMESTAMPTZ NOT NULL DEFAULT now(),
  estado TEXT NOT NULL DEFAULT 'registrado'
    CHECK (estado IN ('registrado','confirmado','pendiente','discrepancia')),
  notas TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES usuarios(id),
  UNIQUE (visita_id)
);

-- Fotos tomadas durante la visita
CREATE TABLE fotos_visita (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visita_id UUID NOT NULL REFERENCES visitas(id),
  url TEXT NOT NULL,
  tipo TEXT,
  fecha_subida TIMESTAMPTZ NOT NULL DEFAULT now()
);
