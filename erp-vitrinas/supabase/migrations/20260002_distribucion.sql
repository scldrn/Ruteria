-- Zonas geográficas
CREATE TABLE zonas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  ciudad TEXT,
  region TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID
);

-- Puntos de venta (comercios)
CREATE TABLE puntos_de_venta (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT UNIQUE NOT NULL,
  nombre_comercial TEXT NOT NULL,
  tipo TEXT,
  direccion TEXT,
  zona_id UUID REFERENCES zonas(id),
  lat DECIMAL(10,7),
  lng DECIMAL(10,7),
  contacto_nombre TEXT,
  contacto_tel TEXT,
  condiciones_pago TEXT,
  forma_pago_preferida TEXT CHECK (forma_pago_preferida IN ('efectivo','transferencia','nequi','daviplata','otro')),
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID
);

-- Vitrinas (activo físico en cada PDV)
CREATE TABLE vitrinas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT UNIQUE NOT NULL,
  pdv_id UUID NOT NULL REFERENCES puntos_de_venta(id),
  tipo TEXT,
  estado TEXT NOT NULL DEFAULT 'activa' CHECK (estado IN ('activa','inactiva','retirada')),
  fecha_instalacion DATE,
  fecha_retiro DATE,
  notas TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID
);

-- Surtido estándar por vitrina
CREATE TABLE surtido_estandar (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vitrina_id UUID NOT NULL REFERENCES vitrinas(id),
  producto_id UUID NOT NULL REFERENCES productos(id),
  cantidad_objetivo INT NOT NULL CHECK (cantidad_objetivo > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  UNIQUE (vitrina_id, producto_id)
);
